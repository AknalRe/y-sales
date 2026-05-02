import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { attendanceSessions, faceCaptures, mediaFiles, outlets, salesTransactions, visitSchedules, visitSessions } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { verifyFaceIdentity } from '../face/face-verification.service.js';
import { requireTenantId } from '../tenant.js';
import { getGeneralSettings } from '../../utils/settings.js';

const scheduleSchema = z.object({
  salesUserId: z.string().uuid(),
  outletId: z.string().uuid().optional(),
  outletIds: z.array(z.string().uuid()).optional(),
  scheduledDate: z.string().date(),
  plannedStartTime: z.string().optional(),
  plannedEndTime: z.string().optional(),
  targetOutletCount: z.number().int().positive().default(1),
  targetDurationMinutes: z.number().int().positive().optional(),
  targetClosingCount: z.number().int().nonnegative().default(0),
  targetRevenueAmount: z.string().or(z.number()).transform(String).default('0'),
  priority: z.number().int().min(1).max(5).default(3),
  notes: z.string().optional(),
});

const faceCaptureSchema = z.object({
  dataUrl: z.string().min(20),
  mimeType: z.string().default('image/jpeg'),
  sizeBytes: z.number().int().nonnegative().default(0),
  faceDetected: z.boolean().default(true),
  faceConfidence: z.number().min(0).max(1).optional(),
  capturedAt: z.string().datetime().optional(),
});

const schedulePatchSchema = scheduleSchema.partial();

const checkInSchema = z.object({
  outletId: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
  clientRequestId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
  faceCapture: faceCaptureSchema,
});

const checkOutSchema = z.object({
  visitSessionId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
  outcome: z.enum(['closed_order', 'no_order', 'follow_up', 'outlet_closed', 'rejected', 'invalid_location']),
  closingNotes: z.string().optional(),
  faceCapture: faceCaptureSchema,
});

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earth = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function createVisitFaceCapture({
  userId,
  context,
  location,
  faceCapture,
}: {
  userId: string;
  context: 'visit_check_in' | 'visit_check_out';
  location: { latitude: number; longitude: number };
  faceCapture: z.infer<typeof faceCaptureSchema>;
}) {
  const capturedAt = new Date(faceCapture.capturedAt ?? new Date().toISOString());
  const [media] = await db.insert(mediaFiles).values({
    ownerType: 'visit',
    fileUrl: faceCapture.dataUrl,
    mimeType: faceCapture.mimeType,
    sizeBytes: faceCapture.sizeBytes,
    capturedAt,
    uploadedByUserId: userId,
  }).returning();

  const [face] = await db.insert(faceCaptures).values({
    userId,
    mediaFileId: media.id,
    captureContext: context,
    capturedAt,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    faceDetected: faceCapture.faceDetected,
    faceConfidence: faceCapture.faceConfidence?.toString(),
    identityMatchStatus: 'not_checked',
    livenessStatus: 'not_checked',
  }).returning();

  return face;
}

