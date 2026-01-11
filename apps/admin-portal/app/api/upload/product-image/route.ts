/**
 * Proxy Upload API Route for Product Images
 *
 * POST /api/upload/product-image
 *
 * Accepts multipart form data with:
 * - file: The image file (JPEG, PNG, WebP, max 2MB)
 * - productId: The product ID to associate the image with
 *
 * Security:
 * - Requires authenticated admin/sales user (via Clerk)
 * - Validates file type and size
 * - Uploads directly to R2 server-side (no CORS issues)
 */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  uploadToR2,
  isR2Configured,
  IMAGE_UPLOAD_CONFIG,
  type AllowedMimeType,
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
        { success: false, error: 'Image upload is not configured' },
        { status: 503 }
      );
    }

    // 4. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // 5. Validate file type
    const contentType = file.type as AllowedMimeType;
    if (!IMAGE_UPLOAD_CONFIG.allowedMimeTypes.includes(contentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed: ${IMAGE_UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 6. Validate file size
    if (file.size > IMAGE_UPLOAD_CONFIG.maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${IMAGE_UPLOAD_CONFIG.maxSizeBytes / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // 7. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 8. Upload to R2
    const result = await uploadToR2({
      path: `products/${productId}`,
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
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
