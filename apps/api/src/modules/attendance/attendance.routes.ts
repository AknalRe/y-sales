import type { FastifyInstance, FastifyReply } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { attendanceSessions, companies, faceCaptures, mediaFiles, outlets } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId, requireFeature } from '../tenant.js';
import { getGeneralSettings } from '../../utils/settings.js';
import { validateGeofence } from '../../utils/geofence.js';
import { writeAuditLog } from '../audit/audit.service.js';

const geoSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
});

const faceCaptureSchema = z.object({
  dataUrl: z.string().min(20),
  mimeType: z.string().default('image/jpeg'),
  sizeBytes: z.number().int().nonnegative().default(0),
  faceDetected: z.boolean().default(false),
  faceConfidence: z.number().min(0).max(1).optional(),
});

const checkInSchema = z.object({
  clientRequestId: z.string().uuid(),
  outletId: z.string().uuid().optional(),
  capturedAt: z.string().datetime(),
  location: geoSchema,
  faceCapture: faceCaptureSchema,
});

const checkOutSchema = checkInSchema.extend({
  attendanceSessionId: z.string().uuid(),
});

function todayDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function rejectInvalidAttendanceValidation(input: {
  reply: FastifyReply;
  settings: Awaited<ReturnType<typeof getGeneralSettings>>;
  geofence: ReturnType<typeof validateGeofence>;
  faceDetected: boolean;
}) {
  if (input.settings.requireFaceForAttendance && !input.faceDetected) {
    return input.reply.status(400).send({
      message: 'Wajah tidak terdeteksi. Pastikan kamera menghadap wajah sebelum mengirim absensi.',
      validationStatus: 'face_not_detected',
    });
  }

  if (!input.geofence.accuracyValid) {
    return input.reply.status(400).send({
      message: `Akurasi GPS terlalu rendah. Maksimal ${input.settings.maxGpsAccuracyM}m, saat ini ${Math.round(Number(input.geofence.accuracyMeters ?? 0))}m.`,
      validationStatus: 'invalid_location',
      geofence: input.geofence,
    });
  }

  if (input.geofence.targetRequired && !input.geofence.valid) {
    return input.reply.status(400).send({
      message: `Lokasi berada di luar radius yang diizinkan. Radius maksimal ${input.geofence.radiusMeters}m, jarak saat ini ${Math.round(Number(input.geofence.distanceMeters ?? 0))}m.`,
      validationStatus: 'invalid_location',
      geofence: input.geofence,
    });
  }

  return null;
}

async function getAttendanceGeofenceTarget(input: {
  companyId: string;
  outletId?: string;
  requireAttendanceAtOffice: boolean;
}) {
  if (input.requireAttendanceAtOffice) {
    const [company] = await db.select().from(companies).where(eq(companies.id, input.companyId)).limit(1);
    if (!company?.latitude || !company?.longitude) {
      throw Object.assign(new Error('Titik kantor company belum diatur. Lengkapi latitude dan longitude kantor di Pengaturan Operasional.'), { statusCode: 400 });
    }
    return {
      outlet: null,
      target: { latitude: Number(company.latitude), longitude: Number(company.longitude) },
      outletId: null,
    };
  }

  const outlet = input.outletId
    ? (await db
      .select()
      .from(outlets)
      .where(and(eq(outlets.id, input.outletId), eq(outlets.companyId, input.companyId), eq(outlets.status, 'active')))
      .limit(1))[0]
    : null;

  if (input.outletId && !outlet) {
    throw Object.assign(new Error('Outlet aktif tidak ditemukan pada company ini.'), { statusCode: 404 });
  }

  return {
    outlet,
    target: outlet ? { latitude: Number(outlet.latitude), longitude: Number(outlet.longitude) } : null,
    outletId: input.outletId,
  };
}

