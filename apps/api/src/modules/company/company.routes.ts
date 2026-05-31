import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { companies } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const nullableString = z.preprocess((value) => value === '' ? null : value, z.string().nullable().optional());
const nullableEmail = z.preprocess((value) => value === '' ? null : value, z.string().email().nullable().optional());
const nullableUrl = z.preprocess((value) => value === '' ? null : value, z.string().url().nullable().optional());
const nullableCompanyCode = z.preprocess(
  (value) => typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  z.string().regex(/^[A-Z0-9_-]{2,32}$/, 'Kode perusahaan harus 2-32 karakter: huruf kapital, angka, underscore, atau dash.').nullable().optional()
);

const companyProfileSchema = z.object({
  name: z.string().min(2).optional(),
  code: nullableCompanyCode,
  legalName: nullableString,
  email: nullableEmail,
  phone: nullableString,
  address: nullableString,
  city: nullableString,
  province: nullableString,
  postalCode: nullableString,
  country: nullableString,
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  logoUrl: nullableUrl,
  coverPhotoUrl: nullableUrl,
  taxNumber: nullableString,
  websiteUrl: nullableUrl,
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
    const [existing] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!existing) throw Object.assign(new Error('Company tidak ditemukan.'), { statusCode: 404 });
    if (body.code) {
      const [duplicate] = await db.select({ id: companies.id }).from(companies).where(eq(companies.code, body.code));
      if (duplicate && duplicate.id !== companyId) {
        throw Object.assign(new Error('Kode perusahaan sudah digunakan company lain.'), { statusCode: 409 });
      }
    }
    const [company] = await db.update(companies).set(toCompanyUpdate(body)).where(eq(companies.id, companyId)).returning();
    await writeAuditLog({ request, action: 'company.profile.updated', entityType: 'company', entityId: companyId, oldValues: existing, newValues: company });
    return { company };
  });
}
