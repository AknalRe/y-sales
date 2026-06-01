import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { attendanceSessions, faceCaptures, mediaFiles, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const attendanceReviewQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  status: z.enum(['open', 'closed', 'flagged']).optional(),
  validationStatus: z.enum(['valid', 'invalid_location', 'face_not_detected', 'manual_review']).optional(),
  q: z.string().trim().max(120).optional(),
});

const attendanceReviewActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'flag_manual_review', 'reset']),
});

function buildAttendanceReviewConditions(companyId: string, query: z.infer<typeof attendanceReviewQuerySchema>) {
  const conditions = [eq(attendanceSessions.companyId, companyId)];
  if (query.from) conditions.push(gte(attendanceSessions.workDate, query.from));
  if (query.to) conditions.push(lte(attendanceSessions.workDate, query.to));
  if (query.status) conditions.push(eq(attendanceSessions.status, query.status));
  if (query.validationStatus) conditions.push(eq(attendanceSessions.validationStatus, query.validationStatus));
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(or(
      ilike(users.name, pattern),
      ilike(users.email, pattern),
      ilike(users.phone, pattern),
      ilike(users.employeeCode, pattern),
    )!);
  }
  return conditions;
}

function minutesBetween(start?: Date | string | null, end?: Date | string | null) {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return Math.round((endMs - startMs) / 60000);
}

function needsAttendanceReview(row: { status: string; validationStatus: string }) {
  return row.validationStatus !== 'valid' && row.status !== 'flagged';
}

