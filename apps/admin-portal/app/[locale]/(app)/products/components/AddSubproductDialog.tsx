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
  Badge,
} from '@joho-erp/ui';
import { Loader2, GitBranch, Package } from 'lucide-react';
import { api } from '@/trpc/client';
import { parseToCents, formatAUD, calculateSubproductStock } from '@joho-erp/shared';
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

type ParentProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
  basePrice: number;
};

interface AddSubproductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  parentProduct: ParentProduct | null;
}

export function AddSubproductDialog({
  open,
  onOpenChange,
  onSuccess,
  parentProduct,
}: AddSubproductDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('productForm');
  const tSubproduct = useTranslations('subproduct');

  // Form state
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState('');
  const [applyGst, setApplyGst] = useState(false);
  const [gstRate, setGstRate] = useState('10');
  const [estimatedLossPercentage, setEstimatedLossPercentage] = useState('');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tempProductId] = useState(() => crypto.randomUUID());
  const [isUploading, setIsUploading] = useState(false);

  // Pricing state
  const [pricingMap, setPricingMap] = useState<Map<string, PricingEntry>>(new Map());

  // Field error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
        title: t('messages.categoryCreated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('messages.categoryCreateError'),
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

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
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
      const formData = new FormData();
      formData.append('file', processedFile, file.name);
      formData.append('productId', tempProductId);

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

  const createSubproductMutation = api.product.createSubproduct.useMutation({
    onSuccess: (result) => {
      const priceText = result.pricingCount === 1
        ? t('messages.customPrice')
        : t('messages.customPrices');
      toast({
        title: tSubproduct('messages.subproductCreated'),
        description: `${t('messages.productCreatedWith')} ${result.pricingCount} ${priceText}`,
      });
      handleReset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: tSubproduct('messages.errorCreating'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const customers = useMemo(
    () => (customersData?.customers || []) as Customer[],
    [customersData?.customers]
  );

  // Calculate virtual stock based on parent stock and loss percentage
  const calculatedStock = useMemo(() => {
    if (!parentProduct || !estimatedLossPercentage) return null;
    const loss = parseFloat(estimatedLossPercentage);
    if (isNaN(loss) || loss < 0 || loss >= 100) return null;
    return calculateSubproductStock(parentProduct.currentStock, loss);
  }, [parentProduct, estimatedLossPercentage]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  const validateForm = (): { isValid: boolean; gstRateValue?: number; lossPercentage: number } => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // SKU validation
    if (!sku?.trim()) {
      errors.sku = t('validation.skuRequired');
      isValid = false;
    }

    // Name validation
    if (!name?.trim()) {
      errors.name = t('validation.nameRequired');
      isValid = false;
    }

    // Base price validation
    if (!basePrice?.trim()) {
      errors.basePrice = t('validation.basePriceRequired');
      isValid = false;
    } else {
      const basePriceInCents = parseToCents(basePrice);
      if (basePriceInCents === null || basePriceInCents <= 0) {
        errors.basePrice = t('validation.basePricePositive');
        isValid = false;
      }
    }

    // Loss percentage validation (required for subproducts)
    let lossPercentage = 0;
    if (!estimatedLossPercentage?.trim()) {
      errors.estimatedLossPercentage = tSubproduct('validation.lossPercentageRequired');
      isValid = false;
    } else {
      lossPercentage = parseFloat(estimatedLossPercentage);
      if (isNaN(lossPercentage) || lossPercentage < 0 || lossPercentage >= 100) {
        errors.estimatedLossPercentage = tSubproduct('validation.lossPercentageRange');
        isValid = false;
      }
    }

    // GST rate validation if GST is applied
    let gstRateValue: number | undefined;
    if (applyGst) {
      gstRateValue = parseFloat(gstRate);
      if (isNaN(gstRateValue) || gstRateValue < 0 || gstRateValue > 100) {
        errors.gstRate = t('validation.gstRateRange');
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return { isValid, gstRateValue, lossPercentage };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentProduct) {
      toast({
        title: tSubproduct('validation.parentRequired'),
        variant: 'destructive',
      });
      return;
    }

    const validation = validateForm();
    if (!validation.isValid) {
      toast({
        title: t('validation.invalidInput'),
        description: t('validation.fixErrors'),
        variant: 'destructive',
      });
      return;
    }

    const basePriceInCents = parseToCents(basePrice)!;
    const gstRateValue = validation.gstRateValue;

    // Build customer pricing array
    const customerPricing = Array.from(pricingMap.entries())
      .filter(([_, entry]) => entry.enabled && entry.customPrice > 0)
      .map(([customerId, entry]) => {
        const customPriceInCents = parseToCents(entry.customPrice.toString());
        if (!customPriceInCents || customPriceInCents <= 0) {
          return null;
        }
        return {
          customerId,
          customPrice: customPriceInCents,
        };
      })
      .filter((p): p is { customerId: string; customPrice: number } => p !== null);

    await createSubproductMutation.mutateAsync({
      parentProductId: parentProduct.id,
      sku,
      name,
      description: description || undefined,
      categoryId: categoryId || undefined,
      basePrice: basePriceInCents,
      applyGst,
      gstRate: gstRateValue,
      estimatedLossPercentage: validation.lossPercentage,
      imageUrl: imageUrl || undefined,
      customerPricing: customerPricing.length > 0 ? customerPricing : undefined,
    });
  };

  const handleReset = () => {
    setSku('');
    setName('');
    setDescription('');
    setCategoryId(null);
    setBasePrice('');
    setApplyGst(false);
    setGstRate('10');
    setEstimatedLossPercentage('');
    setImageUrl(null);
    setPricingMap(new Map());
    setFieldErrors({});
  };

  if (!parentProduct) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {tSubproduct('dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {tSubproduct('dialog.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Parent Product Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            {tSubproduct('parentProduct')}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('fields.sku')}:</span>
              <span className="ml-2 font-mono">{parentProduct.sku}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('fields.name')}:</span>
              <span className="ml-2">{parentProduct.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{tSubproduct('currentStock')}:</span>
              <span className="ml-2">{parentProduct.currentStock} {parentProduct.unit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('fields.basePrice')}:</span>
              <span className="ml-2">{formatAUD(parentProduct.basePrice)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Subproduct Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{tSubproduct('sections.subproductDetails')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">{t('fields.skuRequired')}</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value);
                    clearFieldError('sku');
                  }}
                  placeholder={t('fields.skuPlaceholder')}
                  required
                />
                {fieldErrors.sku && (
                  <p className="text-sm text-destructive">{fieldErrors.sku}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t('fields.nameRequired')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError('name');
                  }}
                  placeholder={t('fields.namePlaceholder')}
                  required
                />
                {fieldErrors.name && (
                  <p className="text-sm text-destructive">{fieldErrors.name}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('fields.description')}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('fields.descriptionPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('fields.category')}</Label>
              <CategorySelect
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  clearFieldError('categoryId');
                }}
                categories={categories}
                onCreateCategory={handleCreateCategory}
                isCreating={createCategoryMutation.isPending}
                disabled={createSubproductMutation.isPending}
                labels={{
                  selectCategory: t('fields.selectCategory'),
                  createCategory: t('fields.createCategory'),
                  searchPlaceholder: t('fields.searchCategories'),
                  noCategories: t('fields.noCategories'),
                  newCategoryName: t('fields.newCategoryName'),
                  creating: t('fields.creatingCategory'),
                }}
              />
            </div>
          </div>

          {/* Product Image */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('sections.productImage')}</h3>
            <ProductImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              disabled={createSubproductMutation.isPending}
              isUploading={isUploading}
              labels={{
                uploadTitle: t('image.uploadTitle'),
                uploadSubtitle: t('image.uploadSubtitle'),
                change: t('image.change'),
                remove: t('image.remove'),
                uploading: t('image.uploading'),
                errorInvalidType: t('upload.errorInvalidType'),
                errorFileTooLarge: t('upload.errorFileTooLarge'),
                errorUploadFailed: t('upload.errorUploadFailed'),
                errorRemoveFailed: t('upload.errorRemoveFailed'),
              }}
            />
          </div>

          {/* Subproduct Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{tSubproduct('sections.subproductSettings')}</h3>

            {/* Unit (inherited, readonly) */}
            <div className="space-y-2">
              <Label>{t('fields.unit')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={parentProduct.unit.toUpperCase()}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed w-40"
                />
                <Badge variant="secondary">{tSubproduct('inheritedFromParent')}</Badge>
              </div>
            </div>

            {/* Loss Percentage */}
            <div className="space-y-2">
              <Label htmlFor="estimatedLossPercentage">{tSubproduct('fields.lossPercentageRequired')}</Label>
              <Input
                id="estimatedLossPercentage"
                type="number"
                step="0.1"
                min="0"
                max="99"
                value={estimatedLossPercentage}
                onChange={(e) => {
                  setEstimatedLossPercentage(e.target.value);
                  clearFieldError('estimatedLossPercentage');
                }}
                placeholder={tSubproduct('fields.lossPercentagePlaceholder')}
                required
              />
              {fieldErrors.estimatedLossPercentage && (
                <p className="text-sm text-destructive">{fieldErrors.estimatedLossPercentage}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {tSubproduct('fields.lossPercentageHelp')}
              </p>
            </div>

            {/* Calculated Stock Preview */}
            {calculatedStock !== null && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {tSubproduct('calculatedStockPreview')}
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {calculatedStock.toFixed(2)} {parentProduct.unit}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {tSubproduct('calculatedStockFormula', {
                    parentStock: parentProduct.currentStock,
                    lossPercentage: estimatedLossPercentage,
                  })}
                </p>
              </div>
            )}

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">{t('fields.basePrice')}</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => {
                    setBasePrice(e.target.value);
                    clearFieldError('basePrice');
                  }}
                  placeholder={t('fields.basePricePlaceholder')}
                  required
                />
                {fieldErrors.basePrice && (
                  <p className="text-sm text-destructive">{fieldErrors.basePrice}</p>
                )}
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
                  {t('fields.applyGst')}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                {t('fields.applyGstDescription')}
              </p>

              {applyGst && (
                <div className="ml-6 w-1/2 space-y-2">
                  <Label htmlFor="gstRate">{t('fields.gstRate')}</Label>
                  <Input
                    id="gstRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={gstRate}
                    onChange={(e) => {
                      setGstRate(e.target.value);
                      clearFieldError('gstRate');
                    }}
                    placeholder={t('fields.gstRatePlaceholder')}
                  />
                  {fieldErrors.gstRate && (
                    <p className="text-sm text-destructive">{fieldErrors.gstRate}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer-Specific Pricing */}
          <CustomerPricingSection
            pricingMap={pricingMap}
            onPricingMapChange={setPricingMap}
            basePrice={basePrice}
            customers={customers}
            disabled={createSubproductMutation.isPending}
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
              disabled={createSubproductMutation.isPending}
            >
              {t('buttons.cancel')}
            </Button>
            <Button type="submit" disabled={createSubproductMutation.isPending}>
              {createSubproductMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {tSubproduct('buttons.createSubproduct')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
