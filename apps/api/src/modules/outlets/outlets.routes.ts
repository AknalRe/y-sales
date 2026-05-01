import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { mediaFiles, outletPhotos, outlets } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const outletSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  customerType: z.enum(['store', 'agent']).default('store'),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().min(3),
  latitude: z.number(),
  longitude: z.number(),
  geofenceRadiusM: z.number().int().positive().optional(),
  status: z.enum(['draft', 'pending_verification', 'active', 'rejected', 'inactive']).optional(),
});

const outletPatchSchema = outletSchema.partial();

const outletPhotoSchema = z.object({
  dataUrl: z.string().min(20),
  mimeType: z.string().default('image/jpeg'),
  sizeBytes: z.number().int().nonnegative().default(0),
  capturedAt: z.string().datetime().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  source: z.string().default('camera'),
});

const rejectSchema = z.object({
  reason: z.string().min(3),
});

function toOutletValues(body: z.infer<typeof outletPatchSchema>) {
  return {
    ...body,
    latitude: body.latitude !== undefined ? String(body.latitude) : undefined,
    longitude: body.longitude !== undefined ? String(body.longitude) : undefined,
    updatedAt: new Date(),
  };
}

export async function outletRoutes(app: FastifyInstance) {
  app.get('/outlets', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = z.object({ status: z.string().optional(), q: z.string().optional() }).parse(request.query);
    const rows = await db.select().from(outlets).where(eq(outlets.companyId, companyId)).orderBy(desc(outlets.createdAt));
    const filtered = rows.filter((row) => {
      if (query.status && row.status !== query.status) return false;
      if (query.q && !`${row.code} ${row.name} ${row.address} ${row.phone ?? ''}`.toLowerCase().includes(query.q.toLowerCase())) return false;
      return !row.deletedAt;
    });
    return { outlets: filtered };
  });

  app.post('/outlets', { preHandler: requirePermission('outlets.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = outletSchema.parse(request.body);
    const [outlet] = await db.insert(outlets).values({
      companyId,
      code: body.code,
      name: body.name,
      customerType: body.customerType,
      ownerName: body.ownerName,
      phone: body.phone,
      address: body.address,
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      geofenceRadiusM: body.geofenceRadiusM,
      status: body.status ?? 'pending_verification',
      registeredByUserId: request.user?.id,
    }).returning();
    await writeAuditLog({ request, action: 'outlet.created', entityType: 'outlet', entityId: outlet.id, newValues: outlet });
    return reply.status(201).send({ outlet });
  });

  app.get('/outlets/:id', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [outlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!outlet || outlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const photos = await db.select().from(outletPhotos).where(and(eq(outletPhotos.companyId, companyId), eq(outletPhotos.outletId, outlet.id))).orderBy(desc(outletPhotos.createdAt));
    return { outlet, photos };
  });

  app.patch('/outlets/:id', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = outletPatchSchema.parse(request.body);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set(toOutletValues(body)).where(eq(outlets.id, params.id)).returning();
    await writeAuditLog({ request, action: 'outlet.updated', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });

  app.delete('/outlets/:id', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set({ status: 'inactive', deletedAt: new Date(), updatedAt: new Date() }).where(eq(outlets.id, params.id)).returning();
    await writeAuditLog({ request, action: 'outlet.deleted', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });

  app.post('/outlets/:id/photos', { preHandler: requirePermission('outlets.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = outletPhotoSchema.parse(request.body);
    const [outlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!outlet || outlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const result = await db.transaction(async (tx) => {
      const [media] = await tx.insert(mediaFiles).values({
        ownerType: 'outlet',
        ownerId: outlet.id,
        fileUrl: body.dataUrl,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
        uploadedByUserId: request.user?.id,
      }).returning();
      const [photo] = await tx.insert(outletPhotos).values({
        companyId,
        outletId: outlet.id,
        mediaFileId: media.id,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
        latitude: body.latitude !== undefined ? String(body.latitude) : undefined,
        longitude: body.longitude !== undefined ? String(body.longitude) : undefined,
        capturedByUserId: request.user?.id,
        source: body.source,
      }).returning();
      return { media, photo };
    });
    await writeAuditLog({ request, action: 'outlet.photo.created', entityType: 'outlet', entityId: outlet.id, newValues: result });
    return reply.status(201).send(result);
  });

  app.post('/outlets/:id/verify', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set({ status: 'active', verifiedByUserId: request.user?.id, verifiedAt: new Date(), rejectionReason: null, updatedAt: new Date() }).where(eq(outlets.id, params.id)).returning();
    await writeAuditLog({ request, action: 'outlet.verified', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });

  app.post('/outlets/:id/reject', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = rejectSchema.parse(request.body);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set({ status: 'rejected', rejectionReason: body.reason, updatedAt: new Date() }).where(eq(outlets.id, params.id)).returning();
    await writeAuditLog({ request, action: 'outlet.rejected', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });
}
