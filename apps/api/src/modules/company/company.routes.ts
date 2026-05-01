import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { companies } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const companyProfileSchema = z.object({
  name: z.string().min(2).optional(),
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  coverPhotoUrl: z.string().url().or(z.literal('')).optional(),
  taxNumber: z.string().optional(),
  websiteUrl: z.string().url().or(z.literal('')).optional(),
  timezone: z.string().optional(),
});

function toCompanyUpdate(body: z.infer<typeof companyProfileSchema>) {
  return {
    ...body,
    latitude: body.latitude !== undefined ? String(body.latitude) : undefined,
    longitude: body.longitude !== undefined ? String(body.longitude) : undefined,
    updatedAt: new Date(),
  };
}

export async function companyRoutes(app: FastifyInstance) {
  app.get('/company/profile', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    return { company: company ?? null };
  });

  app.put('/company/profile', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = companyProfileSchema.parse(request.body);
    const [oldCompany] = await db.select().from(companies).where(eq(companies.id, companyId));
    const [company] = await db.update(companies).set(toCompanyUpdate(body)).where(eq(companies.id, companyId)).returning();
    await writeAuditLog({ request, action: 'company.profile.updated', entityType: 'company', entityId: companyId, oldValues: oldCompany, newValues: company });
    return { company };
  });
}
