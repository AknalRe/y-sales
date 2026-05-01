import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { companyIntegrations } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const integrationSchema = z.object({
  type: z.enum(['storage', 'face_recognition', 'payment', 'notification']),
  provider: z.enum(['cloudflare_r2', 's3', 'custom_http', 'aws_rekognition', 'azure_face', 'google_vertex', 'mock']),
  name: z.string().min(2),
  status: z.enum(['active', 'inactive']).default('inactive'),
  config: z.record(z.string(), z.unknown()).default({}),
  secretConfig: z.record(z.string(), z.unknown()).default({}),
  description: z.string().optional(),
});

const patchIntegrationSchema = integrationSchema.partial();

function maskSecretValue(value: unknown): unknown {
  if (typeof value !== 'string') return value ? '********' : value;
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function publicIntegration<T extends { secretConfig?: unknown }>(integration: T) {
  const secretConfig = integration.secretConfig && typeof integration.secretConfig === 'object' && !Array.isArray(integration.secretConfig)
    ? Object.fromEntries(Object.entries(integration.secretConfig as Record<string, unknown>).map(([key, value]) => [key, maskSecretValue(value)]))
    : integration.secretConfig;
  return { ...integration, secretConfig };
}

export async function integrationRoutes(app: FastifyInstance) {
  app.get('/integrations', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ type: z.enum(['storage', 'face_recognition', 'payment', 'notification']).optional() }).parse(request.query);
    const rows = await db.select().from(companyIntegrations).where(eq(companyIntegrations.companyId, companyId)).orderBy(desc(companyIntegrations.createdAt));
    return { integrations: rows.filter((row) => !query.type || row.type === query.type).map(publicIntegration) };
  });

  app.get('/integrations/:id', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [integration] = await db.select().from(companyIntegrations).where(and(eq(companyIntegrations.companyId, companyId), eq(companyIntegrations.id, params.id)));
    if (!integration) throw Object.assign(new Error('Integrasi tidak ditemukan.'), { statusCode: 404 });
    return { integration: publicIntegration(integration) };
  });

  app.post('/integrations', { preHandler: requirePermission('settings.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = integrationSchema.parse(request.body);
    const [integration] = await db.insert(companyIntegrations).values({
      companyId,
      ...body,
      updatedByUserId: request.user?.id,
    }).onConflictDoUpdate({
      target: [companyIntegrations.companyId, companyIntegrations.type, companyIntegrations.provider],
      set: { ...body, updatedByUserId: request.user?.id, updatedAt: new Date() },
    }).returning();
    await writeAuditLog({ request, action: 'integration.upserted', entityType: 'company_integration', entityId: integration.id, newValues: publicIntegration(integration) });
    return reply.status(201).send({ integration: publicIntegration(integration) });
  });

  app.patch('/integrations/:id', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchIntegrationSchema.parse(request.body);
    const [oldIntegration] = await db.select().from(companyIntegrations).where(and(eq(companyIntegrations.companyId, companyId), eq(companyIntegrations.id, params.id)));
    if (!oldIntegration) throw Object.assign(new Error('Integrasi tidak ditemukan.'), { statusCode: 404 });
    const [integration] = await db.update(companyIntegrations).set({ ...body, updatedByUserId: request.user?.id, updatedAt: new Date() }).where(eq(companyIntegrations.id, params.id)).returning();
    await writeAuditLog({ request, action: 'integration.updated', entityType: 'company_integration', entityId: integration.id, oldValues: publicIntegration(oldIntegration), newValues: publicIntegration(integration) });
    return { integration: publicIntegration(integration) };
  });

  app.delete('/integrations/:id', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [oldIntegration] = await db.select().from(companyIntegrations).where(and(eq(companyIntegrations.companyId, companyId), eq(companyIntegrations.id, params.id)));
    if (!oldIntegration) throw Object.assign(new Error('Integrasi tidak ditemukan.'), { statusCode: 404 });
    const [integration] = await db.update(companyIntegrations).set({ status: 'inactive', updatedByUserId: request.user?.id, updatedAt: new Date() }).where(eq(companyIntegrations.id, params.id)).returning();
    await writeAuditLog({ request, action: 'integration.disabled', entityType: 'company_integration', entityId: integration.id, oldValues: publicIntegration(oldIntegration), newValues: publicIntegration(integration) });
    return { integration: publicIntegration(integration) };
  });
}
