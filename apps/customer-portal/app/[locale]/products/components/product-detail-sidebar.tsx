'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { MobileDrawer } from '@joho-erp/ui';
import { Button, Badge, Large, Muted, H3, H4, useToast } from '@joho-erp/ui';
import { Package, Minus, Plus, X, AlertCircle, Clock, XCircle } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import type { ProductWithPricing, StockStatus } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string | null;
  categoryRelation: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  unit: string;
  basePrice: number;
  stockStatus: StockStatus;
  hasStock: boolean;
  imageUrl: string | null;
  // GST fields for displaying final price
  applyGst?: boolean;
  gstRate?: number | null;
  priceWithGst?: number;
}

// Reasonable quantity cap without revealing actual stock
const MAX_QUANTITY = 999;

interface ProductDetailSidebarProps {
  product: (Product & ProductWithPricing) | null;
  open: boolean;
  onClose: () => void;
  canAddToCart?: boolean;
  creditStatus?: string | null;
  hasCustomerRecord?: boolean;
}

export function ProductDetailSidebar({
  product,
  open,
  onClose,
  canAddToCart = true,
  creditStatus,
  hasCustomerRecord = true,
}: ProductDetailSidebarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { toast } = useToast();
  const [quantity, setQuantity] = React.useState(1);

  const utils = api.useUtils();
  const addToCart = api.cart.addItem.useMutation({
    onSuccess: () => {
      toast({
        title: t('products.addedToCart'),
        description: product ? t('cart.messages.productAddedToCart', { productName: product.name }) : undefined,
      });
      void utils.cart.getCart.invalidate();
      setQuantity(1);
      onClose();
    },
    onError: (error) => {
      toast({
        title: t('cart.messages.errorAddingToCart'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset quantity when product changes
  React.useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  if (!product) return null;

  const getStockBadge = () => {
    switch (product.stockStatus) {
      case 'low_stock':
        return <Badge variant="warning">{t('products.lowStock')}</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">{t('products.outOfStock')}</Badge>;
      case 'in_stock':
      default:
        return <Badge variant="success">{t('products.inStock')}</Badge>;
    }
  };

  const handleIncrease = () => {
    if (quantity < MAX_QUANTITY) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const clampedValue = Math.max(1, Math.min(value, MAX_QUANTITY));
    setQuantity(clampedValue);
  };

  const handleAddToCart = () => {
    addToCart.mutate({ productId: product.id, quantity });
  };

  return (
    <MobileDrawer
      open={open}
      onClose={onClose}
      side="right"
      className="w-full sm:w-[460px] max-w-full"
      title={t('products.productDetails')}
      closeAriaLabel={t('products.closeDetails')}
    >
      {/* Custom Header with Close Button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between -mt-4 -mx-4">
        <H3 className="text-lg font-bold">{t('products.productDetails')}</H3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('products.closeDetails')}
          className="rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-6 pb-6">
        {/* Product Image */}
        <div className="relative bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center group">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 420px"
              priority
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <Package className="h-32 w-32 text-neutral-400 dark:text-neutral-600 transition-transform duration-300 group-hover:scale-110" />
            </>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-4">
          {/* Name & Category */}
          <div>
            <H3 className="text-2xl font-bold mb-2 leading-tight">{product.name}</H3>
            <div className="flex items-center gap-3 flex-wrap">
              <Muted className="text-sm">{t('products.sku')}: {product.sku}</Muted>
              {product.categoryRelation && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline" className="font-normal">
                    {product.categoryRelation.name}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-3 py-3 px-4 bg-muted/50 rounded-xl">
            <span className="text-sm font-medium">{t('products.stock')}:</span>
            {getStockBadge()}
          </div>

          {/* Price */}
          <div className="border-l-4 border-primary pl-4 py-2">
            {product.hasCustomPricing ? (
              <div className="space-y-1">
                <Large className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {formatAUD(product.applyGst && product.priceWithGst ? product.priceWithGst : product.effectivePrice)}
                </Large>
                <div className="flex items-center gap-3">
                  <Muted className="line-through text-base">
                    {formatAUD(product.basePrice)}
                  </Muted>
                  <Badge variant="success" className="font-semibold">
                    {t('products.save', { percentage: product.discountPercentage?.toFixed(0) || '0' })}
                  </Badge>
                </div>
                <Muted className="text-sm">
                  {t('products.yourSpecialPrice', { unit: product.unit })}
                  {product.applyGst && ` ${t('products.inclGst')}`}
                </Muted>
              </div>
            ) : (
              <div className="space-y-1">
                <Large className="text-3xl font-bold text-primary">
                  {formatAUD(product.applyGst && product.priceWithGst ? product.priceWithGst : product.basePrice)}
                </Large>
                <Muted className="text-sm">
                  {t('products.perUnit', { unit: product.unit })}
                  {product.applyGst && ` ${t('products.inclGst')}`}
                </Muted>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <H4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('products.description')}
            </H4>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-foreground/90 leading-relaxed">
                {product.description || t('products.noDescription')}
              </p>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-3">
            <H4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('products.quantity')}
            </H4>
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-border rounded-xl overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDecrease}
                  disabled={quantity <= 1 || !product.hasStock}
                  aria-label={t('products.decreaseQuantity')}
                  className="rounded-none h-12 w-12 hover:bg-primary/10"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <input
                  type="number"
                  max={MAX_QUANTITY}
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={!product.hasStock}
                  aria-label={t('products.selectQuantity')}
                  className="w-20 h-12 text-center text-lg font-bold bg-transparent border-x-2 border-border focus:outline-none focus:bg-muted/50"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleIncrease}
                  disabled={quantity >= MAX_QUANTITY || !product.hasStock}
                  aria-label={t('products.increaseQuantity')}
                  className="rounded-none h-12 w-12 hover:bg-primary/10"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 text-sm text-muted-foreground">
                {product.unit}
              </div>
            </div>
          </div>

          {/* Status Warning */}
          {!canAddToCart && (
            <div className="space-y-3">
              {!hasCustomerRecord ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200 text-sm">
                    {t('products.onboardingRequired')}
                  </span>
                </div>
              ) : creditStatus === 'pending' ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200 text-sm">
                    {t('products.creditPending')}
                  </span>
                </div>
              ) : creditStatus === 'rejected' ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-destructive text-sm">
                    {t('products.creditRejected')}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="pt-4">
            {!hasCustomerRecord ? (
              <Link href={`/${locale}/onboarding`} className="w-full block">
                <Button
                  className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                  variant="outline"
                >
                  {t('products.completeOnboarding')}
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
                disabled={!canAddToCart || !product.hasStock || addToCart.isPending}
                onClick={handleAddToCart}
              >
                {addToCart.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('products.adding')}
                  </span>
                ) : (
                  <>
                    {t('products.addToCart')} • {formatAUD((product.applyGst && product.priceWithGst ? product.priceWithGst : product.effectivePrice) * quantity)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MobileDrawer>
  );
}
