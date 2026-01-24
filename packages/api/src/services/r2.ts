/**
 * Cloudflare R2 Storage Service
 * Handles image uploads using presigned URLs for secure client-side uploads
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Configuration from environment
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || '',
  publicUrl: process.env.R2_PUBLIC_URL || '',
};

// Image upload constraints
export const IMAGE_UPLOAD_CONFIG = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'] as const,
  presignedUrlExpiresIn: 300, // 5 minutes
} as const;

export type AllowedMimeType = (typeof IMAGE_UPLOAD_CONFIG.allowedMimeTypes)[number];

// Identity document upload constraints
export const IDENTITY_DOCUMENT_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'] as const,
} as const;

export type IdentityDocumentMimeType = (typeof IDENTITY_DOCUMENT_CONFIG.allowedMimeTypes)[number];

/**
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return Boolean(
    R2_CONFIG.accountId &&
    R2_CONFIG.accessKeyId &&
    R2_CONFIG.secretAccessKey &&
    R2_CONFIG.bucketName &&
    R2_CONFIG.publicUrl
  );
}

/**
 * Get the R2 client (lazy initialization)
 */
function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 storage is not configured. Please set R2_* environment variables.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });
}

/**
 * Generate a presigned URL for uploading an image to R2
 */
export async function generateUploadUrl(params: {
  productId: string;
  filename: string;
  contentType: AllowedMimeType;
  contentLength: number;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { productId, filename, contentType, contentLength } = params;

  // Validate content type
  if (!IMAGE_UPLOAD_CONFIG.allowedMimeTypes.includes(contentType)) {
    throw new Error(`Invalid file type: ${contentType}. Allowed types: ${IMAGE_UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`);
  }

  // Validate file size
  if (contentLength > IMAGE_UPLOAD_CONFIG.maxSizeBytes) {
    throw new Error(`File too large: max ${IMAGE_UPLOAD_CONFIG.maxSizeBytes / 1024 / 1024}MB`);
  }

  // Generate unique key: products/{productId}/{timestamp}-{sanitizedFilename}
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `products/${productId}/${timestamp}-${sanitizedFilename}`;

  const client = getR2Client();

  // Generate presigned PUT URL
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: IMAGE_UPLOAD_CONFIG.presignedUrlExpiresIn,
  });

  // Construct public URL
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Delete an image from R2
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  const key = extractKeyFromUrl(imageUrl);
  if (!key) {
    throw new Error('Invalid image URL');
  }

  const client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Extract R2 key from public URL
 */
export function extractKeyFromUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    // Remove leading slash
    return url.pathname.slice(1);
  } catch {
    return null;
  }
}

/**
 * Generate a presigned URL for uploading a signature to R2
 * Used for credit application signatures (public endpoint)
 */
export async function generateSignatureUploadUrl(params: {
  signatureType: 'applicant' | 'guarantor' | 'witness';
  directorIndex: number;
  contentLength: number;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { signatureType, directorIndex, contentLength } = params;

  // Signatures are PNG only, max 500KB
  const maxSignatureSize = 500 * 1024; // 500KB
  if (contentLength > maxSignatureSize) {
    throw new Error(`Signature too large: max ${maxSignatureSize / 1024}KB`);
  }

  // Generate unique key: signatures/{timestamp}-{type}-{index}.png
  const timestamp = Date.now();
  const key = `signatures/${timestamp}-${signatureType}-${directorIndex}.png`;

  const client = getR2Client();

  // Generate presigned PUT URL
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ContentType: 'image/png',
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: IMAGE_UPLOAD_CONFIG.presignedUrlExpiresIn,
  });

  // Construct public URL
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Upload a file buffer directly to R2
 * Used by the proxy upload API route to bypass CORS restrictions
 */
