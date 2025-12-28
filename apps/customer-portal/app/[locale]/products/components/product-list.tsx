'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { MobileSearch, Button, Badge, Skeleton, H4, Muted, Large, useToast, cn } from '@joho-erp/ui';
import { Package, AlertCircle, Clock, XCircle } from 'lucide-react';
import { api } from '@/trpc/client';
import type { ProductWithPricing, ProductCategory } from '@joho-erp/shared';
import { formatAUD } from '@joho-erp/shared';
import { ProductDetailSidebar } from './product-detail-sidebar';
import { CategoryFilter } from './category-filter';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: ProductCategory | null;
  unit: string;
  basePrice: number;
  currentStock: number;
  imageUrl: string | null;
}

export function ProductList() {
  const t = useTranslations();
  const locale = useLocale();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
  const [selectedProduct, setSelectedProduct] = React.useState<(Product & ProductWithPricing) | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const { data: products, isLoading, error } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
    category: selectedCategory,
  });

  const utils = api.useUtils();

  // Check onboarding and credit status
  const { data: onboardingStatus } = api.customer.getOnboardingStatus.useQuery();

  // Determine if user can add to cart
  const canAddToCart = onboardingStatus?.hasCustomerRecord && onboardingStatus?.creditStatus === 'approved';

  // Get cart data to check which products are in cart (only if user can add to cart)
  const { data: cart } = api.cart.getCart.useQuery(undefined, {
    enabled: canAddToCart,
  });

  const addToCart = api.cart.addItem.useMutation({
    onSuccess: (data, variables) => {
      const product = products?.items?.find(p => p.id === variables.productId);
      toast({
        title: t('cart.messages.addedToCart'),
        description: product ? t('cart.messages.productAddedToCart', { productName: product.name }) : undefined,
      });
      void utils.cart.getCart.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('cart.messages.errorAddingToCart'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateQuantity = api.cart.updateQuantity.useMutation({
    onSuccess: () => {
      void utils.cart.getCart.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('cart.messages.errorUpdatingQuantity'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeItem = api.cart.removeItem.useMutation({
    onSuccess: () => {
      toast({
        title: t('cart.messages.removedFromCart'),
      });
      void utils.cart.getCart.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('cart.messages.errorRemovingItem'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper to get cart quantity for a product
  const getCartQuantity = React.useCallback((productId: string): number => {
    if (!cart?.items) return 0;
    const item = cart.items.find(i => i.productId === productId);
    return item?.quantity || 0;
  }, [cart?.items]);

  // Handler for incrementing quantity by 5
  const handleIncrementBy5 = (e: React.MouseEvent, productId: string, currentStock: number) => {
    e.stopPropagation();
    const currentQty = getCartQuantity(productId);
    const newQty = Math.min(currentQty + 5, currentStock);
    if (newQty !== currentQty && newQty > 0) {
      if (currentQty === 0) {
        // Add to cart if not already in cart
        addToCart.mutate({ productId, quantity: newQty });
      } else {
        // Update existing cart item
        updateQuantity.mutate({ productId, quantity: newQty });
      }
      if (newQty === currentStock && currentStock < currentQty + 5) {
        toast({
          title: t('products.maxStockReached'),
          description: t('products.unitsAvailable', { count: currentStock, unit: '' }),
        });
      }
    }
  };

  // Handler for decrementing quantity by 5
  const handleDecrementBy5 = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const currentQty = getCartQuantity(productId);
    const newQty = currentQty - 5;
    if (newQty <= 0) {
      // Remove from cart
      removeItem.mutate({ productId });
    } else {
      updateQuantity.mutate({ productId, quantity: newQty });
    }
  };

  // Extract unique categories
  const categories = React.useMemo(() => {
    if (!products?.items) return [];
    const uniqueCategories = new Set<ProductCategory>();
    products.items.forEach(p => {
      if (p.category) uniqueCategories.add(p.category);
    });
    return Array.from(uniqueCategories).sort();
  }, [products]);

  const getCategoryTranslation = (category: ProductCategory) => {
    const categoryKey = category.toLowerCase();
    return t(`categories.${categoryKey}`);
  };

  const getStockBadge = (stock: number) => {
    // Only show warning for low stock (< 10 units)
    // No badge needed for normal stock levels since we only show in-stock products
    if (stock < 10) {
      return <Badge variant="warning" className="text-xs">{t('products.lowStock')}</Badge>;
    }
    return null;
  };

  // Filter products to only show in-stock items
  const inStockProducts = React.useMemo(() => {
    return products?.items?.filter(p => p.currentStock > 0) || [];
  }, [products]);

  const handleProductClick = (product: Product & ProductWithPricing) => {
    setSelectedProduct(product);
    setSidebarOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg md:hidden" />
        <Skeleton className="h-12 w-full rounded-lg hidden md:block" />

        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
              <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive mb-2">{t('products.errorLoading')}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const totalProducts = inStockProducts.length;

  // Render warning banner based on onboarding/credit status
  const renderStatusBanner = () => {
    if (!onboardingStatus) return null;

    if (!onboardingStatus.hasCustomerRecord) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-4">
            <span className="text-amber-800 dark:text-amber-200 text-sm">
              {t('products.onboardingRequired')}
            </span>
            <Link href={`/${locale}/onboarding`}>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900">
                {t('products.completeOnboarding')}
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (onboardingStatus.creditStatus === 'pending') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800 dark:text-amber-200 text-sm">
            {t('products.creditPending')}
          </span>
        </div>
      );
    }

    if (onboardingStatus.creditStatus === 'rejected') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive bg-destructive/10">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <span className="text-destructive text-sm">
            {t('products.creditRejected')}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {renderStatusBanner()}

      {/* Search */}
      <MobileSearch
        placeholder={t('products.searchPlaceholder')}
        value={searchQuery}
        onChange={setSearchQuery}
        showFilter={false}
      />

      {/* Category Filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          productCount={totalProducts}
        />
      )}

      {/* Product Count */}
      {inStockProducts.length > 0 && (
        <div className="flex items-center justify-between">
          <Muted className="text-sm">
            {t('products.showing', { count: inStockProducts.length })}
          </Muted>
        </div>
      )}

      {/* Product List - Clean Minimalist Rows */}
      <div className="space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border">
        {inStockProducts.map((product) => {
          const productWithPricing = product as typeof product & ProductWithPricing;

          return (
            <div
              key={product.id}
              onClick={() => handleProductClick(productWithPricing)}
              className={cn(
                'group relative bg-background hover:bg-muted/50 transition-all duration-200 cursor-pointer',
                'active:scale-[0.99]'
              )}
            >
              {/* Desktop Layout: Horizontal Row */}
              <div className="hidden md:flex items-center gap-6 p-4">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <div className="relative h-16 w-16 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-neutral-400 dark:text-neutral-600" />
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <H4 className="text-lg font-bold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </H4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Muted className="text-sm">SKU: {product.sku}</Muted>
                    {product.category && (
                      <>
                        <span className="text-muted-foreground text-xs">•</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {getCategoryTranslation(product.category)}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right min-w-[140px]">
                  {productWithPricing.hasCustomPricing ? (
                    <div>
                      <Large className="text-2xl font-bold text-green-600 dark:text-green-500">
                        {formatAUD(productWithPricing.effectivePrice)}
                      </Large>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <Muted className="line-through text-xs">
                          {formatAUD(productWithPricing.basePrice)}
                        </Muted>
                        <Badge variant="success" className="text-xs px-1.5 py-0">
                          -{productWithPricing.discountPercentage?.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Large className="text-2xl font-bold text-primary">
                      {formatAUD(product.basePrice)}
                    </Large>
                  )}
                  <Muted className="text-xs mt-1">{t('products.perUnit', { unit: product.unit })}</Muted>
                </div>

                {/* Stock Badge */}
                <div className="flex-shrink-0 min-w-[100px] flex justify-center">
                  {getStockBadge(product.currentStock)}
                </div>

                {/* Inline Quantity Controls */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {canAddToCart && getCartQuantity(product.id) > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-12 rounded-l-xl rounded-r-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold"
                        onClick={(e) => handleDecrementBy5(e, product.id)}
                        disabled={updateQuantity.isPending || removeItem.isPending}
                        aria-label={t('products.decrementBy5')}
                      >
                        -5
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleProductClick(productWithPricing)}
                      className={cn(
                        'h-10 w-14 border-y-2 border-border bg-background transition-colors flex items-center justify-center font-bold text-lg',
                        (!canAddToCart || getCartQuantity(product.id) === 0) && 'border-l-2 rounded-l-xl',
                        canAddToCart && 'hover:bg-muted/50',
                        !canAddToCart && 'opacity-50 cursor-not-allowed'
                      )}
                      title={canAddToCart ? t('products.tapToEdit') : undefined}
                      disabled={!canAddToCart}
                    >
                      {canAddToCart ? getCartQuantity(product.id) : '-'}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 w-12 rounded-r-xl rounded-l-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold"
                      onClick={(e) => handleIncrementBy5(e, product.id, product.currentStock)}
                      disabled={!canAddToCart || addToCart.isPending || updateQuantity.isPending || getCartQuantity(product.id) >= product.currentStock}
                      aria-label={t('products.incrementBy5')}
                    >
                      +5
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Layout: Two-Row Card */}
              <div className="md:hidden p-4 space-y-3">
                {/* Top Row: Image + Info */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="relative h-14 w-14 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <Package className="h-7 w-7 text-neutral-400 dark:text-neutral-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <H4 className="text-base font-bold mb-1 line-clamp-2">
                      {product.name}
                    </H4>
                    <Muted className="text-xs">SKU: {product.sku}</Muted>
                  </div>
                </div>

                {/* Bottom Row: Price + Stock + Quick Add */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    {productWithPricing.hasCustomPricing ? (
                      <div>
                        <Large className="text-xl font-bold text-green-600 dark:text-green-500">
                          {formatAUD(productWithPricing.effectivePrice)}
                        </Large>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Muted className="line-through text-xs">
                            {formatAUD(productWithPricing.basePrice)}
                          </Muted>
                          <Badge variant="success" className="text-xs px-1.5 py-0">
                            -{productWithPricing.discountPercentage?.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <Large className="text-xl font-bold text-primary">
                        {formatAUD(product.basePrice)}
                      </Large>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStockBadge(product.currentStock)}
                    <div className="flex items-center">
                      {canAddToCart && getCartQuantity(product.id) > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 w-11 rounded-l-xl rounded-r-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold text-sm"
                          onClick={(e) => handleDecrementBy5(e, product.id)}
                          disabled={updateQuantity.isPending || removeItem.isPending}
                          aria-label={t('products.decrementBy5')}
                        >
                          -5
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleProductClick(productWithPricing)}
                        className={cn(
                          'h-10 w-12 border-y-2 border-border bg-background transition-colors flex items-center justify-center font-bold text-base',
                          (!canAddToCart || getCartQuantity(product.id) === 0) && 'border-l-2 rounded-l-xl',
                          canAddToCart && 'hover:bg-muted/50',
                          !canAddToCart && 'opacity-50 cursor-not-allowed'
                        )}
                        title={canAddToCart ? t('products.tapToEdit') : undefined}
                        disabled={!canAddToCart}
                      >
                        {canAddToCart ? getCartQuantity(product.id) : '-'}
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-11 rounded-r-xl rounded-l-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold text-sm"
                        onClick={(e) => handleIncrementBy5(e, product.id, product.currentStock)}
                        disabled={!canAddToCart || addToCart.isPending || updateQuantity.isPending || getCartQuantity(product.id) >= product.currentStock}
                        aria-label={t('products.incrementBy5')}
                      >
                        +5
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {inStockProducts.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Package className="h-20 w-20 mx-auto text-muted-foreground/50 mb-4" />
          <H4 className="text-xl font-semibold mb-2">{t('products.noProductsFound')}</H4>
          <Muted className="text-sm mb-6">
            {selectedCategory ? t('products.emptyWithCategory') : t('products.emptyWithSearch')}
          </Muted>
          {selectedCategory && (
            <Button
              variant="outline"
              onClick={() => setSelectedCategory(undefined)}
            >
              {t('products.clearFilters')}
            </Button>
          )}
        </div>
      )}

      {/* Product Detail Sidebar */}
      <ProductDetailSidebar
        product={selectedProduct}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        canAddToCart={canAddToCart}
        creditStatus={onboardingStatus?.creditStatus}
        hasCustomerRecord={onboardingStatus?.hasCustomerRecord}
      />
    </div>
  );
}
