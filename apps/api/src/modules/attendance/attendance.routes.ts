import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { attendanceSessions, faceCaptures, mediaFiles, outlets } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId, requireFeature } from '../tenant.js';
import { getGeneralSettings } from '../../utils/settings.js';
import { validateGeofence } from '../../utils/geofence.js';

const geoSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
});

const faceCaptureSchema = z.object({
  dataUrl: z.string().min(20),
  mimeType: z.string().default('image/jpeg'),
  sizeBytes: z.number().int().nonnegative().default(0),
  faceDetected: z.boolean().default(true),
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
      checkInBlockedReason: canCheckIn
        ? null
        : openSession
          ? 'Selesaikan sesi absensi aktif sebelum absen masuk lagi.'
          : 'Company hanya mengizinkan satu sesi absensi dalam sehari.',
    };
  });

  app.get('/attendance/history', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const rows = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.userId, authUser.id))
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
      return reply.status(409).send({ message: 'Company hanya mengizinkan satu sesi absensi dalam sehari.', session: todaySessions[0] });
    }

    const outlet = body.outletId
      ? (await db
        .select()
        .from(outlets)
        .where(and(eq(outlets.id, body.outletId), eq(outlets.companyId, companyId), eq(outlets.status, 'active')))
        .limit(1))[0]
      : null;

    if (body.outletId && !outlet) {
      return reply.status(404).send({ message: 'Outlet aktif tidak ditemukan pada company ini.' });
    }

    const geofence = validateGeofence({
      current: body.location,
      target: outlet ? { latitude: Number(outlet.latitude), longitude: Number(outlet.longitude) } : null,
      radiusMeters: outlet?.geofenceRadiusM ?? settings.defaultGeofenceRadiusM,
      accuracyMeters: body.location.accuracyM,
      maxAccuracyMeters: settings.maxGpsAccuracyM,
    });

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'attendance',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.capturedAt),
      uploadedByUserId: authUser.id,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
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

    const validationStatus = !body.faceCapture.faceDetected
      ? 'face_not_detected'
      : geofence.valid
        ? 'valid'
        : 'invalid_location';

    const [session] = await db.insert(attendanceSessions).values({
      companyId,
      userId: authUser.id,
      workDate: todayDateString(),
      checkInAt: new Date(body.capturedAt),
      checkInLatitude: String(body.location.latitude),
      checkInLongitude: String(body.location.longitude),
      checkInAccuracyM: body.location.accuracyM?.toString(),
      checkInDistanceM: geofence.distanceMeters?.toFixed(2),
      checkInOutletId: body.outletId,
      checkInFaceCaptureId: face.id,
      status: 'open',
      validationStatus,
      clientRequestId: body.clientRequestId,
    }).returning();

    return reply.status(201).send({ session, geofence });
  });

  app.post('/attendance/check-out', { preHandler: requirePermission('attendance.execute') }, async (request, reply) => {
    const authUser = request.user!;
    await requireFeature(request, 'attendance');
    const body = checkOutSchema.parse(request.body);

    const [existingSession] = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, body.attendanceSessionId), eq(attendanceSessions.userId, authUser.id)))
      .limit(1);

    if (!existingSession) {
      return reply.status(404).send({ message: 'Sesi absensi tidak ditemukan.' });
    }

    if (existingSession.status === 'closed') {
      return { session: existingSession };
    }

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'attendance',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.capturedAt),
      uploadedByUserId: authUser.id,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
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

    const [session] = await db.update(attendanceSessions).set({
      checkOutAt: new Date(body.capturedAt),
      checkOutLatitude: String(body.location.latitude),
      checkOutLongitude: String(body.location.longitude),
      checkOutAccuracyM: body.location.accuracyM?.toString(),
      checkOutFaceCaptureId: face.id,
      status: 'closed',
      updatedAt: new Date(),
    }).where(and(eq(attendanceSessions.id, body.attendanceSessionId), eq(attendanceSessions.userId, authUser.id))).returning();

    return { session };
  });
}