export async function visitRoutes(app: FastifyInstance) {
  app.get('/visits/schedules', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ date: z.string().date().optional(), salesUserId: z.string().uuid().optional() }).parse(request.query);
    const conditions = [eq(visitSchedules.companyId, companyId)];
    if (query.date) conditions.push(eq(visitSchedules.scheduledDate, query.date));
    if (query.salesUserId) conditions.push(eq(visitSchedules.salesUserId, query.salesUserId));
    const schedules = await db.select().from(visitSchedules).where(and(...conditions)).orderBy(desc(visitSchedules.scheduledDate), visitSchedules.priority);
    return { schedules };
  });

  app.post('/visits/schedules', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = scheduleSchema.parse(request.body);
    const targetOutletIds = body.outletIds?.length ? body.outletIds : body.outletId ? [body.outletId] : [];
    if (!targetOutletIds.length) throw Object.assign(new Error('Minimal satu outlet harus dipilih untuk jadwal.'), { statusCode: 400 });
    if (body.targetOutletCount > targetOutletIds.length) throw Object.assign(new Error('Target outlet tidak boleh lebih besar dari jumlah outlet yang dijadwalkan.'), { statusCode: 400 });

    const schedules = await db.transaction(async (tx) => {
      const created = [];
      for (const outletId of targetOutletIds) {
        const [outlet] = await tx.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, outletId)));
        if (!outlet) throw Object.assign(new Error(`Outlet ${outletId} tidak ditemukan.`), { statusCode: 404 });
        const [schedule] = await tx.insert(visitSchedules).values({
          companyId,
          salesUserId: body.salesUserId,
          outletId,
          scheduledDate: body.scheduledDate,
          plannedStartTime: body.plannedStartTime,
          plannedEndTime: body.plannedEndTime,
          targetOutletCount: body.targetOutletCount,
          targetDurationMinutes: body.targetDurationMinutes,
          targetClosingCount: body.targetClosingCount,
          targetRevenueAmount: body.targetRevenueAmount,
          priority: body.priority,
          assignedByUserId: request.user?.id,
          status: 'assigned',
          notes: body.notes,
        }).returning();
        created.push(schedule);
      }
      return created;
    });
    await Promise.all(schedules.map((schedule) => writeAuditLog({
      request,
      action: 'visit.schedule.created',
      entityType: 'visit_schedule',
      entityId: schedule.id,
      newValues: schedule,
    })));

    return {
      schedules,
      simulation: {
        salesUserId: body.salesUserId,
        scheduledDate: body.scheduledDate,
        targetOutletCount: body.targetOutletCount,
        scheduledOutletCount: schedules.length,
        targetDurationMinutes: body.targetDurationMinutes ?? null,
        targetClosingCount: body.targetClosingCount,
        targetRevenueAmount: body.targetRevenueAmount,
        withinTarget: schedules.length >= body.targetOutletCount,
      },
    };
  });

  app.patch('/visits/schedules/:id', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = schedulePatchSchema.parse(request.body);
    const [schedule] = await db.update(visitSchedules).set({ ...body, updatedAt: new Date() }).where(and(eq(visitSchedules.companyId, companyId), eq(visitSchedules.id, params.id))).returning();
    await writeAuditLog({ request, action: 'visit.schedule.updated', entityType: 'visit_schedule', entityId: schedule?.id, newValues: schedule });
    return { schedule };
  });

  app.post('/visits/schedules/:id/approve', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [schedule] = await db.update(visitSchedules).set({ status: 'approved', approvedByUserId: request.user?.id, approvedAt: new Date(), updatedAt: new Date() }).where(and(eq(visitSchedules.companyId, companyId), eq(visitSchedules.id, params.id))).returning();
    await writeAuditLog({ request, action: 'visit.schedule.approved', entityType: 'visit_schedule', entityId: schedule?.id, newValues: schedule });
    return { schedule };
  });

  app.post('/visits/schedules/:id/cancel', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [schedule] = await db.update(visitSchedules).set({ status: 'cancelled', updatedAt: new Date() }).where(and(eq(visitSchedules.companyId, companyId), eq(visitSchedules.id, params.id))).returning();
    await writeAuditLog({ request, action: 'visit.schedule.cancelled', entityType: 'visit_schedule', entityId: schedule?.id, newValues: schedule });
    return { schedule };
  });

  app.get('/visits/today', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const schedules = await db.select().from(visitSchedules).where(and(eq(visitSchedules.companyId, companyId), eq(visitSchedules.salesUserId, request.user!.id), eq(visitSchedules.scheduledDate, todayDate()))).orderBy(visitSchedules.priority);
    if (schedules.length) return { schedules, target: { outletCount: schedules[0].targetOutletCount, scheduledOutletCount: schedules.length, targetDurationMinutes: schedules[0].targetDurationMinutes, targetClosingCount: schedules[0].targetClosingCount, targetRevenueAmount: schedules[0].targetRevenueAmount } };
    const outletRows = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.status, 'active')));
    return { outlets: outletRows, fallback: true };
  });

  app.post('/visits/check-in', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = checkInSchema.parse(request.body);
    const [outlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, body.outletId)));
    if (!outlet) return { message: 'Outlet tidak ditemukan' };

    if (body.scheduleId) {
      const [schedule] = await db.select().from(visitSchedules).where(and(eq(visitSchedules.companyId, companyId), eq(visitSchedules.id, body.scheduleId), eq(visitSchedules.salesUserId, request.user!.id)));
      if (!schedule) throw Object.assign(new Error('Schedule tidak ditemukan untuk sales ini.'), { statusCode: 404 });
      if (schedule.outletId && schedule.outletId !== body.outletId) throw Object.assign(new Error('Outlet check-in tidak sesuai schedule.'), { statusCode: 400 });
      if (!['assigned', 'approved'].includes(schedule.status)) throw Object.assign(new Error('Schedule tidak dalam status yang bisa dimulai.'), { statusCode: 400 });
    }

    const settings = await getGeneralSettings(companyId);
    const distance = distanceMeters(body.latitude, body.longitude, Number(outlet.latitude), Number(outlet.longitude));
    const radius = outlet.geofenceRadiusM ?? settings.defaultGeofenceRadiusM;
    const validLocation = distance <= radius;
    const gpsAccuracyValid = body.accuracyM === undefined || body.accuracyM <= settings.maxGpsAccuracyM;
    if (settings.requireFaceForVisit && !body.faceCapture.faceDetected) throw Object.assign(new Error('Wajah tidak terdeteksi untuk check-in kunjungan.'), { statusCode: 400 });
    const face = await createVisitFaceCapture({
      userId: request.user!.id,
      context: 'visit_check_in',
      location: { latitude: body.latitude, longitude: body.longitude },
      faceCapture: body.faceCapture,
    });
    const hasValidFace = body.faceCapture.faceDetected;
    const identity = settings.requireFaceIdentityMatchForVisit
      ? await verifyFaceIdentity({
        companyId,
        userId: request.user!.id,
        faceCaptureId: face.id,
        faceDetected: hasValidFace,
        faceConfidence: body.faceCapture.faceConfidence,
        settings,
      })
      : { status: 'not_checked' as const, confidence: body.faceCapture.faceConfidence ?? 0, livenessStatus: 'not_checked' as const, reason: 'DISABLED_BY_COMPANY_SETTINGS' };
    if (settings.rejectVisitOnFaceMismatch && identity.status === 'not_matched') throw Object.assign(new Error('Identitas wajah tidak cocok dengan user login.'), { statusCode: 403 });
    const validationStatus = !hasValidFace ? 'face_not_detected' : validLocation && gpsAccuracyValid && identity.status === 'matched' ? 'valid' : 'manual_review';

    const [existing] = await db.select().from(visitSessions).where(and(eq(visitSessions.companyId, companyId), eq(visitSessions.clientRequestId, body.clientRequestId)));
    if (existing) return { visit: existing, idempotent: true };

    const [visit] = await db.insert(visitSessions).values({
      companyId,
      salesUserId: request.user!.id,
      outletId: outlet.id,
      scheduleId: body.scheduleId,
      checkInAt: new Date(),
      checkInLatitude: String(body.latitude),
      checkInLongitude: String(body.longitude),
      checkInAccuracyM: body.accuracyM ? String(body.accuracyM) : undefined,
      checkInDistanceM: distance.toFixed(2),
      checkInFaceCaptureId: face.id,
      geofenceRadiusMUsed: radius,
      status: validLocation && gpsAccuracyValid && hasValidFace && (!settings.requireFaceIdentityMatchForVisit || identity.status === 'matched') ? 'open' : 'invalid_location',
      validationStatus,
      clientRequestId: body.clientRequestId,
    }).returning();

    const gpsAccuracy = { valid: gpsAccuracyValid, accuracyM: body.accuracyM ?? null, maxAccuracyM: settings.maxGpsAccuracyM };
    if (body.scheduleId) await db.update(visitSchedules).set({ status: 'in_progress', updatedAt: new Date() }).where(eq(visitSchedules.id, body.scheduleId));
    await writeAuditLog({ request, action: 'visit.check_in', entityType: 'visit_session', entityId: visit.id, newValues: { visit, geofence: { valid: validLocation, distanceM: distance, radiusM: radius }, gpsAccuracy, face: { faceCaptureId: face.id, faceDetected: hasValidFace, faceConfidence: body.faceCapture.faceConfidence ?? null, identity } } });

    return { visit, geofence: { valid: validLocation, distanceM: distance, radiusM: radius }, gpsAccuracy, face: { faceCaptureId: face.id, faceDetected: hasValidFace, faceConfidence: body.faceCapture.faceConfidence ?? null, identity } };
  });

  app.post('/visits/check-out', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = checkOutSchema.parse(request.body);
    const [visit] = await db.select().from(visitSessions).where(and(eq(visitSessions.companyId, companyId), eq(visitSessions.id, body.visitSessionId), eq(visitSessions.salesUserId, request.user!.id)));
    if (!visit) throw Object.assign(new Error('Visit session tidak ditemukan.'), { statusCode: 404 });
    if (visit.status !== 'open' || !visit.checkInAt) throw Object.assign(new Error('Visit session tidak dalam status open.'), { statusCode: 400 });

    const face = await createVisitFaceCapture({
      userId: request.user!.id,
      context: 'visit_check_out',
      location: { latitude: body.latitude, longitude: body.longitude },
      faceCapture: body.faceCapture,
    });
    const settings = await getGeneralSettings(companyId);
    if (settings.requireFaceForVisit && !body.faceCapture.faceDetected) throw Object.assign(new Error('Wajah tidak terdeteksi untuk check-out kunjungan.'), { statusCode: 400 });
    const identity = settings.requireFaceIdentityMatchForVisit
      ? await verifyFaceIdentity({ companyId, userId: request.user!.id, faceCaptureId: face.id, faceDetected: body.faceCapture.faceDetected, faceConfidence: body.faceCapture.faceConfidence, settings })
      : { status: 'not_checked' as const, confidence: body.faceCapture.faceConfidence ?? 0, livenessStatus: 'not_checked' as const, reason: 'DISABLED_BY_COMPANY_SETTINGS' };
    if (settings.rejectVisitOnFaceMismatch && identity.status === 'not_matched') throw Object.assign(new Error('Identitas wajah check-out tidak cocok dengan user login.'), { statusCode: 403 });

    const now = new Date();
    const durationSeconds = Math.max(0, Math.round((now.getTime() - new Date(visit.checkInAt).getTime()) / 1000));
    const [updated] = await db.update(visitSessions).set({
      checkOutAt: now,
      checkOutLatitude: String(body.latitude),
      checkOutLongitude: String(body.longitude),
      checkOutAccuracyM: body.accuracyM ? String(body.accuracyM) : undefined,
      checkOutFaceCaptureId: face.id,
      durationSeconds,
      outcome: body.outcome,
      closingNotes: body.closingNotes,
      status: 'completed',
      updatedAt: now,
    }).where(eq(visitSessions.id, visit.id)).returning();

    if (visit.scheduleId) await db.update(visitSchedules).set({ status: 'completed', updatedAt: now }).where(eq(visitSchedules.id, visit.scheduleId));
    const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.visitSessionId, visit.id)));
    await writeAuditLog({ request, action: 'visit.check_out', entityType: 'visit_session', entityId: updated.id, oldValues: visit, newValues: { ...updated, face: { faceCaptureId: face.id, faceDetected: body.faceCapture.faceDetected, faceConfidence: body.faceCapture.faceConfidence ?? null, identity } } });
    return { visit: updated, face: { faceCaptureId: face.id, faceDetected: body.faceCapture.faceDetected, faceConfidence: body.faceCapture.faceConfidence ?? null, identity }, result: { durationSeconds, durationMinutes: Math.round(durationSeconds / 60), hasClosingOrder: Number(orderCount?.count ?? 0) > 0 } };
  });

  app.get('/visits/performance', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ from: z.string().date().optional(), to: z.string().date().optional(), salesUserId: z.string().uuid().optional() }).parse(request.query);
    const from = query.from ?? todayDate();
    const to = query.to ?? from;
    const scheduleConditions = [eq(visitSchedules.companyId, companyId), gte(visitSchedules.scheduledDate, from), lte(visitSchedules.scheduledDate, to)];
    if (query.salesUserId) scheduleConditions.push(eq(visitSchedules.salesUserId, query.salesUserId));
    const schedules = await db.select().from(visitSchedules).where(and(...scheduleConditions));
    const sessions = await db.select().from(visitSessions).where(and(eq(visitSessions.companyId, companyId), gte(sql`date(${visitSessions.checkInAt})`, from), lte(sql`date(${visitSessions.checkInAt})`, to)));
    const sessionIds = sessions.map((session) => session.id);
    const orders = sessionIds.length
      ? await db.select().from(salesTransactions).where(and(eq(salesTransactions.companyId, companyId), eq(salesTransactions.status, 'closed')))
      : [];
    const visitOrderIds = new Set(sessionIds);
    const closingOrders = orders.filter((order) => order.visitSessionId && visitOrderIds.has(order.visitSessionId));
    const completed = schedules.filter((schedule) => schedule.status === 'completed').length;
    const targetOutletCount = Math.max(...schedules.map((schedule) => schedule.targetOutletCount), schedules.length, 0);
    const targetClosingCount = Math.max(...schedules.map((schedule) => schedule.targetClosingCount), 0);
    const targetRevenueAmount = Math.max(...schedules.map((schedule) => Number(schedule.targetRevenueAmount)), 0);
    const actualClosingCount = closingOrders.length;
    const actualRevenueAmount = closingOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    return {
      performance: {
        scheduledOutletCount: schedules.length,
        completedOutletCount: completed,
        targetOutletCount,
        visitAchievementPercent: targetOutletCount ? Math.round((completed / targetOutletCount) * 100) : 0,
        targetClosingCount,
        actualClosingCount,
        closingAchievementPercent: targetClosingCount ? Math.round((actualClosingCount / targetClosingCount) * 100) : 0,
        targetRevenueAmount: targetRevenueAmount.toFixed(2),
        actualRevenueAmount: actualRevenueAmount.toFixed(2),
        revenueAchievementPercent: targetRevenueAmount ? Math.round((actualRevenueAmount / targetRevenueAmount) * 100) : 0,
        effectiveCallRate: completed ? Math.round((actualClosingCount / completed) * 100) : 0,
        averageOrderValue: actualClosingCount ? (actualRevenueAmount / actualClosingCount).toFixed(2) : '0.00',
      },
    };
  });

  app.get('/visits/review', { preHandler: requirePermission('visits.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db.select().from(visitSessions).where(eq(visitSessions.companyId, companyId)).orderBy(desc(visitSessions.createdAt)).limit(100);
    return { visits: rows };
  });
}
