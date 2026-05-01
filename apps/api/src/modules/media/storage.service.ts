import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const storageConfig = {
  driver: process.env.STORAGE_DRIVER ?? 'local',
  bucket: process.env.STORAGE_BUCKET ?? '',
  region: process.env.STORAGE_REGION ?? 'auto',
  endpoint: process.env.STORAGE_ENDPOINT ?? '',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? '',
  signedUrlExpiresSeconds: Number(process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS ?? 900),
};

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;
  if (!storageConfig.bucket || !storageConfig.endpoint || !storageConfig.accessKeyId || !storageConfig.secretAccessKey) {
    throw Object.assign(new Error('Storage R2/S3 belum dikonfigurasi lengkap.'), { statusCode: 500 });
  }
  s3Client = new S3Client({
    region: storageConfig.region,
    endpoint: storageConfig.endpoint,
    credentials: {
      accessKeyId: storageConfig.accessKeyId,
      secretAccessKey: storageConfig.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return s3Client;
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

export function getPublicUrl(objectKey: string) {
  if (storageConfig.publicBaseUrl) return `${storageConfig.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`;
  return `${storageConfig.endpoint.replace(/\/$/, '')}/${storageConfig.bucket}/${objectKey}`;
}

export async function createUploadUrl(input: { objectKey: string; mimeType: string }) {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: input.objectKey,
    ContentType: input.mimeType,
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: storageConfig.signedUrlExpiresSeconds });
  return {
    uploadUrl,
    objectKey: input.objectKey,
    publicUrl: getPublicUrl(input.objectKey),
    expiresIn: storageConfig.signedUrlExpiresSeconds,
  };
}

export async function deleteObject(objectKey: string) {
  const command = new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: objectKey });
  await getS3Client().send(command);
}
