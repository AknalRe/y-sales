import type { FastifyInstance } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import { notifications, userDeviceTokens } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { authenticate } from '../auth/auth.service.js';

const registerTokenSchema = z.object({
  token: z.string(),
  platform: z.enum(['ios', 'android', 'web']).default('web'),
});

export async function notificationRoutes(app: FastifyInstance) {
  // Register a device push token
  // TODO: Implement rate-limiting for token registration to prevent spamming the database
  app.post<{ Body: z.infer<typeof registerTokenSchema> }>(
    '/notifications/tokens',
    { preHandler: authenticate },
    async (request) => {
      const user = request.user!;
      const data = registerTokenSchema.parse(request.body);

      const existingToken = await db.query.userDeviceTokens.findFirst({
        where: eq(userDeviceTokens.token, data.token),
      });

      if (existingToken) {
        if (existingToken.userId !== user.id) {
          await db.update(userDeviceTokens)
            .set({ userId: user.id, companyId: user.companyId, updatedAt: new Date() })
            .where(eq(userDeviceTokens.id, existingToken.id));
        }
      } else {
        await db.insert(userDeviceTokens).values({
          userId: user.id,
          companyId: user.companyId || null,
          devicePlatform: data.platform,
          token: data.token,
        });
      }

      try {
        await writeAuditLog({
          request,
          action: 'notification.token_registered',
          entityType: 'user',
          entityId: user.id,
          newValues: { platform: data.platform },
        });
      } catch (err) {
        console.error('[AuditLog] notification.token_registered failed:', err);
      }

      return { success: true, message: 'Token registered successfully' };
    }
  );

  // Remove a device push token
  app.delete<{ Params: { token: string } }>(
    '/notifications/tokens/:token',
    { preHandler: authenticate },
    async (request) => {
      const user = request.user!;
      const { token } = request.params;

      await db.delete(userDeviceTokens).where(
        and(
          eq(userDeviceTokens.token, token),
          eq(userDeviceTokens.userId, user.id)
        )
      );

      try {
        await writeAuditLog({
          request,
          action: 'notification.token_removed',
          entityType: 'user',
          entityId: user.id,
          oldValues: { token },
        });
      } catch (err) {
        console.error('[AuditLog] notification.token_removed failed:', err);
      }

      return { success: true, message: 'Token removed successfully' };
    }
  );

  // Get unread notifications count
  app.get(
    '/notifications/unread-count',
    { preHandler: authenticate },
    async (request) => {
      const user = request.user!;
      const conditions = [
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      ];
      if (user.companyId) {
        conditions.push(eq(notifications.companyId, user.companyId));
      }

      const [result] = await db.select({ value: count() })
        .from(notifications)
        .where(and(...conditions));
      return { count: Number(result?.value || 0) };
    }
  );

  // Get notification inbox
  app.get<{ Querystring: { page?: string, limit?: string } }>(
    '/notifications',
    { preHandler: authenticate },
    async (request) => {
      const user = request.user!;
      const page = Number(request.query.page || '1');
      const limit = Number(request.query.limit || '20');
      const offset = (page - 1) * limit;

      const conditions = [eq(notifications.userId, user.id)];
      if (user.companyId) {
        conditions.push(eq(notifications.companyId, user.companyId));
      }

      const [totalRow] = await db.select({ value: count() })
        .from(notifications)
        .where(and(...conditions));

      const list = await db.select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return { data: list, page, limit, total: Number(totalRow?.value || 0) };
    }
  );

  // Mark all notifications as read
  app.patch(
    '/notifications/read-all',
    { preHandler: authenticate },
    async (request) => {
      const user = request.user!;
      const conditions = [
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      ];
      if (user.companyId) {
        conditions.push(eq(notifications.companyId, user.companyId));
      }

      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(...conditions));

      return { success: true, message: 'Semua notifikasi ditandai sudah dibaca.' };
    }
  );

  // Mark a single notification as read
  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: authenticate },
    async (request, reply) => {
      const user = request.user!;
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

      const conditions = [
        eq(notifications.id, id),
        eq(notifications.userId, user.id)
      ];
      if (user.companyId) {
        conditions.push(eq(notifications.companyId, user.companyId));
      }

      const [updated] = await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(...conditions))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Notifikasi tidak ditemukan.' });
      }

      return { success: true, data: updated };
    }
  );
}
