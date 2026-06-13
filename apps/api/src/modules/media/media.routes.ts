import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { mediaFiles, salesTransactions, transactionNotePhotos, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { authenticate, requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';
import { createObjectKey, createUploadUrl, deleteObject, getPublicUrl, getStorageConfig } from './storage.service.js';

const ownerTypeSchema = z.enum(['user', 'outlet', 'transaction', 'attendance', 'visit', 'deposit', 'face_template', 'product']);

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

async function getTenantMedia(companyId: string, mediaId: string) {
  const [row] = await db
    .select({ media: mediaFiles })
    .from(mediaFiles)
    .leftJoin(users, eq(mediaFiles.uploadedByUserId, users.id))
    .where(and(eq(mediaFiles.id, mediaId), eq(users.companyId, companyId)))
    .limit(1);

  return row?.media ?? null;
}

async function assertCanCreateMedia(request: FastifyRequest, companyId: string, ownerType: z.infer<typeof ownerTypeSchema>, ownerId?: string) {
  const user = request.user!;
  if (user.isSuperAdmin || user.roleCode === 'ADMINISTRATOR' || user.permissions.includes('media.manage')) return null;
  if (ownerType === 'product' && user.permissions.includes('products.manage')) return null;

  if (ownerType === 'transaction' && ownerId && user.permissions.includes('sales.order.create')) {
    const [transaction] = await db.select().from(salesTransactions).where(and(
      eq(salesTransactions.companyId, companyId),
      eq(salesTransactions.id, ownerId),
      eq(salesTransactions.salesUserId, user.id),
    ));
    if (transaction) {
      if (transaction.status !== 'pending_approval') {
        throw Object.assign(new Error('Bukti transaksi hanya bisa diunggah saat transaksi menunggu approval.'), { statusCode: 400 });
      }
      return transaction;
    }
  }

  throw Object.assign(new Error('Tidak punya akses untuk mengunggah media ini.'), { statusCode: 403 });
}

async function getTransactionForMedia(companyId: string, ownerId?: string) {
  if (!ownerId) throw Object.assign(new Error('Transaksi wajib dipilih untuk upload bukti transaksi.'), { statusCode: 400 });
  const [transaction] = await db.select().from(salesTransactions).where(and(
    eq(salesTransactions.companyId, companyId),
    eq(salesTransactions.id, ownerId),
  ));
  if (!transaction) throw Object.assign(new Error('Transaksi tidak ditemukan untuk company ini.'), { statusCode: 404 });
  return transaction;
}

export async function mediaRoutes(app: FastifyInstance) {
  app.post('/media/upload-url', { preHandler: authenticate }, async (request) => {
    const companyId = requireTenantId(request);
    const body = uploadUrlSchema.parse(request.body);
    if (body.ownerType === 'transaction') await getTransactionForMedia(companyId, body.ownerId);
    await assertCanCreateMedia(request, companyId, body.ownerType, body.ownerId);
    const objectKey = createObjectKey({ companyId, ownerType: body.ownerType, ownerId: body.ownerId, fileName: body.fileName, mimeType: body.mimeType });
    return await createUploadUrl({ companyId, objectKey, mimeType: body.mimeType });
  });

  app.post('/media/complete', { preHandler: authenticate }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const body = completeSchema.parse(request.body);
    const transaction = body.ownerType === 'transaction' ? await getTransactionForMedia(companyId, body.ownerId) : null;
    await assertCanCreateMedia(request, companyId, body.ownerType, body.ownerId);

    const media = await db.transaction(async (tx) => {
      const [med] = await tx.insert(mediaFiles).values({
        ownerType: body.ownerType,
        ownerId: body.ownerId,
        fileUrl: body.fileUrl ?? getPublicUrl(body.objectKey, await getStorageConfig(companyId)),
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        fileHash: body.fileHash,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
        uploadedByUserId: request.user?.id,
      }).returning();

      if (body.ownerType === 'transaction' && transaction) {
        await tx.insert(transactionNotePhotos).values({
          companyId,
          transactionId: transaction.id,
          mediaFileId: med.id,
          capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
          capturedByUserId: request.user?.id,
        });
      }

      return med;
    });

    try {
      await writeAuditLog({ request, action: 'media.completed', entityType: 'media_file', entityId: media.id, newValues: media });
    } catch (err) {
      console.error('[AuditLog] Failed to write media upload completion audit log:', err);
    }
    return reply.status(201).send({ media });
  });

  app.get('/media/:id', { preHandler: requirePermission('media.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const media = await getTenantMedia(companyId, params.id);
    if (!media) throw Object.assign(new Error('Media tidak ditemukan.'), { statusCode: 404 });
    return { media };
  });

  app.delete('/media/:id', { preHandler: requirePermission('media.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const media = await getTenantMedia(companyId, params.id);
    if (!media) throw Object.assign(new Error('Media tidak ditemukan.'), { statusCode: 404 });
    await deleteObject(extractObjectKey(media.fileUrl), companyId);
    await db.delete(mediaFiles).where(eq(mediaFiles.id, params.id));
    try {
      await writeAuditLog({ request, action: 'media.deleted', entityType: 'media_file', entityId: media.id, oldValues: media });
    } catch (err) {
      console.error('[AuditLog] Failed to write media deletion audit log:', err);
    }
    return { success: true };
  });
}
