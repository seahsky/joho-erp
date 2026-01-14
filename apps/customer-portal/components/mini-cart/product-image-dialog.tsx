'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@joho-erp/ui';

interface ProductImageDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
  productName: string;
}

export function ProductImageDialog({
  open,
  onClose,
  imageUrl,
  productName,
}: ProductImageDialogProps) {
  const t = useTranslations('miniCart');
  const tProducts = useTranslations('products');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[90vw] sm:max-w-[600px] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold">
            {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-square px-6 pb-6">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={productName}
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 640px) 90vw, 600px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25">
              <div className="text-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {tProducts('noImage')}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
