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
  const t0 = Date.now();
  console.log(`[${new Date().toISOString()}] [face-verify] → POST ${url} provider=${integration.provider} timeout=${integration.timeoutMs}ms`);
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
    const elapsed = Date.now() - t0;
    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] [face-verify] ← POST ${url} status=${response.status} elapsed=${elapsed}ms`);
      throw new Error(`FACE_PROVIDER_HTTP_${response.status}`);
    }
    const result = await response.json() as Record<string, unknown>;
    console.log(`[${new Date().toISOString()}] [face-verify] ← POST ${url} status=200 elapsed=${elapsed}ms matched=${result.matched} confidence=${result.confidence} reason=${result.reason}`);
    return result;
  } catch (error) {
    const elapsed = Date.now() - t0;
    console.error(`[${new Date().toISOString()}] [face-verify] ✗ POST ${url} error=${error instanceof Error ? error.message : String(error)} elapsed=${elapsed}ms`);
    throw error;
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

async function callInternalPythonProvider(input: ProviderInput): Promise<ProviderResult> {
  const integration = input.settings.faceIntegration;
  if (!integration.baseUrl) throw new Error('INTERNAL_PYTHON_FACE_SERVICE_URL_REQUIRED');
  const result = await postJson(integration.baseUrl, input, {
    provider: 'internal_python',
    mode: integration.mode,
    referenceImageUrl: input.referenceImageUrl,
    capturedImageUrl: input.capturedImageUrl,
    threshold: input.settings.faceMatchThreshold,
    requireLiveness: input.settings.requireLivenessForVisit,
    templateId: input.faceCaptureId,
  }, integration.apiKey ? { authorization: `Bearer ${integration.apiKey}` } : {});
  return normalizeResult(result as Partial<ProviderResult>, 'INTERNAL_PYTHON_PROVIDER');
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

  if (integration.provider === 'internal_python') return callInternalPythonProvider(input);
  if (integration.provider === 'custom_http') return callCustomHttpProvider(input);
  if (integration.provider === 'azure_face') return callAzureFaceProvider(input);
  if (integration.provider === 'google_vertex') return callGoogleVertexProvider(input);
  if (integration.provider === 'aws_rekognition') return callAwsRekognitionProvider(input);

  return null;
}

export async function verifyFaceIdentity(input: VerifyFaceIdentityInput) {
  console.log(`[${new Date().toISOString()}] [face-verify] verifyFaceIdentity start companyId=${input.companyId} userId=${input.userId} faceDetected=${input.faceDetected} faceCaptureId=${input.faceCaptureId}`);

  const [user] = await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.companyId, input.companyId), eq(users.status, 'active')));
  if (!user) {
    console.log(`[${new Date().toISOString()}] [face-verify] REJECT reason=USER_NOT_FOUND_IN_COMPANY userId=${input.userId}`);
    return { status: 'not_matched' as const, confidence: 0, livenessStatus: 'manual_review' as const, reason: 'USER_NOT_FOUND_IN_COMPANY' };
  }

  const [template] = await db.select().from(userFaceTemplates).where(and(
    eq(userFaceTemplates.companyId, input.companyId),
    eq(userFaceTemplates.userId, user.id),
    eq(userFaceTemplates.roleId, user.roleId),
    eq(userFaceTemplates.status, 'active'),
  )).orderBy(desc(userFaceTemplates.createdAt)).limit(1);

  if (!template) {
    console.log(`[${new Date().toISOString()}] [face-verify] REVIEW reason=ACTIVE_FACE_TEMPLATE_NOT_FOUND userId=${input.userId}`);
    return { status: 'manual_review' as const, confidence: input.faceConfidence ?? 0, livenessStatus: 'manual_review' as const, reason: 'ACTIVE_FACE_TEMPLATE_NOT_FOUND' };
  }

  if (!input.faceDetected) {
    console.log(`[${new Date().toISOString()}] [face-verify] REJECT reason=FACE_NOT_DETECTED userId=${input.userId}`);
    await db.update(faceCaptures).set({ identityMatchStatus: 'not_matched', identityConfidence: '0', livenessStatus: 'manual_review' }).where(eq(faceCaptures.id, input.faceCaptureId));
    return { status: 'not_matched' as const, confidence: 0, livenessStatus: 'manual_review' as const, reason: 'FACE_NOT_DETECTED' };
  }

  const [templateMedia] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, template.mediaFileId));
  const [capturedFace] = await db.select().from(faceCaptures).where(eq(faceCaptures.id, input.faceCaptureId));
  const [capturedMedia] = capturedFace ? await db.select().from(mediaFiles).where(eq(mediaFiles.id, capturedFace.mediaFileId)) : [];

  const integration = input.settings.faceIntegration;
  let providerResult: ProviderResult | null = null;

  console.log(`[${new Date().toISOString()}] [face-verify] integration.enabled=${integration.enabled} provider=${integration.provider} baseUrl=${integration.baseUrl || '(empty)'} hasTemplateMedia=${!!templateMedia} hasCapturedMedia=${!!capturedMedia}`);

  try {
    if (integration.enabled && integration.provider !== 'mock' && templateMedia && capturedMedia) {
      providerResult = await callConfiguredProvider({ ...input, referenceImageUrl: templateMedia.fileUrl, capturedImageUrl: capturedMedia.fileUrl });
    } else if (!integration.enabled || integration.provider === 'mock') {
      console.warn(`[${new Date().toISOString()}] [face-verify] ⚠ Face integration ${integration.enabled ? 'provider=mock' : 'DISABLED'} — mock mode, face NOT verified by service. companyId=${input.companyId} userId=${input.userId}`);
    } else if (!templateMedia) {
      console.warn(`[${new Date().toISOString()}] [face-verify] ⚠ Template media not found for templateId=${template.id}`);
    } else if (!capturedMedia) {
      console.warn(`[${new Date().toISOString()}] [face-verify] ⚠ Captured media not found for faceCaptureId=${input.faceCaptureId}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [face-verify] ✗ Provider error: ${error instanceof Error ? error.message : String(error)}`);
    providerResult = { matched: false, confidence: 0, livenessStatus: 'manual_review' as const, reason: error instanceof Error ? error.message : 'FACE_PROVIDER_ERROR' };
  }

  const confidence = providerResult?.confidence ?? 0;
  const matched = providerResult?.matched ?? false;
  const status = matched ? 'matched' : 'not_matched';
  const livenessStatus = providerResult?.livenessStatus ?? (input.settings.requireLivenessForVisit ? 'manual_review' : 'not_checked');

  console.log(`[${new Date().toISOString()}] [face-verify] RESULT status=${status} confidence=${confidence} reason=${providerResult?.reason ?? 'NO_PROVIDER'} provider=${integration.enabled ? integration.provider : 'disabled'}`);

  await db.update(faceCaptures).set({
    identityMatchStatus: status,
    identityConfidence: confidence.toString(),
    livenessStatus,
  }).where(eq(faceCaptures.id, input.faceCaptureId));

  return {
    status,
    confidence,
    livenessStatus,
    reason: providerResult?.reason ?? (integration.enabled && integration.provider !== 'mock' ? 'NO_PROVIDER_RESULT' : 'FACE_SERVICE_NOT_CONFIGURED'),
    provider: integration.enabled ? integration.provider : 'disabled',
    templateId: template.id,
  };
}
