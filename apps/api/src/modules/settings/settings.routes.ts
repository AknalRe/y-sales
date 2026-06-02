import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { appSettings, mediaFiles, userFaceTemplates, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { generalSettingsDefaults, generalSettingsKey, getGeneralSettings } from '../../utils/settings.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const faceIntegrationSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['mock', 'internal_python', 'custom_http', 'aws_rekognition', 'azure_face', 'google_vertex']).optional(),
  baseUrl: z.string().url().or(z.literal('')).optional(),
  apiKey: z.string().optional(),
  projectId: z.string().optional(),
  region: z.string().optional(),
  model: z.string().optional(),
  mode: z.enum(['verify', 'detect_and_verify']).optional(),
  timeoutMs: z.number().int().positive().max(60000).optional(),
});

function maskSecret(value?: string) {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function publicSettings<T extends { faceIntegration?: { apiKey?: string } }>(settings: T) {
  return {
    ...settings,
    faceIntegration: settings.faceIntegration ? { ...settings.faceIntegration, apiKey: maskSecret(settings.faceIntegration.apiKey) } : settings.faceIntegration,
  };
}

function mergeFaceIntegration(oldSettings: Awaited<ReturnType<typeof getGeneralSettings>>, patch: z.infer<typeof generalSettingsSchema>) {
  if (!patch.faceIntegration) return patch;
  const incoming = { ...patch.faceIntegration };
  const currentApiKey = oldSettings.faceIntegration.apiKey;
  if (!incoming.apiKey || incoming.apiKey.includes('...') || incoming.apiKey === '********') {
    incoming.apiKey = currentApiKey;
  }
  return {
    ...patch,
    faceIntegration: {
      ...oldSettings.faceIntegration,
      ...incoming,
    },
  };
}

const generalSettingsSchema = z.object({
  defaultGeofenceRadiusM: z.number().positive().optional(),
  maxGpsAccuracyM: z.number().positive().optional(),
  allowMultipleAttendanceSessionsPerDay: z.boolean().optional(),
  requireAttendanceAtOffice: z.boolean().optional(),
  requireFaceForAttendance: z.boolean().optional(),
  requireFaceForVisit: z.boolean().optional(),
  enableLiveFaceDetectionInCamera: z.boolean().optional(),
  requireTransactionProofPhoto: z.boolean().optional(),
  requireFaceIdentityMatchForVisit: z.boolean().optional(),
  faceMatchThreshold: z.number().min(0).max(1).optional(),
  requireLivenessForVisit: z.boolean().optional(),
  rejectVisitOnFaceMismatch: z.boolean().optional(),
  faceIntegration: faceIntegrationSchema.optional(),
});

const enrollFaceSchema = z.object({
  userId: z.string().uuid(),
  dataUrl: z.string().min(20).refine((value) => /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value), 'Foto wajah harus berupa image data URL.'),
  mimeType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']).default('image/jpeg'),
  sizeBytes: z.number().int().positive().max(4_000_000),
  embeddingRef: z.string().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings/mobile-runtime', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const companyId = requireTenantId(request);
    const settings = await getGeneralSettings(companyId);
    return {
      settings: {
        enableLiveFaceDetectionInCamera: settings.enableLiveFaceDetectionInCamera,
        requireFaceForAttendance: settings.requireFaceForAttendance,
        requireFaceForVisit: settings.requireFaceForVisit,
        requireFaceIdentityMatchForVisit: settings.requireFaceIdentityMatchForVisit,
        faceMatchThreshold: settings.faceMatchThreshold,
        faceProvider: settings.faceIntegration.enabled ? settings.faceIntegration.provider : 'mock',
      },
    };
  });

  app.get('/settings/general', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const settings = await getGeneralSettings(companyId);
    return { settings: publicSettings(settings), defaults: publicSettings(generalSettingsDefaults), scope: { companyId } };
  });

  app.put('/settings/general', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const oldSettings = await getGeneralSettings(companyId);
    const patch = mergeFaceIntegration(oldSettings, generalSettingsSchema.parse(request.body));
    const settings = { ...oldSettings, ...patch };
    const [setting] = await db.insert(appSettings).values({
      key: generalSettingsKey(companyId),
      value: settings,
      description: `General settings for company ${companyId}`,
      updatedByUserId: request.user?.id,
    }).onConflictDoUpdate({
      target: appSettings.key,
      set: { value: settings, updatedByUserId: request.user?.id, updatedAt: new Date() },
    }).returning();
    await writeAuditLog({ request, action: 'settings.general.updated', entityType: 'app_settings', entityId: setting.id, oldValues: oldSettings, newValues: settings });
    return { settings: publicSettings(settings), scope: { companyId } };
  });

  app.get('/settings/face-templates', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const templates = await db.select().from(userFaceTemplates).where(eq(userFaceTemplates.companyId, companyId)).orderBy(desc(userFaceTemplates.createdAt));
    return { templates };
  });

  app.post('/settings/face-templates', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = enrollFaceSchema.parse(request.body);
    const [user] = await db.select().from(users).where(and(eq(users.companyId, companyId), eq(users.id, body.userId), eq(users.status, 'active')));
    if (!user) throw Object.assign(new Error('User tidak ditemukan pada company ini.'), { statusCode: 404 });

    const template = await db.transaction(async (tx) => {
      const templateHash = crypto.createHash('sha256').update(body.dataUrl).digest('hex');
      const [media] = await tx.insert(mediaFiles).values({
        ownerType: 'face_template',
        ownerId: user.id,
        fileUrl: body.dataUrl,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        fileHash: templateHash,
        capturedAt: new Date(),
        uploadedByUserId: request.user?.id,
      }).returning();

      await tx.update(userFaceTemplates).set({ status: 'inactive', updatedAt: new Date() }).where(and(eq(userFaceTemplates.companyId, companyId), eq(userFaceTemplates.userId, user.id), eq(userFaceTemplates.status, 'active')));
      const [tmpl] = await tx.insert(userFaceTemplates).values({
        companyId,
        userId: user.id,
        roleId: user.roleId,
        mediaFileId: media.id,
        embeddingRef: body.embeddingRef,
        templateHash,
        status: 'active',
        createdByUserId: request.user?.id,
      }).returning();

      return tmpl;
    });
    await writeAuditLog({ request, action: 'settings.face_template.enrolled', entityType: 'user_face_template', entityId: template.id, newValues: template });
    return { template };
  });
}
