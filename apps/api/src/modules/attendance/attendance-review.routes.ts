import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { attendanceSessions, faceCaptures, mediaFiles, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

export async function attendanceReviewRoutes(app: FastifyInstance) {
  app.get('/attendance/review', { preHandler: requirePermission('attendance.review') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db
      .select({
        id: attendanceSessions.id,
        workDate: attendanceSessions.workDate,
        status: attendanceSessions.status,
        validationStatus: attendanceSessions.validationStatus,
        checkInAt: attendanceSessions.checkInAt,
        checkInLatitude: attendanceSessions.checkInLatitude,
        checkInLongitude: attendanceSessions.checkInLongitude,
        checkInAccuracyM: attendanceSessions.checkInAccuracyM,
        checkInDistanceM: attendanceSessions.checkInDistanceM,
        checkOutAt: attendanceSessions.checkOutAt,
        salesName: users.name,
        salesEmail: users.email,
        faceDetected: faceCaptures.faceDetected,
        faceConfidence: faceCaptures.faceConfidence,
        faceImageUrl: mediaFiles.fileUrl,
      })
      .from(attendanceSessions)
      .innerJoin(users, eq(attendanceSessions.userId, users.id))
      .leftJoin(faceCaptures, eq(attendanceSessions.checkInFaceCaptureId, faceCaptures.id))
      .leftJoin(mediaFiles, eq(faceCaptures.mediaFileId, mediaFiles.id))
      .where(eq(attendanceSessions.companyId, companyId))
      .orderBy(desc(attendanceSessions.createdAt))
      .limit(100);

    return { attendance: rows };
  });
}


