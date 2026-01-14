'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { parseToCents } from '@joho-erp/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  useToast,
} from '@joho-erp/ui';
import { Loader2, Search } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface LinkProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  onSuccess: () => void;
}

export function LinkProductDialog({
  open,
  onOpenChange,
  supplierId,
  onSuccess,
}: LinkProductDialogProps) {
  const t = useTranslations('supplierDetail');
  const tCommon = useTranslations('common');
  const { toast } = useToast();

  // Form state
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [supplierProductName, setSupplierProductName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [packSize, setPackSize] = useState('');
  const [moq, setMoq] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [isPreferredSupplier, setIsPreferredSupplier] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch products for dropdown (with search)
  const { data: productsData, isLoading: isLoadingProducts } = api.product.getAll.useQuery(
    {
      search: productSearch || undefined,
      limit: 50,
    },
    { enabled: open } // Only fetch when dialog is open
  );

  const products = (productsData?.items ?? []) as unknown as Product[];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setProductId('');
    setProductSearch('');
    setSupplierSku('');
    setSupplierProductName('');
    setCostPrice('');
    setPackSize('');
    setMoq('');
    setLeadTimeDays('');
    setIsPreferredSupplier(false);
    setErrors({});
  };

  const linkMutation = api.supplier.linkProduct.useMutation({
    onSuccess: () => {
      toast({
        title: t('productLinked'),
        variant: 'default',
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes('already linked')) {
        setErrors({ productId: t('productAlreadyLinked') });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!productId) {
      newErrors.productId = t('validation.productRequired');
    }

    if (!costPrice.trim()) {
      newErrors.costPrice = t('validation.costPriceRequired');
    } else {
      const cents = parseToCents(costPrice);
      if (cents === null || cents <= 0) {
        newErrors.costPrice = t('validation.costPriceInvalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    linkMutation.mutate({
      supplierId,
      productId,
      supplierSku: supplierSku.trim() || undefined,
      supplierProductName: supplierProductName.trim() || undefined,
      costPrice: parseToCents(costPrice)!,
      packSize: packSize ? parseFloat(packSize) : undefined,
      moq: moq ? parseFloat(moq) : undefined,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
      isPreferredSupplier,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t('linkProduct')}</DialogTitle>
          <DialogDescription>{t('linkProductDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Product Search & Select */}
          <div className="space-y-2">
            <Label htmlFor="productId">{t('product')} *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10 mb-2"
              />
            </div>
            <select
              id="productId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setErrors((prev) => ({ ...prev, productId: '' }));
              }}
            >
              <option value="">{t('selectProduct')}</option>
              {isLoadingProducts ? (
                <option disabled>{tCommon('loading')}</option>
              ) : products.length === 0 ? (
                <option disabled>{t('noProductsFound')}</option>
              ) : (
                products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))
              )}
            </select>
            {errors.productId && (
              <p className="text-sm text-destructive">{errors.productId}</p>
            )}
          </div>

          {/* Cost Price (required) */}
          <div className="space-y-2">
            <Label htmlFor="costPrice">{t('costPrice')} *</Label>
            <Input
              id="costPrice"
              type="text"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => {
                setCostPrice(e.target.value);
                setErrors((prev) => ({ ...prev, costPrice: '' }));
              }}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">{t('enterDollars')}</p>
            {errors.costPrice && (
              <p className="text-sm text-destructive">{errors.costPrice}</p>
            )}
          </div>

          {/* Supplier's Product Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierSku">{t('supplierSku')}</Label>
              <Input
                id="supplierSku"
                value={supplierSku}
                onChange={(e) => setSupplierSku(e.target.value)}
                placeholder={t('supplierSkuPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierProductName">{t('supplierProductName')}</Label>
              <Input
                id="supplierProductName"
                value={supplierProductName}
                onChange={(e) => setSupplierProductName(e.target.value)}
                placeholder={t('supplierProductNamePlaceholder')}
              />
            </div>
          </div>

          {/* Ordering Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packSize">{t('packSize')}</Label>
              <Input
                id="packSize"
                type="number"
                step="0.01"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moq">{t('moq')}</Label>
              <Input
                id="moq"
                type="number"
                step="0.01"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">{t('leadTimeDays')}</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {/* Preferred Supplier */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPreferredSupplier"
              checked={isPreferredSupplier}
              onChange={(e) => setIsPreferredSupplier(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isPreferredSupplier" className="text-sm font-normal">
              {t('preferredSupplier')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {t('preferredSupplierDescription')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={linkMutation.isPending}>
            {linkMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('linkProduct')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
