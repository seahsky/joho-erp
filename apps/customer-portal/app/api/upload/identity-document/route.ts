/**
 * Proxy Upload API Route for Identity Documents
 *
 * POST /api/upload/identity-document
 *
 * Accepts multipart form data with:
 * - file: The identity document file (JPEG, PNG, or PDF, max 5MB)
 * - customerId: The customer ID for organizing files
 * - directorIndex: The director index (0-based)
 * - documentType: 'DRIVER_LICENSE' or 'PASSPORT'
 * - side: 'front' or 'back' (back only required for driver license)
 *
 * Security:
 * - Public endpoint (documents uploaded before account creation during onboarding)
 * - Validates file type (JPEG, PNG, PDF), size (5MB max), and required fields
 * - Uploads directly to R2 server-side (no CORS issues)
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadIdentityDocument, isR2Configured, IDENTITY_DOCUMENT_CONFIG, type IdentityDocumentMimeType } from '@joho-erp/api';

interface UploadSuccessResponse {
  success: true;
  publicUrl: string;
  key: string;
}

interface UploadErrorResponse {
  success: false;
  error: string;
}

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

const VALID_DOCUMENT_TYPES = ['DRIVER_LICENSE', 'PASSPORT'] as const;
const VALID_SIDES = ['front', 'back'] as const;

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // 1. Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Storage not configured' },
        { status: 503 }
      );
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customerId = formData.get('customerId') as string | null;
    const directorIndexStr = formData.get('directorIndex') as string | null;
    const documentType = formData.get('documentType') as string | null;
    const side = formData.get('side') as string | null;

    // 3. Validate required inputs
    if (!file || !customerId || directorIndexStr === null || !documentType || !side) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, customerId, directorIndex, documentType, side' },
        { status: 400 }
      );
    }

    // 4. Validate document type
    if (!VALID_DOCUMENT_TYPES.includes(documentType as typeof VALID_DOCUMENT_TYPES[number])) {
      return NextResponse.json(
        { success: false, error: 'Invalid document type. Must be DRIVER_LICENSE or PASSPORT' },
        { status: 400 }
      );
    }

    // 5. Validate side
    if (!VALID_SIDES.includes(side as typeof VALID_SIDES[number])) {
      return NextResponse.json(
        { success: false, error: 'Invalid side. Must be front or back' },
        { status: 400 }
      );
    }

    // 6. Validate director index
    const directorIndex = parseInt(directorIndexStr, 10);
    if (isNaN(directorIndex) || directorIndex < 0 || directorIndex > 9) {
      return NextResponse.json(
        { success: false, error: 'Invalid director index. Must be between 0 and 9' },
        { status: 400 }
      );
    }

    // 7. Validate file type
    const allowedTypes = IDENTITY_DOCUMENT_CONFIG.allowedMimeTypes as readonly string[];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, PDF` },
        { status: 400 }
      );
    }

    // 8. Validate file size (5MB max)
    if (file.size > IDENTITY_DOCUMENT_CONFIG.maxSizeBytes) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // 9. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 10. Upload to R2
    const result = await uploadIdentityDocument({
      customerId,
      directorIndex,
      documentType: documentType as 'DRIVER_LICENSE' | 'PASSPORT',
      side: side as 'front' | 'back',
      filename: file.name,
      contentType: file.type as IdentityDocumentMimeType,
      buffer,
    });

    // 11. Return success response
    return NextResponse.json({
      success: true,
      publicUrl: result.publicUrl,
      key: result.key,
    });

  } catch (error) {
    console.error('Identity document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Required for multipart form data
  },
};
