'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@joho-erp/ui';
import { Loader2, DollarSign, Calendar, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { formatAUD, parseToCents, formatCentsForInput } from '@joho-erp/shared';

type Customer = {
  id: string;
  businessName: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
};

type Pricing = {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  customer?: {
    businessName: string;
  } | null;
  product?: {
    sku: string;
    name: string;
    basePrice: number;
  } | null;
};

interface SetPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricing: Pricing | null;
  customers: Customer[];
  products: Product[];
  onSuccess: () => void;
}

export function SetPriceDialog({
  open,
  onOpenChange,
  pricing,
  customers,
  products,
  onSuccess,
}: SetPriceDialogProps) {
  const t = useTranslations('pricingDialog');
  const [customerId, setCustomerId] = useState(pricing?.customerId || '');
  const [productId, setProductId] = useState(pricing?.productId || '');
  // Convert cents to dollars for display in the input
  const [customPrice, setCustomPrice] = useState(
    pricing?.customPrice ? formatCentsForInput(pricing.customPrice) : ''
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    pricing?.effectiveFrom
      ? new Date(pricing.effectiveFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [effectiveTo, setEffectiveTo] = useState(
    pricing?.effectiveTo
      ? new Date(pricing.effectiveTo).toISOString().split('T')[0]
      : ''
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(''); // For API/mutation errors

  // Clear individual field error
  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[field];
      setFieldErrors(newErrors);
    }
  };

  // Reset form when dialog opens/closes or pricing changes
  useEffect(() => {
    if (open) {
      setCustomerId(pricing?.customerId || '');
      setProductId(pricing?.productId || '');
      // Convert cents to dollars for display
      setCustomPrice(pricing?.customPrice ? formatCentsForInput(pricing.customPrice) : '');
      setEffectiveFrom(
        pricing?.effectiveFrom
          ? new Date(pricing.effectiveFrom).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setEffectiveTo(
        pricing?.effectiveTo
          ? new Date(pricing.effectiveTo).toISOString().split('T')[0]
          : ''
      );
      setFieldErrors({});
      setError('');
    }
  }, [open, pricing]);

  const setPriceMutation = api.pricing.setCustomerPrice.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!customerId) {
      errors.customerId = t('pricing.validation.customerRequired');
      isValid = false;
    }

    if (!productId) {
      errors.productId = t('pricing.validation.productRequired');
      isValid = false;
    }

    if (!customPrice?.trim()) {
      errors.customPrice = t('pricing.validation.priceRequired');
      isValid = false;
    } else {
      const priceInCents = parseToCents(customPrice);
      if (priceInCents === null || priceInCents <= 0) {
        errors.customPrice = t('pricing.validation.pricePositive');
        isValid = false;
      }
    }

    if (!effectiveFrom) {
      errors.effectiveFrom = t('pricing.validation.effectiveFromRequired');
      isValid = false;
    }

    // Date range validation
    if (effectiveTo && effectiveFrom) {
      const fromDate = new Date(effectiveFrom);
      const toDate = new Date(effectiveTo);
      if (toDate < fromDate) {
        errors.effectiveTo = t('pricing.validation.effectiveToInvalid');
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    // Convert dollars to cents for API
    const priceInCents = parseToCents(customPrice);

    await setPriceMutation.mutateAsync({
      customerId,
      productId,
      customPrice: priceInCents!, // Send cents to API (validated above)
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
    });
  };

  const selectedProduct = products.find((p) => p.id === productId);
  // Calculate discount (both basePrice and customPrice in cents)
  const customPriceInCents = customPrice ? parseToCents(customPrice) : null;
  const discount = selectedProduct && customPriceInCents
    ? selectedProduct.basePrice - customPriceInCents // Both in cents
    : 0;
  const discountPct = selectedProduct && customPriceInCents && discount > 0
    ? ((discount / selectedProduct.basePrice) * 100).toFixed(1)
    : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {pricing ? t('title.edit') : t('title.create')}
          </DialogTitle>
          <DialogDescription>
            {pricing
              ? t('description.edit')
              : t('description.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Select */}
          <div>
            <Label htmlFor="customer">{t('fields.customer')}</Label>
            <select
              id="customer"
              className="w-full px-3 py-2 border rounded-md mt-1"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                clearFieldError('customerId');
              }}
              disabled={!!pricing}
              required
            >
              <option value="">{t('placeholders.selectCustomer')}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.businessName}
                </option>
              ))}
            </select>
            {fieldErrors.customerId && (
              <p className="text-sm text-destructive mt-1">{fieldErrors.customerId}</p>
            )}
            {pricing && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('messages.cannotChangeCustomer')}
              </p>
            )}
          </div>

          {/* Product Select */}
          <div>
            <Label htmlFor="product">{t('fields.product')}</Label>
            <select
              id="product"
              className="w-full px-3 py-2 border rounded-md mt-1"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                clearFieldError('productId');
              }}
              disabled={!!pricing}
              required
            >
              <option value="">{t('placeholders.selectProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name} ({formatAUD(product.basePrice)})
                </option>
              ))}
            </select>
            {fieldErrors.productId && (
              <p className="text-sm text-destructive mt-1">{fieldErrors.productId}</p>
            )}
            {pricing && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('messages.cannotChangeProduct')}
              </p>
            )}
          </div>

          {/* Base Price Display */}
          {selectedProduct && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('fields.basePrice')}</span>
                <span className="text-lg font-bold">
                  {formatAUD(selectedProduct.basePrice)}
                </span>
              </div>
            </div>
          )}

          {/* Custom Price Input */}
          <div>
            <Label htmlFor="customPrice">{t('fields.customPrice')}</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={customPrice}
                onChange={(e) => {
                  setCustomPrice(e.target.value);
                  clearFieldError('customPrice');
                }}
                className="pl-10"
                required
              />
            </div>
            {fieldErrors.customPrice && (
              <p className="text-sm text-destructive mt-1">{fieldErrors.customPrice}</p>
            )}
          </div>

          {/* Savings Display */}
          {discount > 0 && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">
                  {t('messages.customerSaves', { amount: formatAUD(discount), percent: discountPct })}
                </span>
              </div>
            </div>
          )}

          {/* Effective From Date */}
          <div>
            <Label htmlFor="effectiveFrom">{t('fields.effectiveFrom')}</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="effectiveFrom"
                type="date"
                value={effectiveFrom}
                onChange={(e) => {
                  setEffectiveFrom(e.target.value);
                  clearFieldError('effectiveFrom');
                }}
                className="pl-10"
                required
              />
            </div>
            {fieldErrors.effectiveFrom && (
              <p className="text-sm text-destructive mt-1">{fieldErrors.effectiveFrom}</p>
            )}
          </div>

          {/* Effective To Date (Optional) */}
          <div>
            <Label htmlFor="effectiveTo">{t('fields.effectiveTo')}</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="effectiveTo"
                type="date"
                value={effectiveTo}
                onChange={(e) => {
                  setEffectiveTo(e.target.value);
                  clearFieldError('effectiveTo');
                }}
                className="pl-10"
              />
            </div>
            {fieldErrors.effectiveTo && (
              <p className="text-sm text-destructive mt-1">{fieldErrors.effectiveTo}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {t('messages.noExpiration')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setPriceMutation.isPending}
            >
              {t('buttons.cancel')}
            </Button>
            <Button type="submit" disabled={setPriceMutation.isPending}>
              {setPriceMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {pricing ? t('buttons.updatePrice') : t('buttons.setPrice')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
