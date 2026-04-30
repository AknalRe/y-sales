import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { attendanceSessions, faceCaptures, mediaFiles, outlets } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { getNumericSetting } from '../../utils/settings.js';
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
  return new Date().toISOString().slice(0, 10);
}

export async function attendanceRoutes(app: FastifyInstance) {
  app.get('/attendance/today', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.workDate, todayDateString())));

    return { session: session ?? null };
  });

  app.post('/attendance/check-in', { preHandler: requirePermission('attendance.execute') }, async (request, reply) => {
    const authUser = request.user!;
    const body = checkInSchema.parse(request.body);
    const radius = await getNumericSetting('default_geofence_radius_m');
    const maxAccuracy = await getNumericSetting('max_gps_accuracy_m');

    const outlet = body.outletId
      ? (await db.select().from(outlets).where(eq(outlets.id, body.outletId)))[0]
      : null;

    const geofence = validateGeofence({
      current: body.location,
      target: outlet ? { latitude: Number(outlet.latitude), longitude: Number(outlet.longitude) } : null,
      radiusMeters: outlet?.geofenceRadiusM ?? radius,
      accuracyMeters: body.location.accuracyM,
      maxAccuracyMeters: maxAccuracy,
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

  app.post('/attendance/check-out', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const body = checkOutSchema.parse(request.body);

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


