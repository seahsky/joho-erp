'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  ProductImageUpload,
} from '@joho-erp/ui';
import { Loader2, Package } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCentsForInput, parseToCents } from '@joho-erp/shared';
import type { ProductCategory } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit: string;
  packageSize?: number | null;
  basePrice: number;
  currentStock: number;
  lowStockThreshold?: number | null;
  status: 'active' | 'discontinued' | 'out_of_stock';
  imageUrl?: string | null;
};

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  product: Product | null;
}

export function EditProductDialog({
  open,
  onOpenChange,
  onSuccess,
  product,
}: EditProductDialogProps) {
  const { toast } = useToast();
  const t = useTranslations();

  // Form state
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [unit, setUnit] = useState<'kg' | 'piece' | 'box' | 'carton'>('kg');
  const [packageSize, setPackageSize] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [status, setStatus] = useState<'active' | 'discontinued' | 'out_of_stock'>('active');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Populate form when product changes
  useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description || '');
      setCategory((product.category as ProductCategory) || '');
      setUnit(product.unit as 'kg' | 'piece' | 'box' | 'carton');
      setPackageSize(product.packageSize?.toString() || '');
      // basePrice is stored in cents, convert to dollars for display
      setBasePrice(formatCentsForInput(product.basePrice));
      setCurrentStock(product.currentStock.toString());
      setLowStockThreshold(product.lowStockThreshold?.toString() || '');
      setStatus(product.status);
      setImageUrl(product.imageUrl || null);
      setOriginalImageUrl(product.imageUrl || null);
    }
  }, [product]);

  // Image upload mutations
  const uploadUrlMutation = api.upload.getProductImageUploadUrl.useMutation();
  const deleteImageMutation = api.upload.deleteProductImage.useMutation();

  // Handle image upload with compression
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!product) throw new Error('No product selected');

    // Compress image before upload
    const compressionOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    };

    let processedFile = file;
    try {
      processedFile = await imageCompression(file, compressionOptions);
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
    }

    // Get presigned URL - use actual product ID
    const { uploadUrl, publicUrl } = await uploadUrlMutation.mutateAsync({
      productId: product.id,
      filename: file.name,
      contentType: 'image/jpeg',
      contentLength: processedFile.size,
    });

    // Upload to R2
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: processedFile,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return publicUrl;
  }, [product, uploadUrlMutation]);

  // Handle image delete
  const handleImageDelete = useCallback(async (url: string): Promise<void> => {
    await deleteImageMutation.mutateAsync({ imageUrl: url });
  }, [deleteImageMutation]);

  const updateProductMutation = api.product.update.useMutation({
    onSuccess: async () => {
      // If the image URL changed and there was an original, delete the old one
      if (originalImageUrl && originalImageUrl !== imageUrl) {
        try {
          await deleteImageMutation.mutateAsync({ imageUrl: originalImageUrl });
        } catch (error) {
          // Log but don't fail the update
          console.warn('Failed to delete old image:', error);
        }
      }

      toast({
        title: t('productForm.messages.productUpdated'),
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('productForm.messages.errorUpdating'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    // Validation
    if (!sku || !name || !basePrice) {
      toast({
        title: t('productForm.validation.invalidInput'),
        description: t('productForm.validation.skuNamePriceRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Convert basePrice from dollars to cents
    const basePriceInCents = parseToCents(basePrice);
    if (basePriceInCents === null || basePriceInCents <= 0) {
      toast({
        title: t('productForm.validation.invalidInput'),
        description: t('productForm.validation.basePricePositive'),
        variant: 'destructive',
      });
      return;
    }

    await updateProductMutation.mutateAsync({
      productId: product.id,
      name,
      description: description || undefined,
      category: category || undefined,
      unit,
      packageSize: packageSize ? parseFloat(packageSize) : undefined,
      basePrice: basePriceInCents,
      currentStock: parseInt(currentStock) || 0,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      status,
      imageUrl: imageUrl || null,
    });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('productForm.editDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('productForm.editDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Product Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('productForm.sections.productDetails')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">{t('productForm.fields.skuRequired')}</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder={t('productForm.fields.skuPlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">{t('productForm.fields.nameRequired')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('productForm.fields.namePlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('productForm.fields.description')}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('productForm.fields.descriptionPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="category">{t('productForm.fields.category')}</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory | '')}
                placeholder={t('productForm.fields.categoryPlaceholder')}
              />
            </div>
          </div>

          {/* Product Image */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('productForm.sections.productImage')}</h3>
            <ProductImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              disabled={updateProductMutation.isPending}
              isUploading={uploadUrlMutation.isPending}
              labels={{
                uploadTitle: t('productForm.image.uploadTitle'),
                uploadSubtitle: t('productForm.image.uploadSubtitle'),
                change: t('productForm.image.change'),
                remove: t('productForm.image.remove'),
                uploading: t('productForm.image.uploading'),
              }}
            />
          </div>

          {/* Inventory Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('productForm.sections.inventoryPricing')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit">{t('productForm.fields.unitRequired')}</Label>
                <select
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'kg' | 'piece' | 'box' | 'carton')}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="kg">{t('productForm.units.kg')}</option>
                  <option value="piece">{t('productForm.units.piece')}</option>
                  <option value="box">{t('productForm.units.box')}</option>
                  <option value="carton">{t('productForm.units.carton')}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="packageSize">{t('productForm.fields.packageSize')}</Label>
                <Input
                  id="packageSize"
                  type="number"
                  step="0.01"
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value)}
                  placeholder={t('productForm.fields.packageSizePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice">{t('productForm.fields.basePrice')}</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder={t('productForm.fields.basePricePlaceholder')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="currentStock">{t('productForm.fields.currentStock')}</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder={t('productForm.fields.currentStockPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lowStockThreshold">{t('productForm.fields.lowStockThreshold')}</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder={t('productForm.fields.lowStockThresholdPlaceholder')}
                />
              </div>

              <div>
                <Label htmlFor="status">{t('productForm.fields.status')}</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'discontinued' | 'out_of_stock')}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">{t('productForm.statuses.active')}</option>
                  <option value="discontinued">{t('productForm.statuses.discontinued')}</option>
                  <option value="out_of_stock">{t('productForm.statuses.out_of_stock')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateProductMutation.isPending}
            >
              {t('productForm.buttons.cancel')}
            </Button>
            <Button type="submit" disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('productForm.buttons.updateProduct')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
