/**
 * Upload Router
 * Handles image upload operations for products using Cloudflare R2
 */

import { z } from 'zod';
import { router, isAdmin } from '../trpc';
import {
  generateUploadUrl,
  deleteImage,
  isR2Configured,
  IMAGE_UPLOAD_CONFIG,
  type AllowedMimeType,
} from '../services/r2';
import { TRPCError } from '@trpc/server';

// Allowed MIME types as Zod enum
const allowedMimeTypes = z.enum([
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
]);

export const uploadRouter = router({
  /**
   * Check if R2 storage is configured
   * Useful for conditional UI rendering
   */
  isConfigured: isAdmin.query(() => {
    return { configured: isR2Configured() };
  }),

  /**
   * Get presigned URL for uploading a product image
   * Admin only - generates a secure temporary URL for direct upload to R2
   */
  getProductImageUploadUrl: isAdmin
    .input(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        filename: z.string().min(1).max(255),
        contentType: allowedMimeTypes,
        contentLength: z
          .number()
          .int()
          .positive()
          .max(IMAGE_UPLOAD_CONFIG.maxSizeBytes, {
            message: `File too large. Maximum size is ${IMAGE_UPLOAD_CONFIG.maxSizeBytes / 1024 / 1024}MB`,
          }),
      })
    )
    .mutation(async ({ input }) => {
      if (!isR2Configured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Image upload is not configured. Please contact an administrator.',
        });
      }

      const { productId, filename, contentType, contentLength } = input;

      try {
        const result = await generateUploadUrl({
          productId,
          filename,
          contentType: contentType as AllowedMimeType,
          contentLength,
        });

        return {
          uploadUrl: result.uploadUrl,
          publicUrl: result.publicUrl,
          key: result.key,
          expiresIn: IMAGE_UPLOAD_CONFIG.presignedUrlExpiresIn,
        };
      } catch (error) {
        console.error('Failed to generate upload URL:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL. Please try again.',
        });
      }
    }),

  /**
   * Delete a product image from R2
   * Admin only - removes the image from storage
   */
  deleteProductImage: isAdmin
    .input(
      z.object({
        imageUrl: z.string().url('Invalid image URL'),
      })
    )
    .mutation(async ({ input }) => {
      if (!isR2Configured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Image storage is not configured.',
        });
      }

      try {
        await deleteImage(input.imageUrl);
        return { success: true };
      } catch (error) {
        console.error('Failed to delete image:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete image. Please try again.',
        });
      }
    }),
});
