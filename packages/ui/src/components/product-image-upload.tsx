'use client';

import * as React from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';

export interface ProductImageUploadLabels {
  uploadTitle: string;
  uploadSubtitle: string;
  change: string;
  remove: string;
  uploading: string;
  errorInvalidType: string;
  errorFileTooLarge: string;
  errorUploadFailed: string;
  errorRemoveFailed: string;
}

export interface ProductImageUploadProps {
  /** Current image URL (from R2 or existing) */
  value?: string | null;
  /** Called when image is uploaded successfully */
  onChange?: (imageUrl: string | null) => void;
  /** Function to upload a file and return the public URL */
  onUpload: (file: File) => Promise<string>;
  /** Function to delete the current image (optional) */
  onDelete?: (imageUrl: string) => Promise<void>;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether an upload is currently in progress */
  isUploading?: boolean;
  /** CSS class name */
  className?: string;
  /** Localized labels - required for i18n compliance */
  labels: ProductImageUploadLabels;
}

export function ProductImageUpload({
  value,
  onChange,
  onUpload,
  onDelete,
  disabled,
  isUploading: externalIsUploading,
  className,
  labels,
}: ProductImageUploadProps) {
  const [internalIsUploading, setInternalIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isUploading = externalIsUploading || internalIsUploading;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous error
    setError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(labels.errorInvalidType);
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(labels.errorFileTooLarge);
      return;
    }

    setInternalIsUploading(true);

    try {
      const publicUrl = await onUpload(file);
      onChange?.(publicUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(labels.errorUploadFailed);
    } finally {
      setInternalIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      if (onDelete) {
        await onDelete(value);
      }
      onChange?.(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(labels.errorRemoveFailed);
    }
  };

  const handleUploadClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* No image - show upload area */}
      {!value && (
        <div
          onClick={handleUploadClick}
          className={cn(
            'flex flex-col items-center justify-center gap-2',
            'border-2 border-dashed rounded-lg p-8',
            'cursor-pointer transition-colors',
            'hover:border-primary hover:bg-accent',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">{labels.uploading}</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">{labels.uploadTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {labels.uploadSubtitle}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Has image - show preview */}
      {value && (
        <div className="relative aspect-video max-w-xs rounded-lg overflow-hidden border bg-muted group">
          <img
            src={value}
            alt="Product image"
            className="object-cover w-full h-full"
          />

          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}

          {!disabled && !isUploading && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUploadClick}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                {labels.change}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4 mr-1" />
                {labels.remove}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

ProductImageUpload.displayName = 'ProductImageUpload';
