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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@joho-erp/ui';
import { Loader2, Package, PackagePlus, HelpCircle, GitBranch } from 'lucide-react';
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
  // Subproduct fields
  parentProductId?: string | null;
  parentProduct?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    estimatedLossPercentage?: number | null;
  } | null;
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
  const t = useTranslations('productForm');
  const tSubproduct = useTranslations('subproduct');
  const tErrors = useTranslations('errors');

  // Determine if editing a subproduct
  const isSubproduct = !!product?.parentProductId;

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
  const [inheritLossRate, setInheritLossRate] = useState(false);
  const [status, setStatus] = useState<'active' | 'discontinued' | 'out_of_stock'>('active');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pricing state
  const [pricingMap, setPricingMap] = useState<Map<string, PricingEntry>>(new Map());

  // Stock adjustment dialog state
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);

  // Field error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
        title: t('messages.categoryCreated'),
      });
    },
    onError: (error) => {
      console.error('Category create error:', error.message);
      toast({
        title: t('messages.categoryCreateError'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleCreateCategory = async (name: string) => {
    return await createCategoryMutation.mutateAsync({ name });
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  const validateForm = (): { isValid: boolean; gstRateValue?: number; lossPercentage?: number | null } => {
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

    // Unit validation (should always have value due to default, but check anyway)
    if (!unit) {
      errors.unit = t('validation.unitRequired');
      isValid = false;
    }

    // Package size validation (if provided)
    if (packageSize && (isNaN(parseFloat(packageSize)) || parseFloat(packageSize) <= 0)) {
      errors.packageSize = t('validation.packageSizePositive');
      isValid = false;
    }

    // Category validation
    if (!categoryId) {
      errors.categoryId = t('validation.categoryRequired');
      isValid = false;
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

    // Estimated loss percentage validation
    // For subproducts that inherit, use null; otherwise validate the custom value
    let lossPercentage: number | null | undefined;
    if (isSubproduct && inheritLossRate) {
      // Subproduct is inheriting from parent - send null
      lossPercentage = null;
    } else if (estimatedLossPercentage) {
      lossPercentage = parseFloat(estimatedLossPercentage);
      if (isNaN(lossPercentage) || lossPercentage < 0 || lossPercentage > 100) {
        errors.estimatedLossPercentage = t('validation.lossPercentageRange');
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return { isValid, gstRateValue, lossPercentage };
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
      // For subproducts, null estimatedLossPercentage means inherit from parent
      const isInheriting = product.parentProductId && product.estimatedLossPercentage === null;
      setInheritLossRate(!!isInheriting);
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
        title: t('messages.productUpdated'),
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Product update error:', error.message);
      toast({
        title: t('messages.errorUpdating'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    const validation = validateForm();
    if (!validation.isValid) {
      toast({
        title: t('validation.invalidInput'),
        description: t('validation.fixErrors'),
        variant: 'destructive',
      });
      return;
    }

    // Convert basePrice from dollars to cents (already validated in validateForm)
    const basePriceInCents = parseToCents(basePrice)!;

    // Use validated values from validateForm
    const gstRateValue: number | null | undefined = validation.gstRateValue ?? null;
    const lossPercentage: number | null | undefined = validation.lossPercentage ?? null;

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
            {isSubproduct ? (
              <GitBranch className="h-5 w-5" />
            ) : (
              <Package className="h-5 w-5" />
            )}
            {isSubproduct ? tSubproduct('dialog.editTitle') : t('editDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {isSubproduct ? tSubproduct('dialog.editDescription') : t('editDialog.description')}
          </DialogDescription>
          {/* Show parent product info for subproducts */}
          {isSubproduct && product?.parentProduct && (
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{tSubproduct('parentProduct')}</p>
              <p className="font-medium">{product.parentProduct.name} ({product.parentProduct.sku})</p>
            </div>
          )}
        </DialogHeader>

        <TooltipProvider>
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Product Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('sections.productDetails')}</h3>
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
                disabled={updateProductMutation.isPending}
                labels={{
                  selectCategory: t('fields.selectCategory'),
                  createCategory: t('fields.createCategory'),
                  searchPlaceholder: t('fields.searchCategories'),
                  noCategories: t('fields.noCategories'),
                  newCategoryName: t('fields.newCategoryName'),
                  creating: t('fields.creatingCategory'),
                }}
              />
              {fieldErrors.categoryId && (
                <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>
              )}
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
              disabled={updateProductMutation.isPending}
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

          {/* Inventory Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('sections.inventoryPricing')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">{t('fields.unitRequired')}</Label>
                <select
                  id="unit"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value as 'kg' | 'piece' | 'box' | 'carton');
                    clearFieldError('unit');
                  }}
                  className={`w-full px-3 py-2 border rounded-md ${isSubproduct ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
                  required
                  disabled={isSubproduct}
                >
                  <option value="kg">{t('units.kg')}</option>
                  <option value="piece">{t('units.piece')}</option>
                  <option value="box">{t('units.box')}</option>
                  <option value="carton">{t('units.carton')}</option>
                </select>
                {isSubproduct && (
                  <p className="text-sm text-muted-foreground">{tSubproduct('inheritedFromParent')}</p>
                )}
                {fieldErrors.unit && (
                  <p className="text-sm text-destructive">{fieldErrors.unit}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageSize">{t('fields.packageSize')}</Label>
                <Input
                  id="packageSize"
                  type="number"
                  step="0.01"
                  value={packageSize}
                  onChange={(e) => {
                    setPackageSize(e.target.value);
                    clearFieldError('packageSize');
                  }}
                  placeholder={t('fields.packageSizePlaceholder')}
                />
                {fieldErrors.packageSize && (
                  <p className="text-sm text-destructive">{fieldErrors.packageSize}</p>
                )}
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentStock">{t('fields.currentStockReadOnly')}</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={currentStock}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                {isSubproduct ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tSubproduct('table.virtualStockTooltip')}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('fields.stockAdjustmentHint')}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStockAdjustment(true)}
                      className="mt-2"
                    >
                      <PackagePlus className="mr-2 h-4 w-4" />
                      {t('buttons.adjustStock')}
                    </Button>
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="lowStockThreshold">{t('fields.lowStockThreshold')}</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder={t('fields.lowStockThresholdPlaceholder')}
                />
              </div>
            </div>

            {/* Loss Percentage - with inheritance toggle for subproducts */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <Label htmlFor="estimatedLossPercentage">{t('fields.estimatedLossPercentage')}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{t('fields.estimatedLossPercentageTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Inheritance toggle for subproducts */}
              {isSubproduct && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inheritLossRate"
                    checked={inheritLossRate}
                    onCheckedChange={(checked: boolean) => {
                      setInheritLossRate(checked);
                      if (checked) {
                        clearFieldError('estimatedLossPercentage');
                      }
                    }}
                  />
                  <Label htmlFor="inheritLossRate" className="cursor-pointer">
                    {tSubproduct('fields.inheritLossRate')}
                  </Label>
                </div>
              )}

              {/* Show parent's loss rate when inheriting */}
              {isSubproduct && inheritLossRate && (
                <div className="ml-6 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    {tSubproduct('fields.usingParentLossRate', {
                      rate: product?.parentProduct?.estimatedLossPercentage ?? 0,
                    })}
                  </p>
                  {(product?.parentProduct?.estimatedLossPercentage === null || product?.parentProduct?.estimatedLossPercentage === 0) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {tSubproduct('fields.parentHasNoLoss')}
                    </p>
                  )}
                </div>
              )}

              {/* Custom loss percentage input */}
              {(!isSubproduct || !inheritLossRate) && (
                <div className={isSubproduct ? 'ml-6' : ''}>
                  <Input
                    id="estimatedLossPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={estimatedLossPercentage}
                    onChange={(e) => {
                      setEstimatedLossPercentage(e.target.value);
                      clearFieldError('estimatedLossPercentage');
                    }}
                    placeholder={t('fields.lossPercentagePlaceholder')}
                  />
                  {fieldErrors.estimatedLossPercentage && (
                    <p className="text-sm text-destructive">{fieldErrors.estimatedLossPercentage}</p>
                  )}
                  {estimatedLossPercentage && !fieldErrors.estimatedLossPercentage && (
                    <p className="text-sm text-muted-foreground">
                      {t('fields.expectedYield')}: {(100 - parseFloat(estimatedLossPercentage || '0')).toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">{t('fields.status')}</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'discontinued' | 'out_of_stock')}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="active">{t('statuses.active')}</option>
                  <option value="discontinued">{t('statuses.discontinued')}</option>
                  <option value="out_of_stock">{t('statuses.out_of_stock')}</option>
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
              {t('buttons.cancel')}
            </Button>
            <Button type="submit" disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t('buttons.updateProduct')}
            </Button>
          </div>
          </form>
        </TooltipProvider>
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
