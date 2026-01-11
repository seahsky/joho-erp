'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Checkbox,
} from '@joho-erp/ui';
import { Loader2, Package, PackagePlus } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCentsForInput, parseToCents } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';
import { CategorySelect } from './CategorySelect';
import { CustomerPricingSection, type PricingEntry } from './CustomerPricingSection';
import { StockAdjustmentDialog } from '../../inventory/components/StockAdjustmentDialog';

type Customer = {
  id: string;
  businessName: string;
  deliveryAddress?: {
    area?: string;
  };
};

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  categoryId?: string | null;
  unit: string;
  packageSize?: number | null;
  basePrice: number;
  applyGst?: boolean;
  gstRate?: number | null;
  currentStock: number;
  lowStockThreshold?: number | null;
  estimatedLossPercentage?: number | null;
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
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState<'kg' | 'piece' | 'box' | 'carton'>('kg');
  const [packageSize, setPackageSize] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [applyGst, setApplyGst] = useState(false);
  const [gstRate, setGstRate] = useState('10');
  const [currentStock, setCurrentStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [estimatedLossPercentage, setEstimatedLossPercentage] = useState('');
  const [status, setStatus] = useState<'active' | 'discontinued' | 'out_of_stock'>('active');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pricing state
  const [pricingMap, setPricingMap] = useState<Map<string, PricingEntry>>(new Map());

  // Field error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Stock adjustment dialog state
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);

  // Fetch customers for pricing
  const { data: customersData } = api.customer.getAll.useQuery({
    limit: 1000,
  });

  const customers = useMemo(
    () => (customersData?.customers || []) as Customer[],
    [customersData?.customers]
  );

  // Fetch existing pricing for this product
  const { data: existingPricing } = api.pricing.getProductPrices.useQuery(
    { productId: product?.id ?? '' },
    { enabled: open && !!product?.id }
  );

  // Fetch categories
  const { data: categoriesData, refetch: refetchCategories } = api.category.getAll.useQuery();
  const categories = categoriesData || [];

  // Create category mutation
  const createCategoryMutation = api.category.create.useMutation({
    onSuccess: () => {
      refetchCategories();
      toast({
        title: t('productForm.messages.categoryCreated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('productForm.messages.categoryCreateError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateCategory = async (name: string) => {
    return await createCategoryMutation.mutateAsync({ name });
  };

  // Populate form when product changes
  useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description || '');
      setCategoryId(product.categoryId || null);
      setUnit(product.unit as 'kg' | 'piece' | 'box' | 'carton');
      setPackageSize(product.packageSize?.toString() || '');
      // basePrice is stored in cents, convert to dollars for display
      setBasePrice(formatCentsForInput(product.basePrice));
      setApplyGst(product.applyGst || false);
      setGstRate(product.gstRate?.toString() || '10');
      setCurrentStock(product.currentStock.toString());
      setLowStockThreshold(product.lowStockThreshold?.toString() || '');
      setEstimatedLossPercentage(product.estimatedLossPercentage?.toString() || '');
      setStatus(product.status);
      setImageUrl(product.imageUrl || null);
      setOriginalImageUrl(product.imageUrl || null);
    }
  }, [product]);

  // Initialize pricing map from existing pricing data
  useEffect(() => {
    if (existingPricing && product) {
      const newMap = new Map<string, PricingEntry>();

      existingPricing.forEach((pricing: { customerId: string; customPrice: number }) => {
        // Convert from cents to dollars for display
        const priceInDollars = pricing.customPrice / 100;
        newMap.set(pricing.customerId, {
          enabled: true,
          customPrice: priceInDollars,
        });
      });

      setPricingMap(newMap);
    } else if (!existingPricing && product) {
      // Reset pricing map when no existing pricing
      setPricingMap(new Map());
    }
  }, [existingPricing, product]);

  // Image delete mutation
  const deleteImageMutation = api.upload.deleteProductImage.useMutation();

  // Handle image upload with compression via proxy endpoint
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!product) throw new Error('No product selected');

    // Compress image before upload
    const compressionOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    };

    let processedFile: File = file;
    try {
      processedFile = await imageCompression(file, compressionOptions);
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
    }

    setIsUploading(true);
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', processedFile, file.name);
      formData.append('productId', product.id);

      // Upload via proxy API route (no CORS issues)
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.publicUrl;
    } finally {
      setIsUploading(false);
    }
  }, [product]);

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

    // Validate GST rate if GST is applied
    let gstRateValue: number | null | undefined;
    if (applyGst) {
      gstRateValue = parseFloat(gstRate);
      if (isNaN(gstRateValue) || gstRateValue < 0 || gstRateValue > 100) {
        toast({
          title: t('productForm.validation.invalidInput'),
          description: t('productForm.validation.gstRateRange'),
          variant: 'destructive',
        });
        return;
      }
    } else {
      gstRateValue = null; // Clear GST rate if GST is not applied
    }

    // Validate estimated loss percentage if provided
    let lossPercentage: number | null | undefined;
    if (estimatedLossPercentage) {
      lossPercentage = parseFloat(estimatedLossPercentage);
      if (isNaN(lossPercentage) || lossPercentage < 0 || lossPercentage > 100) {
        toast({
          title: t('productForm.validation.invalidInput'),
          description: t('productForm.validation.lossPercentageRange'),
          variant: 'destructive',
        });
        return;
      }
    } else {
      lossPercentage = null; // Clear loss percentage if not provided
    }

    // Build customer pricing array (convert to cents)
    const customerPricing = Array.from(pricingMap.entries())
      .filter(([_, entry]) => entry.enabled && entry.customPrice > 0)
      .map(([customerId, entry]) => {
        const customPriceInCents = parseToCents(entry.customPrice.toString());
        if (!customPriceInCents || customPriceInCents <= 0) {
          return null;
        }
        return {
          customerId,
          customPrice: customPriceInCents, // Send cents to API
        };
      })
      .filter((p): p is { customerId: string; customPrice: number } => p !== null);

    await updateProductMutation.mutateAsync({
      productId: product.id,
      name,
      description: description || undefined,
      categoryId: categoryId || null,
      unit,
      packageSize: packageSize ? parseFloat(packageSize) : undefined,
      basePrice: basePriceInCents,
      applyGst,
      gstRate: gstRateValue,
      // currentStock is now read-only, managed via StockAdjustmentDialog
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      estimatedLossPercentage: lossPercentage,
      status,
      imageUrl: imageUrl || null,
      customerPricing, // Include customer pricing in update
    });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
              <CategorySelect
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                onCreateCategory={handleCreateCategory}
                isCreating={createCategoryMutation.isPending}
                disabled={updateProductMutation.isPending}
                labels={{
                  selectCategory: t('productForm.fields.selectCategory'),
                  createCategory: t('productForm.fields.createCategory'),
                  searchPlaceholder: t('productForm.fields.searchCategories'),
                  noCategories: t('productForm.fields.noCategories'),
                  newCategoryName: t('productForm.fields.newCategoryName'),
                  creating: t('productForm.fields.creatingCategory'),
                }}
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
              isUploading={isUploading}
              labels={{
                uploadTitle: t('productForm.image.uploadTitle'),
                uploadSubtitle: t('productForm.image.uploadSubtitle'),
                change: t('productForm.image.change'),
                remove: t('productForm.image.remove'),
                uploading: t('productForm.image.uploading'),
                errorInvalidType: t('upload.errorInvalidType'),
                errorFileTooLarge: t('upload.errorFileTooLarge'),
                errorUploadFailed: t('upload.errorUploadFailed'),
                errorRemoveFailed: t('upload.errorRemoveFailed'),
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

            {/* GST Settings */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="applyGst"
                  checked={applyGst}
                  onCheckedChange={(checked: boolean) => setApplyGst(checked)}
                />
                <Label htmlFor="applyGst" className="cursor-pointer">
                  {t('productForm.fields.applyGst')}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                {t('productForm.fields.applyGstDescription')}
              </p>

              {applyGst && (
                <div className="ml-6 w-1/2">
                  <Label htmlFor="gstRate">{t('productForm.fields.gstRate')}</Label>
                  <Input
                    id="gstRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    placeholder={t('productForm.fields.gstRatePlaceholder')}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentStock">{t('productForm.fields.currentStockReadOnly')}</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={currentStock}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t('productForm.fields.stockAdjustmentHint')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStockAdjustment(true)}
                  className="mt-2"
                >
                  <PackagePlus className="mr-2 h-4 w-4" />
                  {t('productForm.buttons.adjustStock')}
                </Button>
              </div>

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
            </div>

            <div>
              <Label htmlFor="estimatedLossPercentage">{t('productForm.fields.estimatedLossPercentage')}</Label>
              <Input
                id="estimatedLossPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={estimatedLossPercentage}
                onChange={(e) => setEstimatedLossPercentage(e.target.value)}
                placeholder={t('productForm.fields.lossPercentagePlaceholder')}
              />
              {estimatedLossPercentage && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('productForm.fields.expectedYield')}: {(100 - parseFloat(estimatedLossPercentage || '0')).toFixed(1)}%
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

          {/* Customer-Specific Pricing */}
          <CustomerPricingSection
            pricingMap={pricingMap}
            onPricingMapChange={setPricingMap}
            basePrice={basePrice}
            customers={customers}
            disabled={updateProductMutation.isPending}
            defaultExpanded={existingPricing && existingPricing.length > 0}
          />

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

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={showStockAdjustment}
        onOpenChange={setShowStockAdjustment}
        product={product}
        onSuccess={() => {
          setShowStockAdjustment(false);
          // Refresh product data by refetching
          onSuccess();
        }}
      />
    </Dialog>
  );
}
