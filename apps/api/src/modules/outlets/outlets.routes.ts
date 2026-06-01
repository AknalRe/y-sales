import type { FastifyInstance } from 'fastify';
import { and, desc, eq, ilike, isNull, ne, or } from 'drizzle-orm';
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

const outletQuerySchema = z.object({
  status: z.enum(['draft', 'pending_verification', 'active', 'rejected', 'inactive']).optional(),
  q: z.string().trim().max(120).optional(),
});

const reverseGeocodeQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

function toOutletValues(body: z.infer<typeof outletPatchSchema>) {
  return {
    ...body,
    latitude: body.latitude !== undefined ? String(body.latitude) : undefined,
    longitude: body.longitude !== undefined ? String(body.longitude) : undefined,
    updatedAt: new Date(),
  };
}

function canApproveOutletRole(user: { isSuperAdmin: boolean; roleCode: string }) {
  return user.isSuperAdmin || ['ADMINISTRATOR', 'OWNER', 'OPERATIONAL_MANAGER'].includes(user.roleCode);
}

export async function outletRoutes(app: FastifyInstance) {
  app.get('/outlets', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const query = outletQuerySchema.parse(request.query);
    const conditions = [eq(outlets.companyId, companyId), isNull(outlets.deletedAt)];
    if (query.status) conditions.push(eq(outlets.status, query.status));
    if (query.q) {
      const pattern = `%${query.q}%`;
      conditions.push(or(
        ilike(outlets.code, pattern),
        ilike(outlets.name, pattern),
        ilike(outlets.address, pattern),
        ilike(outlets.ownerName, pattern),
        ilike(outlets.phone, pattern),
      )!);
    }
    const rows = await db.select().from(outlets).where(and(...conditions)).orderBy(desc(outlets.createdAt));
    return { outlets: rows };
  });

  app.get('/outlets/geocode/reverse', { preHandler: requirePermission('outlets.manage') }, async (request, reply) => {
    const query = reverseGeocodeQuerySchema.parse(request.query);
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(query.latitude));
    url.searchParams.set('lon', String(query.longitude));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YukSales/0.1 outlet-address-sync',
          Accept: 'application/json',
        },
      });
      if (!response.ok) return reply.status(502).send({ message: 'Gagal mengambil alamat dari layanan maps.' });
      const data = await response.json() as { display_name?: string };
      return { address: data.display_name ?? null };
    } catch {
      return reply.status(502).send({ message: 'Layanan alamat maps tidak dapat diakses.' });
    }
  });

  app.post('/outlets', { preHandler: requirePermission('outlets.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = outletSchema.parse(request.body);
    const canSetStatus = canApproveOutletRole(request.user!);
    const code = body.code.trim().toUpperCase();
    const [duplicate] = await db.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.code, code), isNull(outlets.deletedAt)));
    if (duplicate) return reply.status(409).send({ message: 'Kode outlet sudah digunakan di company ini.' });
    const [outlet] = await db.insert(outlets).values({
      companyId,
      code,
      name: body.name.trim(),
      customerType: body.customerType,
      ownerName: body.ownerName?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      address: body.address.trim(),
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      geofenceRadiusM: body.geofenceRadiusM,
      status: canSetStatus ? (body.status ?? 'pending_verification') : 'pending_verification',
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
    if (body.status !== undefined && !canApproveOutletRole(request.user!)) {
      throw Object.assign(new Error('Status outlet hanya bisa diubah oleh Administrator, Owner, atau Operational Manager.'), { statusCode: 403 });
    }
    if (body.code) {
      const code = body.code.trim().toUpperCase();
      const [duplicate] = await db.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.code, code), ne(outlets.id, params.id), isNull(outlets.deletedAt)));
      if (duplicate) throw Object.assign(new Error('Kode outlet sudah digunakan di company ini.'), { statusCode: 409 });
      body.code = code;
    }
    if (body.name) body.name = body.name.trim();
    if (body.address) body.address = body.address.trim();
    if (body.ownerName) body.ownerName = body.ownerName.trim();
    if (body.phone) body.phone = body.phone.trim();
    const [outlet] = await db.update(outlets).set(toOutletValues(body)).where(and(eq(outlets.id, params.id), eq(outlets.companyId, companyId))).returning();
    await writeAuditLog({ request, action: 'outlet.updated', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });

  app.delete('/outlets/:id', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set({ status: 'inactive', deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(outlets.id, params.id), eq(outlets.companyId, companyId))).returning();
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

  app.post('/outlets/:id/verify', { preHandler: requirePermission('outlets.verify') }, async (request) => {
    const companyId = requireTenantId(request);
    if (!canApproveOutletRole(request.user!)) {
      throw Object.assign(new Error('Verifikasi outlet hanya bisa dilakukan oleh Administrator, Owner, atau Operational Manager.'), { statusCode: 403 });
    }
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set({ status: 'active', verifiedByUserId: request.user?.id, verifiedAt: new Date(), rejectionReason: null, updatedAt: new Date() }).where(and(eq(outlets.id, params.id), eq(outlets.companyId, companyId))).returning();
    await writeAuditLog({ request, action: 'outlet.verified', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });

  app.post('/outlets/:id/reject', { preHandler: requirePermission('outlets.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    if (!canApproveOutletRole(request.user!)) {
      throw Object.assign(new Error('Reject outlet hanya bisa dilakukan oleh Administrator, Owner, atau Operational Manager.'), { statusCode: 403 });
    }
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = rejectSchema.parse(request.body);
    const [oldOutlet] = await db.select().from(outlets).where(and(eq(outlets.companyId, companyId), eq(outlets.id, params.id)));
    if (!oldOutlet || oldOutlet.deletedAt) throw Object.assign(new Error('Outlet tidak ditemukan.'), { statusCode: 404 });
    const [outlet] = await db.update(outlets).set({ status: 'rejected', rejectionReason: body.reason, updatedAt: new Date() }).where(and(eq(outlets.id, params.id), eq(outlets.companyId, companyId))).returning();
    await writeAuditLog({ request, action: 'outlet.rejected', entityType: 'outlet', entityId: outlet.id, oldValues: oldOutlet, newValues: outlet });
    return { outlet };
  });
}
