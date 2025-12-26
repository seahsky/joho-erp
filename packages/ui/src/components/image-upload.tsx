'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';

export interface ImageUploadLabels {
  clickToUpload: string;
  fileTypes: string;
  addImage: string;
}

export interface ImageUploadProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onRemove?: (value: string) => void;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  /** Localized labels - required for i18n compliance */
  labels: ImageUploadLabels;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled,
  multiple = false,
  maxFiles = 5,
  className,
  labels,
}: ImageUploadProps) {
  const [previews, setPreviews] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value) {
      const urls = Array.isArray(value) ? value : [value];
      setPreviews(urls);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPreviews: string[] = [];
    const readers: FileReader[] = [];

    Array.from(files).forEach((file, index) => {
      if (multiple && previews.length + index >= maxFiles) return;

      const reader = new FileReader();
      readers.push(reader);

      reader.onloadend = () => {
        const result = reader.result as string;
        newPreviews.push(result);

        if (newPreviews.length === Math.min(files.length, maxFiles - previews.length)) {
          const updatedPreviews = [...previews, ...newPreviews];
          setPreviews(updatedPreviews);

          if (onChange) {
            onChange(multiple ? updatedPreviews : updatedPreviews[0]);
          }
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const handleRemove = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);

    if (onRemove) {
      onRemove(previews[index]);
    }

    if (onChange) {
      onChange(multiple ? newPreviews : (newPreviews[0] || ''));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('space-y-4', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Upload Button */}
      {(multiple ? previews.length < maxFiles : previews.length === 0) && (
        <div
          onClick={handleUploadClick}
          className={cn(
            'flex flex-col items-center justify-center gap-2',
            'border-2 border-dashed rounded-lg p-8',
            'cursor-pointer transition-colors',
            'hover:border-primary hover:bg-accent',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {labels.clickToUpload} {multiple && `(${previews.length}/${maxFiles})`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {labels.fileTypes}
            </p>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="object-cover w-full h-full"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Add More Button */}
          {multiple && previews.length < maxFiles && (
            <div
              onClick={handleUploadClick}
              className={cn(
                'aspect-square rounded-lg border-2 border-dashed',
                'flex items-center justify-center',
                'cursor-pointer transition-colors',
                'hover:border-primary hover:bg-accent',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{labels.addImage}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ImageUpload.displayName = 'ImageUpload';
