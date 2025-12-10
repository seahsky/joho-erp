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
import { formatCurrency, parseToCents, formatCentsForInput } from '@joho-erp/shared';

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
  const t = useTranslations();
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
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId || !productId || !customPrice) {
      setError(t('pricingDialog.validation.requiredFields'));
      return;
    }

    // Convert dollars to cents for API
    const priceInCents = parseToCents(customPrice);
    if (priceInCents === null || priceInCents <= 0) {
      setError(t('pricingDialog.validation.positivePrice'));
      return;
    }

    await setPriceMutation.mutateAsync({
      customerId,
      productId,
      customPrice: priceInCents, // Send cents to API
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
            {pricing ? t('pricingDialog.title.edit') : t('pricingDialog.title.create')}
          </DialogTitle>
          <DialogDescription>
            {pricing
              ? t('pricingDialog.description.edit')
              : t('pricingDialog.description.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Select */}
          <div>
            <Label htmlFor="customer">{t('pricingDialog.fields.customer')}</Label>
            <select
              id="customer"
              className="w-full px-3 py-2 border rounded-md mt-1"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={!!pricing}
              required
            >
              <option value="">{t('pricingDialog.placeholders.selectCustomer')}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.businessName}
                </option>
              ))}
            </select>
            {pricing && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('pricingDialog.messages.cannotChangeCustomer')}
              </p>
            )}
          </div>

          {/* Product Select */}
          <div>
            <Label htmlFor="product">{t('pricingDialog.fields.product')}</Label>
            <select
              id="product"
              className="w-full px-3 py-2 border rounded-md mt-1"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!!pricing}
              required
            >
              <option value="">{t('pricingDialog.placeholders.selectProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name} ({formatCurrency(product.basePrice)})
                </option>
              ))}
            </select>
            {pricing && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('pricingDialog.messages.cannotChangeProduct')}
              </p>
            )}
          </div>

          {/* Base Price Display */}
          {selectedProduct && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('pricingDialog.fields.basePrice')}</span>
                <span className="text-lg font-bold">
                  {formatCurrency(selectedProduct.basePrice)}
                </span>
              </div>
            </div>
          )}

          {/* Custom Price Input */}
          <div>
            <Label htmlFor="customPrice">{t('pricingDialog.fields.customPrice')}</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Savings Display */}
          {discount > 0 && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <div className="flex items-center gap-2 text-green-700">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">
                  {t('pricingDialog.messages.customerSaves', { amount: formatCurrency(discount), percent: discountPct })}
                </span>
              </div>
            </div>
          )}

          {/* Effective From Date */}
          <div>
            <Label htmlFor="effectiveFrom">{t('pricingDialog.fields.effectiveFrom')}</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="effectiveFrom"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Effective To Date (Optional) */}
          <div>
            <Label htmlFor="effectiveTo">{t('pricingDialog.fields.effectiveTo')}</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="effectiveTo"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('pricingDialog.messages.noExpiration')}
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
              {t('pricingDialog.buttons.cancel')}
            </Button>
            <Button type="submit" disabled={setPriceMutation.isPending}>
              {setPriceMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {pricing ? t('pricingDialog.buttons.updatePrice') : t('pricingDialog.buttons.setPrice')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
