import { and, desc, eq } from 'drizzle-orm';
import { faceCaptures, mediaFiles, userFaceTemplates, users } from '@yuksales/db/schema';
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

type ProviderResult = {
  matched: boolean;
  confidence: number;
  livenessStatus?: 'not_checked' | 'passed' | 'failed' | 'manual_review';
  reason?: string;
};

type ProviderInput = VerifyFaceIdentityInput & {
  referenceImageUrl: string;
  capturedImageUrl: string;
};

async function postJson(url: string, input: ProviderInput, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const integration = input.settings.faceIntegration;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), integration.timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`FACE_PROVIDER_HTTP_${response.status}`);
    return await response.json() as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeResult(result: Partial<ProviderResult>, fallbackReason: string): ProviderResult {
  if (typeof result.matched !== 'boolean' || typeof result.confidence !== 'number') {
    throw new Error('FACE_PROVIDER_INVALID_RESPONSE');
  }
  return {
    matched: result.matched,
    confidence: result.confidence,
    livenessStatus: result.livenessStatus === 'passed' || result.livenessStatus === 'failed' || result.livenessStatus === 'manual_review' || result.livenessStatus === 'not_checked' ? result.livenessStatus : 'not_checked',
    reason: result.reason ?? fallbackReason,
  };
}

async function callCustomHttpProvider(input: ProviderInput): Promise<ProviderResult> {
  const integration = input.settings.faceIntegration;
  if (!integration.baseUrl) throw new Error('FACE_PROVIDER_BASE_URL_REQUIRED');
  const result = await postJson(input.settings.faceIntegration.baseUrl, input, {
    provider: integration.provider,
    mode: integration.mode,
    referenceImageUrl: input.referenceImageUrl,
    capturedImageUrl: input.capturedImageUrl,
    threshold: input.settings.faceMatchThreshold,
    requireLiveness: input.settings.requireLivenessForVisit,
  }, integration.apiKey ? { authorization: `Bearer ${integration.apiKey}` } : {});
  return normalizeResult(result as Partial<ProviderResult>, 'CUSTOM_HTTP_PROVIDER');
}

async function callAzureFaceProvider(input: ProviderInput): Promise<ProviderResult> {
  const integration = input.settings.faceIntegration;
  if (!integration.baseUrl || !integration.apiKey) throw new Error('AZURE_FACE_BASE_URL_AND_API_KEY_REQUIRED');
  const verifyUrl = `${integration.baseUrl.replace(/\/$/, '')}/face/v1.0/verify`;
  const result = await postJson(verifyUrl, input, {
    referenceImageUrl: input.referenceImageUrl,
    capturedImageUrl: input.capturedImageUrl,
    threshold: input.settings.faceMatchThreshold,
    mode: integration.mode,
  }, { 'Ocp-Apim-Subscription-Key': integration.apiKey });

  const confidence = typeof result.confidence === 'number' ? result.confidence : 0;
  return {
    matched: typeof result.isIdentical === 'boolean' ? result.isIdentical : confidence >= input.settings.faceMatchThreshold,
    confidence,
    livenessStatus: 'not_checked' as const,
    reason: 'AZURE_FACE_API',
  };
}

async function callGoogleVertexProvider(input: ProviderInput): Promise<ProviderResult> {
  const integration = input.settings.faceIntegration;
  if (!integration.baseUrl || !integration.apiKey) throw new Error('GOOGLE_VERTEX_ENDPOINT_AND_TOKEN_REQUIRED');
  const result = await postJson(integration.baseUrl, input, {
    instances: [{
      referenceImageUrl: input.referenceImageUrl,
      capturedImageUrl: input.capturedImageUrl,
      threshold: input.settings.faceMatchThreshold,
      model: integration.model,
      projectId: integration.projectId,
      region: integration.region,
    }],
  }, { authorization: `Bearer ${integration.apiKey}` });

  const prediction = Array.isArray(result.predictions) ? result.predictions[0] as Record<string, unknown> | undefined : result;
  const confidence = typeof prediction?.confidence === 'number' ? prediction.confidence : 0;
  return {
    matched: typeof prediction?.matched === 'boolean' ? prediction.matched : confidence >= input.settings.faceMatchThreshold,
    confidence,
    livenessStatus: prediction?.livenessStatus === 'passed' || prediction?.livenessStatus === 'failed' || prediction?.livenessStatus === 'manual_review' ? prediction.livenessStatus as 'passed' | 'failed' | 'manual_review' : 'not_checked',
    reason: 'GOOGLE_VERTEX_ENDPOINT',
  };
}

