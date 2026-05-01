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
  provider: z.enum(['mock', 'custom_http', 'aws_rekognition', 'azure_face', 'google_vertex']).optional(),
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

const generalSettingsSchema = z.object({
  defaultGeofenceRadiusM: z.number().positive().optional(),
  maxGpsAccuracyM: z.number().positive().optional(),
  requireFaceForAttendance: z.boolean().optional(),
  requireFaceForVisit: z.boolean().optional(),
  requireFaceIdentityMatchForVisit: z.boolean().optional(),
  faceMatchThreshold: z.number().min(0).max(1).optional(),
  requireLivenessForVisit: z.boolean().optional(),
  rejectVisitOnFaceMismatch: z.boolean().optional(),
  faceIntegration: faceIntegrationSchema.optional(),
});

const enrollFaceSchema = z.object({
  userId: z.string().uuid(),
  dataUrl: z.string().min(20),
  mimeType: z.string().default('image/jpeg'),
  sizeBytes: z.number().int().nonnegative().default(0),
  embeddingRef: z.string().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings/general', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const settings = await getGeneralSettings(companyId);
    return { settings: publicSettings(settings), defaults: publicSettings(generalSettingsDefaults), scope: { companyId } };
  });

  app.put('/settings/general', { preHandler: requirePermission('settings.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const oldSettings = await getGeneralSettings(companyId);
    const patch = generalSettingsSchema.parse(request.body);
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

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'face_template',
      fileUrl: body.dataUrl,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      capturedAt: new Date(),
      uploadedByUserId: request.user?.id,
    }).returning();

    await db.update(userFaceTemplates).set({ status: 'inactive', updatedAt: new Date() }).where(and(eq(userFaceTemplates.companyId, companyId), eq(userFaceTemplates.userId, user.id), eq(userFaceTemplates.status, 'active')));
    const [template] = await db.insert(userFaceTemplates).values({
      companyId,
      userId: user.id,
      roleId: user.roleId,
      mediaFileId: media.id,
      embeddingRef: body.embeddingRef,
      templateHash: crypto.createHash('sha256').update(body.dataUrl).digest('hex'),
      status: 'active',
      createdByUserId: request.user?.id,
    }).returning();
    await writeAuditLog({ request, action: 'settings.face_template.enrolled', entityType: 'user_face_template', entityId: template.id, newValues: template });
    return { template };
  });
}
