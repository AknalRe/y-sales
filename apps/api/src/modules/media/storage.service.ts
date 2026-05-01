import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { and, eq } from 'drizzle-orm';
import { companyIntegrations } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';

type StorageConfig = {
  driver: string;
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  signedUrlExpiresSeconds: number;
};

const envStorageConfig: StorageConfig = {
  driver: process.env.STORAGE_DRIVER ?? 'local',
  bucket: process.env.STORAGE_BUCKET ?? '',
  region: process.env.STORAGE_REGION ?? 'auto',
  endpoint: process.env.STORAGE_ENDPOINT ?? '',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? '',
  signedUrlExpiresSeconds: Number(process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS ?? 900),
};

const s3Clients = new Map<string, S3Client>();

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

export async function getStorageConfig(companyId?: string): Promise<StorageConfig> {
  if (!companyId) return envStorageConfig;
  const [integration] = await db.select().from(companyIntegrations).where(and(
    eq(companyIntegrations.companyId, companyId),
    eq(companyIntegrations.type, 'storage'),
    eq(companyIntegrations.status, 'active'),
  )).limit(1);

  if (!integration) return envStorageConfig;
  const config = integration.config && typeof integration.config === 'object' && !Array.isArray(integration.config) ? integration.config as Record<string, unknown> : {};
  const secretConfig = integration.secretConfig && typeof integration.secretConfig === 'object' && !Array.isArray(integration.secretConfig) ? integration.secretConfig as Record<string, unknown> : {};

  return {
    driver: integration.provider,
    bucket: readString(config.bucket, envStorageConfig.bucket),
    region: readString(config.region, envStorageConfig.region),
    endpoint: readString(config.endpoint, envStorageConfig.endpoint),
    accessKeyId: readString(secretConfig.accessKeyId, envStorageConfig.accessKeyId),
    secretAccessKey: readString(secretConfig.secretAccessKey, envStorageConfig.secretAccessKey),
    publicBaseUrl: readString(config.publicBaseUrl, envStorageConfig.publicBaseUrl),
    signedUrlExpiresSeconds: readNumber(config.signedUrlExpiresSeconds, envStorageConfig.signedUrlExpiresSeconds),
  };
}

function clientKey(config: StorageConfig) {
  return `${config.driver}:${config.endpoint}:${config.bucket}:${config.accessKeyId}`;
}

function getS3Client(config: StorageConfig) {
  const key = clientKey(config);
  const cached = s3Clients.get(key);
  if (cached) return cached;
  if (!config.bucket || !config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw Object.assign(new Error('Storage R2/S3 belum dikonfigurasi lengkap.'), { statusCode: 500 });
  }
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  s3Clients.set(key, client);
  return client;
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return 'bin';
}

export function createObjectKey(input: { companyId: string; ownerType: string; ownerId?: string | null; fileName?: string; mimeType: string }) {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const random = crypto.randomUUID();
  const ext = input.fileName?.includes('.') ? sanitizeSegment(input.fileName.split('.').pop() ?? extensionFromMime(input.mimeType)) : extensionFromMime(input.mimeType);
  const baseName = input.fileName ? sanitizeSegment(input.fileName.replace(/\.[^.]+$/, '')) : 'asset';
  return `companies/${input.companyId}/${sanitizeSegment(input.ownerType)}/${input.ownerId ?? 'unassigned'}/${yyyy}/${mm}/${baseName}-${random}.${ext}`;
}

export function getPublicUrl(objectKey: string, config: StorageConfig = envStorageConfig) {
  if (config.publicBaseUrl) return `${config.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`;
  return `${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${objectKey}`;
}

export async function createUploadUrl(input: { companyId?: string; objectKey: string; mimeType: string }) {
  const config = await getStorageConfig(input.companyId);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.objectKey,
    ContentType: input.mimeType,
  });
  const uploadUrl = await getSignedUrl(getS3Client(config), command, { expiresIn: config.signedUrlExpiresSeconds });
  return {
    uploadUrl,
    objectKey: input.objectKey,
    publicUrl: getPublicUrl(input.objectKey, config),
    expiresIn: config.signedUrlExpiresSeconds,
    provider: config.driver,
  };
}

export async function deleteObject(objectKey: string, companyId?: string) {
  const config = await getStorageConfig(companyId);
  const command = new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey });
  await getS3Client(config).send(command);
}