export async function uploadToR2(params: {
  path: string; // Generic path (e.g., 'products/productId', 'signatures')
  filename: string;
  contentType: AllowedMimeType;
  buffer: Buffer;
}): Promise<{ publicUrl: string; key: string }> {
  const { path, filename, contentType, buffer } = params;

  // Validate content type
  if (!IMAGE_UPLOAD_CONFIG.allowedMimeTypes.includes(contentType)) {
    throw new Error(`Invalid file type: ${contentType}. Allowed types: ${IMAGE_UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`);
  }

  // Validate file size
  if (buffer.length > IMAGE_UPLOAD_CONFIG.maxSizeBytes) {
    throw new Error(`File too large: max ${IMAGE_UPLOAD_CONFIG.maxSizeBytes / 1024 / 1024}MB`);
  }

  // Generate unique key: {path}/{timestamp}-{sanitizedFilename}
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${path}/${timestamp}-${sanitizedFilename}`;

  const client = getR2Client();

  // Upload directly to R2
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentLength: buffer.length,
  });

  await client.send(command);

  // Construct public URL
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

  return { publicUrl, key };
}

/**
 * Upload an identity document (driver license or passport) to R2
 * Used for credit application verification
 *
 * @param params.customerId - The customer ID for organizing files
 * @param params.directorIndex - The director index (0-based)
 * @param params.documentType - Either 'DRIVER_LICENSE' or 'PASSPORT'
 * @param params.side - 'front' or 'back' (back only for driver license)
 * @param params.filename - Original filename
 * @param params.contentType - File MIME type
 * @param params.buffer - File content as Buffer
 */
export async function uploadIdentityDocument(params: {
  customerId: string;
  directorIndex: number;
  documentType: 'DRIVER_LICENSE' | 'PASSPORT';
  side: 'front' | 'back';
  filename: string;
  contentType: IdentityDocumentMimeType;
  buffer: Buffer;
}): Promise<{ publicUrl: string; key: string }> {
  const { customerId, directorIndex, documentType, side, filename, contentType, buffer } = params;

  // Validate content type
  if (!IDENTITY_DOCUMENT_CONFIG.allowedMimeTypes.includes(contentType as IdentityDocumentMimeType)) {
    throw new Error(`Invalid file type: ${contentType}. Allowed types: ${IDENTITY_DOCUMENT_CONFIG.allowedMimeTypes.join(', ')}`);
  }

  // Validate file size (5MB max)
  if (buffer.length > IDENTITY_DOCUMENT_CONFIG.maxSizeBytes) {
    throw new Error(`File too large: max ${IDENTITY_DOCUMENT_CONFIG.maxSizeBytes / 1024 / 1024}MB`);
  }

  // Generate unique key: identity-documents/{customerId}/director-{index}-{docType}-{side}-{timestamp}.{ext}
  const timestamp = Date.now();
  const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const docTypeSlug = documentType.toLowerCase().replace('_', '-');
  const key = `identity-documents/${customerId}/director-${directorIndex}-${docTypeSlug}-${side}-${timestamp}.${extension}`;

  const client = getR2Client();

  // Upload directly to R2
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentLength: buffer.length,
  });

  await client.send(command);

  // Construct public URL
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

  return { publicUrl, key };
}

/**
 * Upload a PDF file directly to R2
 * Used for credit application PDFs and other document uploads
 *
 * @param params.path - Storage path (e.g., 'credit-applications')
 * @param params.filename - Output filename
 * @param params.buffer - PDF content as Buffer or Uint8Array
 */
export async function uploadPdfToR2(params: {
  path: string;
  filename: string;
  buffer: Buffer | Uint8Array;
}): Promise<{ publicUrl: string; key: string }> {
  const { path, filename, buffer } = params;

  // Max 10MB for PDFs
  const maxPdfSize = 10 * 1024 * 1024;
  if (buffer.length > maxPdfSize) {
    throw new Error(`PDF file too large: max ${maxPdfSize / 1024 / 1024}MB`);
  }

  // Generate unique key: {path}/{timestamp}-{sanitizedFilename}
  const ts = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${path}/${ts}-${sanitizedFilename}`;

  const client = getR2Client();

  // Upload directly to R2
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: Buffer.from(buffer),
    ContentType: 'application/pdf',
    ContentLength: buffer.length,
  });

  await client.send(command);

  // Construct public URL
  const publicUrl = `${R2_CONFIG.publicUrl}/${key}`;

  return { publicUrl, key };
}
