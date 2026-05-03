import type { FastifyRequest, FastifyReply } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { tenantSubscriptions } from '@yuksales/db/schema';
import { db } from '../plugins/db.js';
import type { AuthUser } from './auth/auth.service.js';
import type { PlanFeatureKey, PlanLimitKey } from './subscription-catalog.js';

/**
 * Returns the company ID for the current request.
 * - Regular tenant users: from JWT companyId.
 * - Super Admin: from X-Company-Id header (to act on behalf of a tenant).
 */
export function requireTenantId(request: FastifyRequest) {
  const user = request.user as AuthUser | undefined;

  // Super Admin can pass X-Company-Id to act on a specific tenant
  const overrideCompanyId = request.headers['x-company-id'] as string | undefined;
  if (user?.isSuperAdmin && overrideCompanyId) return overrideCompanyId;

  const companyId = user?.companyId;
  if (!companyId) {
    throw Object.assign(new Error('Tenant context tidak ditemukan.'), { statusCode: 401 });
  }

  return companyId;
}

/**
 * Middleware: only allows Super Admin (isSuperAdmin = true).
 */
export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.user as AuthUser | undefined;
  if (!user?.isSuperAdmin) {
    await reply.status(403).send({ message: 'Hanya Super Admin platform yang dapat mengakses endpoint ini.' });
  }
}

export async function getActiveTenantSubscription(companyId: string) {
  const [subscription] = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.companyId, companyId))
    .orderBy(desc(tenantSubscriptions.createdAt))
    .limit(1);

  return subscription ?? null;
}

export async function requireFeature(request: FastifyRequest, feature: PlanFeatureKey) {
  const companyId = requireTenantId(request);
  const subscription = await getActiveTenantSubscription(companyId);

  if (!subscription || ['suspended', 'cancelled', 'expired'].includes(subscription.status)) {
    throw Object.assign(new Error('Subscription tenant tidak aktif.'), { statusCode: 402 });
  }

  const features = Array.isArray(subscription.featuresSnapshot) ? subscription.featuresSnapshot : [];
  if (!features.includes(feature)) {
    throw Object.assign(new Error(`Fitur ${feature} tidak tersedia pada plan tenant ini.`), { statusCode: 403 });
  }

  return subscription;
}

export async function requireLimit(
  request: FastifyRequest,
  limit: PlanLimitKey,
  currentUsage: number,
  increment = 1,
) {
  const companyId = requireTenantId(request);
  const subscription = await getActiveTenantSubscription(companyId);

  if (!subscription || ['suspended', 'cancelled', 'expired'].includes(subscription.status)) {
    throw Object.assign(new Error('Subscription tenant tidak aktif.'), { statusCode: 402 });
  }

  const limits = (subscription.limitsSnapshot ?? {}) as Partial<Record<PlanLimitKey, number>>;
  const max = limits[limit];

  if (typeof max === 'number' && max > 0 && currentUsage + increment > max) {
    throw Object.assign(new Error(`Limit ${limit} pada plan tenant sudah tercapai.`), { statusCode: 402 });
  }

  return subscription;
}
