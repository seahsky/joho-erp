/**
 * Proxy Upload API Route for Identity Documents
 *
 * POST /api/upload/identity-document
 *
 * Accepts multipart form data with:
 * - file: The document file (JPEG, PNG, PDF, max 5MB)
 * - customerId: The customer ID
 * - directorIndex: The director index (0-based)
 * - documentType: 'DRIVER_LICENSE' or 'PASSPORT'
 * - side: 'front' or 'back'
 *
 * Security:
 * - Requires authenticated admin/sales user (via Clerk)
 * - Validates file type and size
 * - Uploads directly to R2 server-side
 */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  uploadIdentityDocument,
  isR2Configured,
  IDENTITY_DOCUMENT_CONFIG,
  type IdentityDocumentMimeType,
} from '@joho-erp/api';

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

export async function POST(request: Request): Promise<NextResponse<UploadResponse>> {
  try {
    // 1. Verify authentication
    const authData = await auth();
    if (!authData.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Verify admin/sales role
    const client = await clerkClient();
    const user = await client.users.getUser(authData.userId);
    const metadata = user.publicMetadata as { role?: string };
    const userRole = metadata.role || 'customer';

    if (userRole !== 'admin' && userRole !== 'sales') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'File upload is not configured' },
        { status: 503 }
      );
    }

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customerId = formData.get('customerId') as string | null;
    const directorIndexStr = formData.get('directorIndex') as string | null;
    const documentType = formData.get('documentType') as string | null;
    const side = formData.get('side') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    if (directorIndexStr === null || directorIndexStr === '') {
      return NextResponse.json(
        { success: false, error: 'Director index is required' },
        { status: 400 }
      );
    }

    const directorIndex = parseInt(directorIndexStr, 10);
    if (isNaN(directorIndex) || directorIndex < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid director index' },
        { status: 400 }
      );
    }

    if (documentType !== 'DRIVER_LICENSE' && documentType !== 'PASSPORT') {
      return NextResponse.json(
        { success: false, error: 'Document type must be DRIVER_LICENSE or PASSPORT' },
        { status: 400 }
      );
    }

    if (side !== 'front' && side !== 'back') {
      return NextResponse.json(
        { success: false, error: 'Side must be front or back' },
        { status: 400 }
      );
    }

    // 5. Validate file type
    const contentType = file.type as IdentityDocumentMimeType;
    if (!IDENTITY_DOCUMENT_CONFIG.allowedMimeTypes.includes(contentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed: ${IDENTITY_DOCUMENT_CONFIG.allowedMimeTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 6. Validate file size
    if (file.size > IDENTITY_DOCUMENT_CONFIG.maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${IDENTITY_DOCUMENT_CONFIG.maxSizeBytes / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // 7. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 8. Upload to R2
    const result = await uploadIdentityDocument({
      customerId,
      directorIndex,
      documentType,
      side,
      filename: file.name,
      contentType,
      buffer,
    });

    return NextResponse.json({
      success: true,
      publicUrl: result.publicUrl,
      key: result.key,
    });
  } catch (error) {
    console.error('Identity document upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