async function callAwsRekognitionProvider(input: ProviderInput): Promise<ProviderResult> {
  const integration = input.settings.faceIntegration;
  if (!integration.baseUrl || !integration.apiKey) throw new Error('AWS_REKOGNITION_PROXY_REQUIRED');
  const result = await postJson(integration.baseUrl, input, {
    action: 'CompareFaces',
    sourceImageUrl: input.referenceImageUrl,
    targetImageUrl: input.capturedImageUrl,
    similarityThreshold: input.settings.faceMatchThreshold * 100,
    region: integration.region,
  }, { authorization: `Bearer ${integration.apiKey}` });

  const similarity = typeof result.similarity === 'number' ? result.similarity : 0;
  const confidence = similarity > 1 ? similarity / 100 : similarity;
  return {
    matched: typeof result.matched === 'boolean' ? result.matched : confidence >= input.settings.faceMatchThreshold,
    confidence,
    livenessStatus: 'not_checked' as const,
    reason: 'AWS_REKOGNITION_COMPATIBLE_API',
  };
}

async function callConfiguredProvider(input: ProviderInput): Promise<ProviderResult | null> {
  const integration = input.settings.faceIntegration;
  if (!integration.enabled || integration.provider === 'mock') return null;

  if (integration.provider === 'custom_http') return callCustomHttpProvider(input);
  if (integration.provider === 'azure_face') return callAzureFaceProvider(input);
  if (integration.provider === 'google_vertex') return callGoogleVertexProvider(input);
  if (integration.provider === 'aws_rekognition') return callAwsRekognitionProvider(input);

  return null;
}

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

  const [templateMedia] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, template.mediaFileId));
  const [capturedFace] = await db.select().from(faceCaptures).where(eq(faceCaptures.id, input.faceCaptureId));
  const [capturedMedia] = capturedFace ? await db.select().from(mediaFiles).where(eq(mediaFiles.id, capturedFace.mediaFileId)) : [];

  let providerResult: ProviderResult | null = null;
  try {
    if (templateMedia && capturedMedia) {
      providerResult = await callConfiguredProvider({ ...input, referenceImageUrl: templateMedia.fileUrl, capturedImageUrl: capturedMedia.fileUrl });
    }
  } catch (error) {
    providerResult = { matched: false, confidence: 0, livenessStatus: 'manual_review' as const, reason: error instanceof Error ? error.message : 'FACE_PROVIDER_ERROR' };
  }

  const confidence = providerResult?.confidence ?? input.faceConfidence ?? 0;
  const matched = providerResult?.matched ?? confidence >= input.settings.faceMatchThreshold;
  const status = matched ? 'matched' : 'not_matched';
  const livenessStatus = providerResult?.livenessStatus ?? (input.settings.requireLivenessForVisit ? 'manual_review' : 'not_checked');

  await db.update(faceCaptures).set({
    identityMatchStatus: status,
    identityConfidence: confidence.toString(),
    livenessStatus,
  }).where(eq(faceCaptures.id, input.faceCaptureId));

  return {
    status,
    confidence,
    livenessStatus,
    reason: providerResult?.reason ?? (matched ? 'MATCHED_BY_CONFIGURED_THRESHOLD' : 'BELOW_CONFIGURED_THRESHOLD'),
    provider: input.settings.faceIntegration.enabled ? input.settings.faceIntegration.provider : 'mock',
    templateId: template.id,
  };
}