export async function attendanceReviewRoutes(app: FastifyInstance) {
  app.get('/attendance/review', { preHandler: requirePermission('attendance.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = attendanceReviewQuerySchema.parse(request.query);
    const rows = await db
      .select({
        id: attendanceSessions.id,
        userId: attendanceSessions.userId,
        workDate: attendanceSessions.workDate,
        status: attendanceSessions.status,
        validationStatus: attendanceSessions.validationStatus,
        checkInAt: attendanceSessions.checkInAt,
        checkInLatitude: attendanceSessions.checkInLatitude,
        checkInLongitude: attendanceSessions.checkInLongitude,
        checkInAccuracyM: attendanceSessions.checkInAccuracyM,
        checkInDistanceM: attendanceSessions.checkInDistanceM,
        checkOutAt: attendanceSessions.checkOutAt,
        checkOutLatitude: attendanceSessions.checkOutLatitude,
        checkOutLongitude: attendanceSessions.checkOutLongitude,
        checkOutAccuracyM: attendanceSessions.checkOutAccuracyM,
        salesName: users.name,
        salesEmail: users.email,
        salesPhone: users.phone,
        employeeCode: users.employeeCode,
        faceDetected: faceCaptures.faceDetected,
        faceConfidence: faceCaptures.faceConfidence,
        faceImageUrl: mediaFiles.fileUrl,
      })
      .from(attendanceSessions)
      .innerJoin(users, eq(attendanceSessions.userId, users.id))
      .leftJoin(faceCaptures, eq(attendanceSessions.checkInFaceCaptureId, faceCaptures.id))
      .leftJoin(mediaFiles, eq(faceCaptures.mediaFileId, mediaFiles.id))
      .where(and(...buildAttendanceReviewConditions(companyId, query)))
      .orderBy(desc(attendanceSessions.createdAt))
      .limit(300);

    return {
      attendance: rows.map((row) => ({
        ...row,
        workMinutes: minutesBetween(row.checkInAt, row.checkOutAt),
      })),
    };
  });

  app.patch('/attendance/review/:id', { preHandler: requirePermission('attendance.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = attendanceReviewActionSchema.parse(request.body);
    const [oldSession] = await db.select().from(attendanceSessions).where(and(eq(attendanceSessions.companyId, companyId), eq(attendanceSessions.id, params.id)));
    if (!oldSession) throw Object.assign(new Error('Sesi absensi tidak ditemukan.'), { statusCode: 404 });

    const patch = body.action === 'approve'
      ? { validationStatus: 'valid' as const, status: oldSession.status === 'flagged' ? 'closed' as const : oldSession.status, updatedAt: new Date() }
      : body.action === 'reset'
        ? { validationStatus: 'manual_review' as const, status: oldSession.checkOutAt ? 'closed' as const : 'open' as const, updatedAt: new Date() }
        : { validationStatus: 'manual_review' as const, status: 'flagged' as const, updatedAt: new Date() };

    const [session] = await db.update(attendanceSessions).set(patch).where(and(eq(attendanceSessions.companyId, companyId), eq(attendanceSessions.id, params.id))).returning();
    await writeAuditLog({ request, action: `attendance.review.${body.action}`, entityType: 'attendance_session', entityId: session.id, oldValues: oldSession, newValues: session });
    return { session };
  });

  app.get('/attendance/report', { preHandler: requirePermission('attendance.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = attendanceReviewQuerySchema.parse(request.query);
    const rows = await db
      .select({
        id: attendanceSessions.id,
        userId: attendanceSessions.userId,
        workDate: attendanceSessions.workDate,
        status: attendanceSessions.status,
        validationStatus: attendanceSessions.validationStatus,
        checkInAt: attendanceSessions.checkInAt,
        checkOutAt: attendanceSessions.checkOutAt,
        checkInDistanceM: attendanceSessions.checkInDistanceM,
        salesName: users.name,
        salesEmail: users.email,
        employeeCode: users.employeeCode,
      })
      .from(attendanceSessions)
      .innerJoin(users, eq(attendanceSessions.userId, users.id))
      .where(and(...buildAttendanceReviewConditions(companyId, query)))
      .orderBy(desc(attendanceSessions.workDate), desc(attendanceSessions.createdAt))
      .limit(1000);

    const byUser = new Map<string, {
      userId: string;
      salesName: string;
      salesEmail: string | null;
      employeeCode: string | null;
      totalSessions: number;
      validSessions: number;
      issueSessions: number;
      openSessions: number;
      closedSessions: number;
      flaggedSessions: number;
      totalWorkMinutes: number;
      firstCheckInAt: string | null;
      lastCheckOutAt: string | null;
    }>();

    for (const row of rows) {
      const item = byUser.get(row.userId) ?? {
        userId: row.userId,
        salesName: row.salesName,
        salesEmail: row.salesEmail,
        employeeCode: row.employeeCode,
        totalSessions: 0,
        validSessions: 0,
        issueSessions: 0,
        openSessions: 0,
        closedSessions: 0,
        flaggedSessions: 0,
        totalWorkMinutes: 0,
        firstCheckInAt: null,
        lastCheckOutAt: null,
      };
      item.totalSessions += 1;
      if (row.validationStatus === 'valid') item.validSessions += 1;
      if (needsAttendanceReview(row)) item.issueSessions += 1;
      if (row.status === 'open') item.openSessions += 1;
      if (row.status === 'closed') item.closedSessions += 1;
      if (row.status === 'flagged') item.flaggedSessions += 1;
      item.totalWorkMinutes += minutesBetween(row.checkInAt, row.checkOutAt);
      if (row.checkInAt && (!item.firstCheckInAt || new Date(row.checkInAt) < new Date(item.firstCheckInAt))) item.firstCheckInAt = new Date(row.checkInAt).toISOString();
      if (row.checkOutAt && (!item.lastCheckOutAt || new Date(row.checkOutAt) > new Date(item.lastCheckOutAt))) item.lastCheckOutAt = new Date(row.checkOutAt).toISOString();
      byUser.set(row.userId, item);
    }

    return {
      summary: {
        totalSessions: rows.length,
        validSessions: rows.filter((row) => row.validationStatus === 'valid').length,
        issueSessions: rows.filter((row) => needsAttendanceReview(row)).length,
        openSessions: rows.filter((row) => row.status === 'open').length,
        closedSessions: rows.filter((row) => row.status === 'closed').length,
        flaggedSessions: rows.filter((row) => row.status === 'flagged').length,
        totalWorkMinutes: rows.reduce((total, row) => total + minutesBetween(row.checkInAt, row.checkOutAt), 0),
      },
      rows: Array.from(byUser.values()).sort((a, b) => b.totalSessions - a.totalSessions),
    };
  });
}
