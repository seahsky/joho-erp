'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { Loader2, Package } from 'lucide-react';
import { api } from '@/trpc/client';
import { parseToCents } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';
import { CategorySelect } from './CategorySelect';
import { CustomerPricingSection, type PricingEntry } from './CustomerPricingSection';

type Customer = {
  id: string;
  businessName: string;
  deliveryAddress?: {
    area?: string;
  };
};

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddProductDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddProductDialogProps) {
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
  const [gstRate, setGstRate] = useState('10'); // Default 10% (Australian GST)
  // currentStock is always 0 for new products - must use StockAdjustmentDialog after creation
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [estimatedLossPercentage, setEstimatedLossPercentage] = useState('');
  const [status, setStatus] = useState<'active' | 'discontinued' | 'out_of_stock'>('active');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tempProductId] = useState(() => crypto.randomUUID());
  const [isUploading, setIsUploading] = useState(false);

  // Pricing state
  const [pricingMap, setPricingMap] = useState<Map<string, PricingEntry>>(new Map());

  // Fetch customers for pricing
  const { data: customersData } = api.customer.getAll.useQuery({
    limit: 1000,
  });

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

  // Image delete mutation
  const deleteImageMutation = api.upload.deleteProductImage.useMutation();

  // Handle image upload with compression via proxy endpoint
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
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
      formData.append('productId', tempProductId);

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
  }, [tempProductId]);

  // Handle image delete
  const handleImageDelete = useCallback(async (url: string): Promise<void> => {
    await deleteImageMutation.mutateAsync({ imageUrl: url });
  }, [deleteImageMutation]);

  const createProductMutation = api.product.create.useMutation({
    onSuccess: (result) => {
      const priceText = result.pricingCount === 1
        ? t('productForm.messages.customPrice')
        : t('productForm.messages.customPrices');
      toast({
        title: t('productForm.messages.productCreated'),
        description: `${t('productForm.messages.productCreatedWith')} ${result.pricingCount} ${priceText}`,
      });
      handleReset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('productForm.messages.errorCreating'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const customers = useMemo(
    () => (customersData?.customers || []) as Customer[],
    [customersData?.customers]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    let gstRateValue: number | undefined;
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
    }

    // Validate estimated loss percentage if provided
    let lossPercentage: number | undefined;
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

    await createProductMutation.mutateAsync({
      sku,
      name,
      description: description || undefined,
      categoryId: categoryId || undefined,
      unit,
      packageSize: packageSize ? parseFloat(packageSize) : undefined,
      basePrice: basePriceInCents, // Send cents to API
      applyGst,
      gstRate: gstRateValue, // Only set if applyGst is true
      currentStock: 0, // Always 0 for new products - use StockAdjustmentDialog to add initial stock
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      estimatedLossPercentage: lossPercentage,
      status,
      imageUrl: imageUrl || undefined,
      customerPricing: customerPricing.length > 0 ? customerPricing : undefined,
    });
  };

  const handleReset = () => {
    setSku('');
    setName('');
    setDescription('');
    setCategoryId(null);
    setUnit('kg');
    setPackageSize('');
    setBasePrice('');
    setApplyGst(false);
    setGstRate('10');
    // currentStock is always 0, no need to reset
    setLowStockThreshold('');
    setEstimatedLossPercentage('');
    setStatus('active');
    setImageUrl(null);
    setPricingMap(new Map());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('productForm.dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('productForm.dialog.description')}
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
                disabled={createProductMutation.isPending}
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
              disabled={createProductMutation.isPending}
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
                  value="0"
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {t('productForm.fields.initialStockHint')}
                </p>
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
            disabled={createProductMutation.isPending}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={createProductMutation.isPending}
            >
              {t('productForm.buttons.cancel')}
            </Button>
            <Button type="submit" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('productForm.buttons.createProduct')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
