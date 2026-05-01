import { and, desc, eq } from 'drizzle-orm';
import { faceCaptures, userFaceTemplates, users } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import type { GeneralSettings } from '../../utils/settings.js';

type VerifyFaceIdentityInput = {
  companyId: string;
  userId: string;
  faceCaptureId: string;
  faceDetected: boolean;
  faceConfidence?: number;
  settings: GeneralSettings;
};

export async function verifyFaceIdentity(input: VerifyFaceIdentityInput) {
  const [user] = await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.companyId, input.companyId), eq(users.status, 'active')));
  if (!user) {
    return { status: 'not_matched' as const, confidence: 0, livenessStatus: 'manual_review' as const, reason: 'USER_NOT_FOUND_IN_COMPANY' };
  }

  const [template] = await db.select().from(userFaceTemplates).where(and(
    eq(userFaceTemplates.companyId, input.companyId),
    eq(userFaceTemplates.userId, user.id),
    eq(userFaceTemplates.roleId, user.roleId),
    eq(userFaceTemplates.status, 'active'),
  )).orderBy(desc(userFaceTemplates.createdAt)).limit(1);

  if (!template) {
    return { status: 'manual_review' as const, confidence: input.faceConfidence ?? 0, livenessStatus: 'manual_review' as const, reason: 'ACTIVE_FACE_TEMPLATE_NOT_FOUND' };
  }

  if (!input.faceDetected) {
    await db.update(faceCaptures).set({ identityMatchStatus: 'not_matched', identityConfidence: '0', livenessStatus: 'manual_review' }).where(eq(faceCaptures.id, input.faceCaptureId));
    return { status: 'not_matched' as const, confidence: 0, livenessStatus: 'manual_review' as const, reason: 'FACE_NOT_DETECTED' };
  }

  // Placeholder adapter sampai biometric engine asli dihubungkan.
  // Policy sementara: gunakan faceConfidence sebagai confidence identity.
  const confidence = input.faceConfidence ?? 0;
  const matched = confidence >= input.settings.faceMatchThreshold;
  const status = matched ? 'matched' : 'not_matched';
  const livenessStatus = input.settings.requireLivenessForVisit ? 'manual_review' : 'not_checked';

  await db.update(faceCaptures).set({
    identityMatchStatus: status,
    identityConfidence: confidence.toString(),
    livenessStatus,
  }).where(eq(faceCaptures.id, input.faceCaptureId));

  return {
    status,
    confidence,
    livenessStatus,
    reason: matched ? 'MATCHED_BY_CONFIGURED_THRESHOLD' : 'BELOW_CONFIGURED_THRESHOLD',
    templateId: template.id,
  };
}