export async function attendanceRoutes(app: FastifyInstance) {
  app.get('/attendance/today', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const companyId = requireTenantId(request);
    const settings = await getGeneralSettings(companyId);
    const sessions = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.workDate, todayDateString())))
      .orderBy(desc(attendanceSessions.createdAt));
    const openSession = sessions.find((session) => session.status === 'open') ?? null;
    const latestSession = sessions[0] ?? null;
    const canCheckIn = settings.allowMultipleAttendanceSessionsPerDay
      ? !openSession
      : sessions.length === 0;

    return {
      session: openSession ?? latestSession,
      sessions,
      canCheckIn,
      allowMultipleAttendanceSessionsPerDay: settings.allowMultipleAttendanceSessionsPerDay,
      requireAttendanceAtOffice: settings.requireAttendanceAtOffice,
      checkInBlockedReason: canCheckIn
        ? null
        : openSession
          ? 'Selesaikan sesi absensi aktif sebelum absen masuk lagi.'
          : 'Hanya mengizinkan satu sesi absensi dalam sehari.',
    };
  });

  app.get('/attendance/history', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const companyId = requireTenantId(request);
    const rows = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.companyId, companyId)))
      .orderBy(desc(attendanceSessions.createdAt))
      .limit(30);

    return { attendance: rows };
  });

  app.post('/attendance/check-in', { preHandler: requirePermission('attendance.execute') }, async (request, reply) => {
    const authUser = request.user!;
    const companyId = requireTenantId(request);
    // Feature gate: only plans with 'attendance' feature can use check-in
    await requireFeature(request, 'attendance');
    const body = checkInSchema.parse(request.body);
    const settings = await getGeneralSettings(companyId);

    const [existingRequest] = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.clientRequestId, body.clientRequestId), eq(attendanceSessions.userId, authUser.id)))
      .limit(1);

    if (existingRequest) {
      return { session: existingRequest, geofence: null };
    }

    const todaySessions = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.workDate, todayDateString())))
      .orderBy(desc(attendanceSessions.createdAt));
    const openTodaySession = todaySessions.find((session) => session.status === 'open');

    if (openTodaySession) {
      return reply.status(409).send({ message: 'Selesaikan sesi absensi aktif sebelum absen masuk lagi.', session: openTodaySession });
    }

    if (!settings.allowMultipleAttendanceSessionsPerDay && todaySessions.length > 0) {
      return reply.status(409).send({ message: 'Hanya mengizinkan satu sesi absensi dalam sehari.', session: todaySessions[0] });
    }

    let attendanceTarget;
    try {
      attendanceTarget = await getAttendanceGeofenceTarget({
        companyId,
        outletId: body.outletId,
        requireAttendanceAtOffice: settings.requireAttendanceAtOffice,
      });
    } catch (error) {
      const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 400;
      return reply.status(statusCode).send({ message: error instanceof Error ? error.message : 'Validasi lokasi absensi gagal.' });
    }

    const geofence = validateGeofence({
      current: body.location,
      target: attendanceTarget.target,
      radiusMeters: attendanceTarget.outlet?.geofenceRadiusM ?? settings.defaultGeofenceRadiusM,
      accuracyMeters: body.location.accuracyM,
      maxAccuracyMeters: settings.maxGpsAccuracyM,
    });

    const rejected = rejectInvalidAttendanceValidation({ reply, settings, geofence, faceDetected: body.faceCapture.faceDetected });
    if (rejected) return rejected;

    const validationStatus = !body.faceCapture.faceDetected
      ? 'face_not_detected'
      : geofence.valid
        ? 'valid'
        : 'invalid_location';

    const session = await db.transaction(async (tx) => {
      const [media] = await tx.insert(mediaFiles).values({
        ownerType: 'attendance',
        fileUrl: body.faceCapture.dataUrl,
        mimeType: body.faceCapture.mimeType,
        sizeBytes: body.faceCapture.sizeBytes,
        capturedAt: new Date(body.capturedAt),
        uploadedByUserId: authUser.id,
      }).returning();

      const [face] = await tx.insert(faceCaptures).values({
        userId: authUser.id,
        mediaFileId: media.id,
        captureContext: 'attendance_check_in',
        capturedAt: new Date(body.capturedAt),
        latitude: String(body.location.latitude),
        longitude: String(body.location.longitude),
        faceDetected: body.faceCapture.faceDetected,
        faceConfidence: body.faceCapture.faceConfidence?.toString(),
        identityMatchStatus: 'not_checked',
        livenessStatus: 'not_checked',
      }).returning();

      const [sess] = await tx.insert(attendanceSessions).values({
        companyId,
        userId: authUser.id,
        workDate: todayDateString(),
        checkInAt: new Date(body.capturedAt),
        checkInLatitude: String(body.location.latitude),
        checkInLongitude: String(body.location.longitude),
        checkInAccuracyM: body.location.accuracyM?.toString(),
        checkInDistanceM: geofence.distanceMeters?.toFixed(2),
        checkInOutletId: attendanceTarget.outletId,
        checkInFaceCaptureId: face.id,
        status: 'open',
        validationStatus,
        clientRequestId: body.clientRequestId,
      }).returning();

      return sess;
    });

    await writeAuditLog({ request, action: 'attendance.checked_in', entityType: 'attendance_session', entityId: session.id, newValues: session });

    return reply.status(201).send({ session, geofence });
  });

  app.post('/attendance/check-out', { preHandler: requirePermission('attendance.execute') }, async (request, reply) => {
    const authUser = request.user!;
    const companyId = requireTenantId(request);
    await requireFeature(request, 'attendance');
    const body = checkOutSchema.parse(request.body);
    const settings = await getGeneralSettings(companyId);

    const [existingSession] = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, body.attendanceSessionId), eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.companyId, companyId)))
      .limit(1);

    if (!existingSession) {
      return reply.status(404).send({ message: 'Sesi absensi tidak ditemukan.' });
    }

    if (existingSession.status === 'closed') {
      return { session: existingSession };
    }

    let attendanceTarget;
    try {
      attendanceTarget = await getAttendanceGeofenceTarget({
        companyId,
        outletId: existingSession.checkInOutletId ?? body.outletId,
        requireAttendanceAtOffice: settings.requireAttendanceAtOffice,
      });
    } catch (error) {
      const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 400;
      return reply.status(statusCode).send({ message: error instanceof Error ? error.message : 'Validasi lokasi absensi gagal.' });
    }

    const geofence = validateGeofence({
      current: body.location,
      target: attendanceTarget.target,
      radiusMeters: attendanceTarget.outlet?.geofenceRadiusM ?? settings.defaultGeofenceRadiusM,
      accuracyMeters: body.location.accuracyM,
      maxAccuracyMeters: settings.maxGpsAccuracyM,
    });

    const rejected = rejectInvalidAttendanceValidation({ reply, settings, geofence, faceDetected: body.faceCapture.faceDetected });
    if (rejected) return rejected;

    const session = await db.transaction(async (tx) => {
      const [media] = await tx.insert(mediaFiles).values({
        ownerType: 'attendance',
        fileUrl: body.faceCapture.dataUrl,
        mimeType: body.faceCapture.mimeType,
        sizeBytes: body.faceCapture.sizeBytes,
        capturedAt: new Date(body.capturedAt),
        uploadedByUserId: authUser.id,
      }).returning();

      const [face] = await tx.insert(faceCaptures).values({
        userId: authUser.id,
        mediaFileId: media.id,
        captureContext: 'attendance_check_out',
        capturedAt: new Date(body.capturedAt),
        latitude: String(body.location.latitude),
        longitude: String(body.location.longitude),
        faceDetected: body.faceCapture.faceDetected,
        faceConfidence: body.faceCapture.faceConfidence?.toString(),
        identityMatchStatus: 'not_checked',
        livenessStatus: 'not_checked',
      }).returning();

      const [sess] = await tx.update(attendanceSessions).set({
        checkOutAt: new Date(body.capturedAt),
        checkOutLatitude: String(body.location.latitude),
        checkOutLongitude: String(body.location.longitude),
        checkOutAccuracyM: body.location.accuracyM?.toString(),
        checkOutFaceCaptureId: face.id,
        status: 'closed',
        validationStatus: existingSession.validationStatus === 'valid' && geofence.valid && body.faceCapture.faceDetected ? 'valid' : existingSession.validationStatus,
        updatedAt: new Date(),
      }).where(and(eq(attendanceSessions.id, body.attendanceSessionId), eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.companyId, companyId))).returning();

      return sess;
    });

    await writeAuditLog({ request, action: 'attendance.checked_out', entityType: 'attendance_session', entityId: session.id, oldValues: existingSession, newValues: session });

    return { session, geofence };
  });
}
