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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Badge,
  ProductImageUpload,
} from '@joho-erp/ui';
import {
  Loader2,
  DollarSign,
  Package,
  Search,
  Percent,
  Tag,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCurrency, parseToCents } from '@joho-erp/shared';
import type { ProductCategory } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';

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

type PricingEntry = {
  enabled: boolean;
  customPrice: number;
};

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
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [unit, setUnit] = useState<'kg' | 'piece' | 'box' | 'carton'>('kg');
  const [packageSize, setPackageSize] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [status, setStatus] = useState<'active' | 'discontinued' | 'out_of_stock'>('active');

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tempProductId] = useState(() => crypto.randomUUID());

  // Pricing state
  const [pricingMap, setPricingMap] = useState<Map<string, PricingEntry>>(new Map());
  const [customerSearch, setCustomerSearch] = useState('');
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('');
  const [bulkDiscountAmount, setBulkDiscountAmount] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Fetch customers for pricing
  const { data: customersData } = api.customer.getAll.useQuery({
    limit: 1000,
  });

  // Image upload mutations
  const uploadUrlMutation = api.upload.getProductImageUploadUrl.useMutation();
  const deleteImageMutation = api.upload.deleteProductImage.useMutation();

  // Handle image upload with compression
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
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

    // Get presigned URL
    const { uploadUrl, publicUrl } = await uploadUrlMutation.mutateAsync({
      productId: tempProductId,
      filename: file.name,
      contentType: processedFile.type as 'image/jpeg' | 'image/png' | 'image/jpg' | 'image/webp',
      contentLength: processedFile.size,
    });

    // Upload to R2
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: processedFile,
      headers: {
        'Content-Type': processedFile.type,
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return publicUrl;
  }, [tempProductId, uploadUrlMutation]);

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

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Search filter
    if (customerSearch) {
      filtered = filtered.filter((c) =>
        c.businessName.toLowerCase().includes(customerSearch.toLowerCase())
      );
    }

    // Show only selected filter
    if (showOnlySelected) {
      filtered = filtered.filter((c) => pricingMap.get(c.id)?.enabled);
    }

    return filtered;
  }, [customers, customerSearch, showOnlySelected, pricingMap]);

  // Calculate total savings and selected count
  const { selectedCount, totalSavings } = useMemo(() => {
    let count = 0;
    let savings = 0;
    const bp = parseFloat(basePrice) || 0;

    pricingMap.forEach((entry) => {
      if (entry.enabled && entry.customPrice > 0) {
        count++;
        const discount = bp - entry.customPrice;
        if (discount > 0) savings += discount;
      }
    });

    return { selectedCount: count, totalSavings: savings };
  }, [pricingMap, basePrice]);

  const handleTogglePricing = (customerId: string) => {
    const newMap = new Map(pricingMap);
    const current = newMap.get(customerId);

    if (current) {
      newMap.set(customerId, { ...current, enabled: !current.enabled });
    } else {
      newMap.set(customerId, { enabled: true, customPrice: parseFloat(basePrice) || 0 });
    }

    setPricingMap(newMap);
  };

  const handlePriceChange = (customerId: string, price: string) => {
    const newMap = new Map(pricingMap);
    const current = newMap.get(customerId) || { enabled: true, customPrice: 0 };
    newMap.set(customerId, { ...current, customPrice: parseFloat(price) || 0 });
    setPricingMap(newMap);
  };

  const handleApplyPercentDiscount = () => {
    const percent = parseFloat(bulkDiscountPercent);
    const bp = parseFloat(basePrice);

    if (isNaN(percent) || isNaN(bp) || bp <= 0) {
      toast({
        title: t('productForm.validation.invalidInput'),
        description: t('productForm.validation.invalidPercentAndPrice'),
        variant: 'destructive',
      });
      return;
    }

    const newMap = new Map(pricingMap);
    filteredCustomers.forEach((customer) => {
      const current = newMap.get(customer.id);
      if (current?.enabled || !newMap.has(customer.id)) {
        const discountedPrice = bp * (1 - percent / 100);
        newMap.set(customer.id, { enabled: true, customPrice: discountedPrice });
      }
    });

    setPricingMap(newMap);
    setBulkDiscountPercent('');
    toast({
      title: t('productForm.messages.discountApplied'),
      description: t('productForm.messages.percentDiscountApplied', {
        percent: percent,
        count: filteredCustomers.length
      }),
    });
  };

  const handleApplyAmountDiscount = () => {
    const amount = parseFloat(bulkDiscountAmount);
    const bp = parseFloat(basePrice);

    if (isNaN(amount) || isNaN(bp) || bp <= 0) {
      toast({
        title: t('productForm.validation.invalidInput'),
        description: t('productForm.validation.invalidAmountAndPrice'),
        variant: 'destructive',
      });
      return;
    }

    const newMap = new Map(pricingMap);
    filteredCustomers.forEach((customer) => {
      const current = newMap.get(customer.id);
      if (current?.enabled || !newMap.has(customer.id)) {
        const discountedPrice = Math.max(0, bp - amount);
        newMap.set(customer.id, { enabled: true, customPrice: discountedPrice });
      }
    });

    setPricingMap(newMap);
    setBulkDiscountAmount('');
    toast({
      title: t('productForm.messages.discountApplied'),
      description: t('productForm.messages.amountDiscountApplied', {
        amount: amount.toFixed(2),
        count: filteredCustomers.length
      }),
    });
  };

  const handleClearAllPricing = () => {
    setPricingMap(new Map());
    toast({
      title: t('productForm.messages.pricingCleared'),
      description: t('productForm.messages.pricingClearedDescription'),
    });
  };

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
      category: category || undefined,
      unit,
      packageSize: packageSize ? parseFloat(packageSize) : undefined,
      basePrice: basePriceInCents, // Send cents to API
      currentStock: parseInt(currentStock) || 0,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : undefined,
      status,
      imageUrl: imageUrl || undefined,
      customerPricing: customerPricing.length > 0 ? customerPricing : undefined,
    });
  };

  const handleReset = () => {
    setSku('');
    setName('');
    setDescription('');
    setCategory('');
    setUnit('kg');
    setPackageSize('');
    setBasePrice('');
    setCurrentStock('0');
    setLowStockThreshold('');
    setStatus('active');
    setImageUrl(null);
    setPricingMap(new Map());
    setCustomerSearch('');
    setBulkDiscountPercent('');
    setBulkDiscountAmount('');
    setShowOnlySelected(false);
  };

  const calculateDiscount = (customPrice: number) => {
    const bp = parseFloat(basePrice);
    if (isNaN(bp) || bp <= 0) return { amount: 0, percent: 0 };

    const discount = bp - customPrice;
    const percent = (discount / bp) * 100;
    return { amount: discount, percent };
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
              disabled={createProductMutation.isPending}
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

          {/* Customer-Specific Pricing (Accordion) */}
          <Accordion type="single" collapsible>
            <AccordionItem value="pricing">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t('productForm.sections.customerPricing')}
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedCount} {t(selectedCount === 1 ? 'productForm.pricing.oneCustomer' : 'productForm.pricing.customers')}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Bulk Actions */}
                  <div className="bg-muted p-3 rounded-md space-y-3">
                    <h4 className="text-sm font-medium">{t('productForm.bulkActions.title')}</h4>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor="bulkPercent" className="text-xs">{t('productForm.bulkActions.applyPercentDiscount')}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="bulkPercent"
                            type="number"
                            step="0.1"
                            value={bulkDiscountPercent}
                            onChange={(e) => setBulkDiscountPercent(e.target.value)}
                            placeholder={t('productForm.bulkActions.percentPlaceholder')}
                            className="w-24"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleApplyPercentDiscount}
                            disabled={!bulkDiscountPercent || !basePrice}
                          >
                            <Percent className="h-4 w-4 mr-1" />
                            {t('productForm.bulkActions.apply')}
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1">
                        <Label htmlFor="bulkAmount" className="text-xs">{t('productForm.bulkActions.applyAmountDiscount')}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="bulkAmount"
                            type="number"
                            step="0.01"
                            value={bulkDiscountAmount}
                            onChange={(e) => setBulkDiscountAmount(e.target.value)}
                            placeholder={t('productForm.bulkActions.amountPlaceholder')}
                            className="w-24"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleApplyAmountDiscount}
                            disabled={!bulkDiscountAmount || !basePrice}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            {t('productForm.bulkActions.apply')}
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleClearAllPricing}
                        disabled={selectedCount === 0}
                      >
                        {t('productForm.bulkActions.clearAll')}
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{selectedCount} {t('productForm.pricing.selected')}</span>
                      {totalSavings > 0 && (
                        <span className="text-green-600 font-medium">
                          {t('productForm.pricing.totalSavings')}: {formatCurrency(totalSavings)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Search & Filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('productForm.pricing.searchPlaceholder')}
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={showOnlySelected ? 'default' : 'outline'}
                      onClick={() => setShowOnlySelected(!showOnlySelected)}
                    >
                      <Tag className="h-4 w-4 mr-1" />
                      {t('productForm.pricing.selectedOnly')}
                    </Button>
                  </div>

                  {/* Customer Pricing Table */}
                  <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2 w-12"></th>
                          <th className="text-left p-2">{t('productForm.pricing.customer')}</th>
                          <th className="text-right p-2">{t('productForm.pricing.basePrice')}</th>
                          <th className="text-right p-2">{t('productForm.pricing.customPrice')}</th>
                          <th className="text-right p-2">{t('productForm.pricing.savings')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center p-4 text-muted-foreground">
                              {t('productForm.pricing.noCustomersFound')}
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map((customer) => {
                            const pricing = pricingMap.get(customer.id);
                            const isEnabled = pricing?.enabled || false;
                            const customPrice = pricing?.customPrice || parseFloat(basePrice) || 0;
                            const { amount, percent } = calculateDiscount(customPrice);

                            return (
                              <tr key={customer.id} className="border-t hover:bg-muted/50">
                                <td className="p-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePricing(customer.id)}
                                    className="hover:text-primary"
                                  >
                                    {isEnabled ? (
                                      <CheckSquare className="h-4 w-4" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                </td>
                                <td className="p-2">
                                  <div className="font-medium">{customer.businessName}</div>
                                  {customer.deliveryAddress?.area && (
                                    <div className="text-xs text-muted-foreground">
                                      {customer.deliveryAddress.area}
                                    </div>
                                  )}
                                </td>
                                <td className="text-right p-2 text-muted-foreground">
                                  {basePrice ? `$${parseFloat(basePrice).toFixed(2)}` : '-'}
                                </td>
                                <td className="text-right p-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={isEnabled ? customPrice : ''}
                                    onChange={(e) => handlePriceChange(customer.id, e.target.value)}
                                    placeholder={basePrice || '0.00'}
                                    disabled={!isEnabled}
                                    className="w-24 text-right"
                                  />
                                </td>
                                <td className="text-right p-2">
                                  {isEnabled && amount !== 0 ? (
                                    <div className={amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                      <div className="font-medium">
                                        {amount > 0 ? '-' : '+'}${Math.abs(amount).toFixed(2)}
                                      </div>
                                      <div className="text-xs">
                                        ({percent.toFixed(1)}%)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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
