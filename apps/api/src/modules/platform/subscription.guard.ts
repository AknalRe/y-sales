import type { FastifyRequest, FastifyReply } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { tenantSubscriptions } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import type { AuthUser } from '../auth/auth.service.js';

/**
 * Global hook: validates tenant subscription status.
 * Super Admin is always bypassed.
 * Only blocks if status is: suspended, cancelled, or expired.
 */
export async function requireActiveSubscription(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as AuthUser | undefined;

  // Super Admin is never blocked
  if (!user || user.isSuperAdmin) return;

  // No companyId = not a tenant context (skip)
  if (!user.companyId) return;

  const [sub] = await db
    .select({ status: tenantSubscriptions.status, suspendReason: tenantSubscriptions.suspendReason })
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.companyId, user.companyId))
    .orderBy(desc(tenantSubscriptions.createdAt))
    .limit(1);

  // If no subscription found, allow (fresh company, subscription not yet set)
  if (!sub) return;

  if (sub.status === 'suspended') {
    return reply.status(403).send({
      message: 'Akun perusahaan Anda sedang disuspend.',
      reason: sub.suspendReason ?? undefined,
      code: 'SUBSCRIPTION_SUSPENDED',
    });
  }

  if (sub.status === 'cancelled') {
    return reply.status(403).send({
      message: 'Langganan perusahaan Anda telah dibatalkan. Hubungi admin YukSales untuk mengaktifkan kembali.',
      code: 'SUBSCRIPTION_CANCELLED',
    });
  }

  if (sub.status === 'expired') {
    return reply.status(402).send({
      message: 'Langganan Anda telah berakhir. Silakan perpanjang untuk melanjutkan.',
      code: 'SUBSCRIPTION_EXPIRED',
    });
  }
}
