import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  attendanceSessions,
  companies,
  faceCaptures,
  inventoryBalances,
  mediaFiles,
  outlets,
  products,
  salesTransactionItems,
  salesTransactions,
  visitSessions,
  visitSchedules,
  warehouses,
} from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { getGeneralSettings } from '../../utils/settings.js';
import { validateGeofence } from '../../utils/geofence.js';
import { writeAuditLog } from '../audit/audit.service.js';

type HandlerResult = { success: boolean; entityId?: string; error?: string };

type SyncContext = {
  companyId: string;
  userId: string;
  request: any;
};

const attendanceCheckInPayload = z.object({
  clientRequestId: z.string().uuid(),
  outletId: z.string().uuid().optional(),
  capturedAt: z.string().datetime(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracyM: z.number().optional(),
  }),
  faceCapture: z.object({
    dataUrl: z.string().min(20),
    mimeType: z.string().default('image/jpeg'),
    sizeBytes: z.number().int().nonnegative().default(0),
    faceDetected: z.boolean().default(true),
    faceConfidence: z.number().min(0).max(1).optional(),
  }),
});

const visitCheckInPayload = z.object({
  outletId: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
  clientRequestId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
  faceCapture: z.object({
    dataUrl: z.string().min(20),
    mimeType: z.string().default('image/jpeg'),
    sizeBytes: z.number().int().nonnegative().default(0),
    faceDetected: z.boolean().default(true),
    faceConfidence: z.number().min(0).max(1).optional(),
    capturedAt: z.string().datetime().optional(),
  }),
});

const visitCheckOutPayload = z.object({
  visitSessionId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
  outcome: z.enum(['closed_order', 'no_order', 'follow_up', 'outlet_closed', 'rejected', 'invalid_location']),
  closingNotes: z.string().optional(),
  faceCapture: z.object({
    dataUrl: z.string().min(20),
    mimeType: z.string().default('image/jpeg'),
    sizeBytes: z.number().int().nonnegative().default(0),
    faceDetected: z.boolean().default(true),
    faceConfidence: z.number().min(0).max(1).optional(),
    capturedAt: z.string().datetime().optional(),
  }),
});

const transactionCreatePayload = z.object({
  clientRequestId: z.string().uuid(),
  outletId: z.string().uuid(),
  visitSessionId: z.string().uuid(),
  customerType: z.enum(['store', 'agent', 'end_user']).default('store'),
  paymentMethod: z.enum(['cash', 'qris', 'credit', 'consignment']).default('cash'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.string().or(z.number()).transform(String),
    unitPrice: z.string().or(z.number()).transform(String),
  })).min(1),
});

function todayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function handleAttendanceCheckIn(payload: unknown, ctx: SyncContext): Promise<HandlerResult> {
  try {
    const body = attendanceCheckInPayload.parse(payload);
    const [existing] = await db.select().from(attendanceSessions).where(
      eq(attendanceSessions.clientRequestId, body.clientRequestId)
    );
    if (existing) return { success: true, entityId: existing.id };

    const settings = await getGeneralSettings(ctx.companyId);
    const todaySessions = await db.select().from(attendanceSessions).where(
      and(eq(attendanceSessions.userId, ctx.userId), eq(attendanceSessions.workDate, todayDate()))
    );
    const openTodaySession = todaySessions.find((session) => session.status === 'open');

    if (openTodaySession) {
      return { success: false, error: 'Selesaikan sesi absensi aktif sebelum absen masuk lagi.' };
    }

    if (!settings.allowMultipleAttendanceSessionsPerDay && todaySessions.length > 0) {
      return { success: false, error: 'Hanya mengizinkan satu sesi absensi dalam sehari.' };
    }

    let geofenceTarget = null;
    if (settings.requireAttendanceAtOffice) {
      const [company] = await db.select().from(companies).where(eq(companies.id, ctx.companyId)).limit(1);
      if (!company?.latitude || !company?.longitude) {
        return { success: false, error: 'Titik kantor company belum diatur. Lengkapi latitude dan longitude kantor di Pengaturan Operasional.' };
      }
      geofenceTarget = { latitude: Number(company.latitude), longitude: Number(company.longitude) };
    }

    const geofence = validateGeofence({
      current: body.location,
      target: geofenceTarget,
      radiusMeters: settings.defaultGeofenceRadiusM,
      accuracyMeters: body.location.accuracyM,
      maxAccuracyMeters: settings.maxGpsAccuracyM,
    });

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'attendance',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.capturedAt),
      uploadedByUserId: ctx.userId,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
      userId: ctx.userId,
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
      : geofence.valid ? 'valid' : 'invalid_location';

    const [session] = await db.insert(attendanceSessions).values({
      companyId: ctx.companyId,
      userId: ctx.userId,
      workDate: todayDate(),
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

    await writeAuditLog({ request: ctx.request, action: 'sync.attendance.check_in', entityType: 'attendance_session', entityId: session.id, newValues: session });
    return { success: true, entityId: session.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleVisitCheckIn(payload: unknown, ctx: SyncContext): Promise<HandlerResult> {
  try {
    const body = visitCheckInPayload.parse(payload);
    const [existing] = await db.select().from(visitSessions).where(
      eq(visitSessions.clientRequestId, body.clientRequestId)
    );
    if (existing) return { success: true, entityId: existing.id };

    const [outlet] = await db.select().from(outlets).where(
      and(eq(outlets.companyId, ctx.companyId), eq(outlets.id, body.outletId))
    );
    if (!outlet) return { success: false, error: 'Outlet tidak ditemukan' };
    if (outlet.status !== 'active') return { success: false, error: 'Outlet belum aktif' };

    let schedule: typeof visitSchedules.$inferSelect | undefined;
    if (body.scheduleId) {
      [schedule] = await db.select().from(visitSchedules).where(
        and(eq(visitSchedules.companyId, ctx.companyId), eq(visitSchedules.id, body.scheduleId), eq(visitSchedules.salesUserId, ctx.userId))
      );
    } else {
      [schedule] = await db.select().from(visitSchedules).where(and(
        eq(visitSchedules.companyId, ctx.companyId),
        eq(visitSchedules.salesUserId, ctx.userId),
        eq(visitSchedules.outletId, body.outletId),
        eq(visitSchedules.scheduledDate, todayDate()),
      )).limit(1);
    }
    if (!schedule) return { success: false, error: 'Schedule tidak ditemukan' };
    if (!['assigned', 'approved'].includes(schedule.status)) return { success: false, error: 'Schedule tidak bisa dimulai' };

    const settings = await getGeneralSettings(ctx.companyId);
    const radius = outlet.geofenceRadiusM ?? settings.defaultGeofenceRadiusM;
    const geofence = validateGeofence({
      current: { latitude: body.latitude, longitude: body.longitude },
      target: { latitude: Number(outlet.latitude), longitude: Number(outlet.longitude) },
      radiusMeters: radius,
      accuracyMeters: body.accuracyM,
      maxAccuracyMeters: settings.maxGpsAccuracyM,
    });

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'visit',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.faceCapture.capturedAt ?? Date.now()),
      uploadedByUserId: ctx.userId,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
      userId: ctx.userId,
      mediaFileId: media.id,
      captureContext: 'visit_check_in',
      capturedAt: new Date(body.faceCapture.capturedAt ?? Date.now()),
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      faceDetected: body.faceCapture.faceDetected,
      faceConfidence: body.faceCapture.faceConfidence?.toString(),
      identityMatchStatus: 'not_checked',
      livenessStatus: 'not_checked',
    }).returning();

    const hasValidFace = body.faceCapture.faceDetected;
    const validationStatus = !hasValidFace ? 'face_not_detected' : geofence.valid ? 'valid' : 'manual_review';

    const [visit] = await db.insert(visitSessions).values({
      companyId: ctx.companyId,
      salesUserId: ctx.userId,
      outletId: outlet.id,
      scheduleId: schedule.id,
      checkInAt: new Date(),
      checkInLatitude: String(body.latitude),
      checkInLongitude: String(body.longitude),
      checkInAccuracyM: body.accuracyM?.toString(),
      checkInDistanceM: geofence.distanceMeters?.toFixed(2),
      checkInFaceCaptureId: face.id,
      geofenceRadiusMUsed: radius,
      status: 'open',
      validationStatus,
      clientRequestId: body.clientRequestId,
    }).returning();

    await db.update(visitSchedules).set({ status: 'in_progress', updatedAt: new Date() }).where(eq(visitSchedules.id, schedule.id));
    await writeAuditLog({ request: ctx.request, action: 'sync.visit.check_in', entityType: 'visit_session', entityId: visit.id, newValues: visit });
    return { success: true, entityId: visit.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleVisitCheckOut(payload: unknown, ctx: SyncContext): Promise<HandlerResult> {
  try {
    const body = visitCheckOutPayload.parse(payload);
    const [visit] = await db.select().from(visitSessions).where(
      and(eq(visitSessions.companyId, ctx.companyId), eq(visitSessions.id, body.visitSessionId), eq(visitSessions.salesUserId, ctx.userId))
    );
    if (!visit) return { success: false, error: 'Visit session tidak ditemukan' };
    if (visit.checkOutAt) return { success: true, entityId: visit.id };

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'visit',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.faceCapture.capturedAt ?? Date.now()),
      uploadedByUserId: ctx.userId,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
      userId: ctx.userId,
      mediaFileId: media.id,
      captureContext: 'visit_check_out',
      capturedAt: new Date(body.faceCapture.capturedAt ?? Date.now()),
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      faceDetected: body.faceCapture.faceDetected,
      faceConfidence: body.faceCapture.faceConfidence?.toString(),
      identityMatchStatus: 'not_checked',
      livenessStatus: 'not_checked',
    }).returning();

    const now = new Date();
    const durationSeconds = Math.max(0, Math.round((now.getTime() - new Date(visit.checkInAt!).getTime()) / 1000));
    const [updated] = await db.update(visitSessions).set({
      checkOutAt: now,
      checkOutLatitude: String(body.latitude),
      checkOutLongitude: String(body.longitude),
      checkOutAccuracyM: body.accuracyM?.toString(),
      checkOutFaceCaptureId: face.id,
      durationSeconds,
      outcome: body.outcome,
      closingNotes: body.closingNotes,
      status: 'completed',
      updatedAt: now,
    }).where(eq(visitSessions.id, visit.id)).returning();

    if (visit.scheduleId) await db.update(visitSchedules).set({ status: 'completed', updatedAt: now }).where(eq(visitSchedules.id, visit.scheduleId));
    await writeAuditLog({ request: ctx.request, action: 'sync.visit.check_out', entityType: 'visit_session', entityId: updated.id, oldValues: visit, newValues: updated });
    return { success: true, entityId: updated.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleTransactionCreate(payload: unknown, ctx: SyncContext): Promise<HandlerResult> {
  try {
    const body = transactionCreatePayload.parse(payload);
    const [existing] = await db.select().from(salesTransactions).where(
      and(eq(salesTransactions.companyId, ctx.companyId), eq(salesTransactions.clientRequestId, body.clientRequestId))
    );
    if (existing) return { success: true, entityId: existing.id };

    const [visit] = await db.select().from(visitSessions).where(
      and(eq(visitSessions.companyId, ctx.companyId), eq(visitSessions.id, body.visitSessionId), eq(visitSessions.salesUserId, ctx.userId))
    );
    if (!visit) return { success: false, error: 'Visit session tidak ditemukan' };
    if (visit.status !== 'open') return { success: false, error: 'Visit tidak open' };

    const [stockWarehouse] = await db.select().from(warehouses).where(
      and(eq(warehouses.companyId, ctx.companyId), eq(warehouses.type, 'sales_van'), eq(warehouses.ownerUserId, ctx.userId), eq(warehouses.status, 'active'))
    );
    if (!stockWarehouse) return { success: false, error: 'Stok sales belum tersedia' };

    const total = body.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0).toFixed(2);

    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(salesTransactions).values({
        companyId: ctx.companyId,
        transactionNo: `SO-${Date.now()}`,
        salesUserId: ctx.userId,
        outletId: visit.outletId,
        visitSessionId: body.visitSessionId,
        sourceWarehouseId: stockWarehouse.id,
        customerType: body.customerType,
        paymentMethod: body.paymentMethod,
        subtotalAmount: total,
        totalAmount: total,
        status: 'pending_approval',
        paymentStatus: body.paymentMethod === 'cash' || body.paymentMethod === 'qris' ? 'paid' : 'unpaid',
        submittedAt: new Date(),
        clientRequestId: body.clientRequestId,
      }).returning();

      for (const item of body.items) {
        const lineTotal = (Number(item.quantity) * Number(item.unitPrice)).toFixed(2);
        const [balance] = await tx.select().from(inventoryBalances).where(and(
          eq(inventoryBalances.companyId, ctx.companyId),
          eq(inventoryBalances.warehouseId, stockWarehouse.id),
          eq(inventoryBalances.productId, item.productId),
        ));
        const availableQuantity = Number(balance?.quantity ?? 0) - Number(balance?.reservedQuantity ?? 0);
        if (!balance || availableQuantity < Number(item.quantity)) {
          const [product] = await tx.select().from(products).where(and(eq(products.companyId, ctx.companyId), eq(products.id, item.productId)));
          throw new Error(`Stok sales tidak cukup untuk ${product?.name ?? item.productId}`);
        }
        await tx.update(inventoryBalances).set({
          reservedQuantity: sql`${inventoryBalances.reservedQuantity} + ${item.quantity}`,
          updatedAt: new Date(),
        }).where(eq(inventoryBalances.id, balance.id));
        await tx.insert(salesTransactionItems).values({
          companyId: ctx.companyId,
          transactionId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          reservedQuantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
        });
      }
      return created;
    });

    await writeAuditLog({ request: ctx.request, action: 'sync.sales.order.created', entityType: 'sales_transaction', entityId: order.id, newValues: order });
    return { success: true, entityId: order.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const handlers: Record<string, (payload: unknown, ctx: SyncContext) => Promise<HandlerResult>> = {
  'attendance': handleAttendanceCheckIn,
  'visit': handleVisitCheckIn,
  'visit.check-in': handleVisitCheckIn,
  'visit.check-out': handleVisitCheckOut,
  'transaction': handleTransactionCreate,
};

export async function processSyncEvent(event: { entityType: string; operation: string; payload: unknown }, ctx: SyncContext): Promise<HandlerResult> {
  const handler = handlers[`${event.entityType}.${event.operation}`] ?? handlers[event.entityType];
  if (!handler) {
    return { success: true, error: `No handler for ${event.entityType}/${event.operation}, event recorded` };
  }
  return handler(event.payload, ctx);
}
