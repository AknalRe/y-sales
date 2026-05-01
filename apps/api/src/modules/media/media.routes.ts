import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { mediaFiles } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { createObjectKey, createUploadUrl, deleteObject, getPublicUrl } from './storage.service.js';

const ownerTypeSchema = z.enum(['user', 'outlet', 'transaction', 'attendance', 'visit', 'deposit', 'face_template']);

const uploadUrlSchema = z.object({
  ownerType: ownerTypeSchema,
  ownerId: z.string().uuid().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().min(3),
  sizeBytes: z.number().int().nonnegative().optional(),
});

const completeSchema = z.object({
  ownerType: ownerTypeSchema,
  ownerId: z.string().uuid().optional(),
  objectKey: z.string().min(5),
  fileUrl: z.string().url().optional(),
  mimeType: z.string().min(3),
  sizeBytes: z.number().int().nonnegative().default(0),
  fileHash: z.string().optional(),
  capturedAt: z.string().datetime().optional(),
});

function extractObjectKey(fileUrl: string) {
  const marker = '/yuksales-assets/';
  const idx = fileUrl.indexOf(marker);
  return idx >= 0 ? fileUrl.slice(idx + marker.length) : fileUrl;
}

export async function mediaRoutes(app: FastifyInstance) {
  app.post('/media/upload-url', { preHandler: requirePermission('media.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = uploadUrlSchema.parse(request.body);
    const objectKey = createObjectKey({ companyId, ownerType: body.ownerType, ownerId: body.ownerId, fileName: body.fileName, mimeType: body.mimeType });
    return await createUploadUrl({ objectKey, mimeType: body.mimeType });
  });

  app.post('/media/complete', { preHandler: requirePermission('media.manage') }, async (request, reply) => {
    requireTenantId(request);
    const body = completeSchema.parse(request.body);
    const [media] = await db.insert(mediaFiles).values({
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      fileUrl: body.fileUrl ?? getPublicUrl(body.objectKey),
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      fileHash: body.fileHash,
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
      uploadedByUserId: request.user?.id,
    }).returning();
    await writeAuditLog({ request, action: 'media.completed', entityType: 'media_file', entityId: media.id, newValues: media });
    return reply.status(201).send({ media });
  });

  app.get('/media/:id', { preHandler: requirePermission('media.manage') }, async (request) => {
    requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [media] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, params.id));
    if (!media) throw Object.assign(new Error('Media tidak ditemukan.'), { statusCode: 404 });
    return { media };
  });

  app.delete('/media/:id', { preHandler: requirePermission('media.manage') }, async (request) => {
    requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [media] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, params.id));
    if (!media) throw Object.assign(new Error('Media tidak ditemukan.'), { statusCode: 404 });
    await deleteObject(extractObjectKey(media.fileUrl));
    await db.delete(mediaFiles).where(and(eq(mediaFiles.id, params.id)));
    await writeAuditLog({ request, action: 'media.deleted', entityType: 'media_file', entityId: media.id, oldValues: media });
    return { success: true };
  });
}
