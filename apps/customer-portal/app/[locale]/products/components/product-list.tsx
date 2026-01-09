'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { MobileSearch, Button, Badge, Skeleton, H4, Muted, Large, useToast, cn, IllustratedEmptyState } from '@joho-erp/ui';
import { AlertCircle, Clock, XCircle, Loader2, Package } from 'lucide-react';
import { api } from '@/trpc/client';
import type { ProductWithPricing, ProductCategory, StockStatus } from '@joho-erp/shared';
import { formatAUD, PRODUCT_CATEGORIES } from '@joho-erp/shared';
import { ProductDetailSidebar } from './product-detail-sidebar';
import { CategorySidebar } from './category-sidebar';
import { StaggeredList } from '@/components/staggered-list';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/use-pull-to-refresh';

// Product type for customer portal (receives stockStatus/hasStock from API)
interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: ProductCategory | null;
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

// Type for API response items (cast to Product since customers always get transformed data)
type ApiProduct = Product & ProductWithPricing;

export function ProductList() {
  const t = useTranslations();
  const tIllustrated = useTranslations('illustratedEmptyState');
  const locale = useLocale();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<ProductCategory | undefined>();
  const [selectedProduct, setSelectedProduct] = React.useState<(Product & ProductWithPricing) | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [pendingProductId, setPendingProductId] = React.useState<string | null>(null);

  const { data: products, isLoading, isFetching, error, refetch } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
    category: selectedCategory,
  });

  const utils = api.useUtils();

  // Pull-to-refresh for mobile
  const {
    containerRef,
    pullDistance,
    isPulling: _isPulling,
    isRefreshing,
    touchHandlers,
  } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
  });

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
    onSettled: () => {
      setPendingProductId(null);
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
    onSettled: () => {
      setPendingProductId(null);
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
    onSettled: () => {
      setPendingProductId(null);
    },
  });

  // Helper to get cart quantity for a product
  const getCartQuantity = React.useCallback((productId: string): number => {
    if (!cart?.items) return 0;
    const item = cart.items.find(i => i.productId === productId);
    return item?.quantity || 0;
  }, [cart?.items]);

  // Handler for incrementing quantity by 5
  // Server validates stock availability - no client-side stock cap
  const handleIncrementBy5 = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setPendingProductId(productId);
    const currentQty = getCartQuantity(productId);
    const newQty = currentQty + 5;
    if (currentQty === 0) {
      // Add to cart if not already in cart
      addToCart.mutate({ productId, quantity: newQty });
    } else {
      // Update existing cart item
      updateQuantity.mutate({ productId, quantity: newQty });
    }
  };

  // Handler for decrementing quantity by 5
  const handleDecrementBy5 = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setPendingProductId(productId);
    const currentQty = getCartQuantity(productId);
    const newQty = currentQty - 5;
    if (newQty <= 0) {
      // Remove from cart
      removeItem.mutate({ productId });
    } else {
      updateQuantity.mutate({ productId, quantity: newQty });
    }
  };

  // Extract unique categories with counts (from ALL in-stock products, not filtered)
  const allInStockProducts = React.useMemo(() => {
    const items = (products?.items || []) as ApiProduct[];
    return items.filter(p => p.hasStock);
  }, [products]);

  const categoriesWithCounts = React.useMemo(() => {
    const counts = new Map<ProductCategory, number>();
    allInStockProducts.forEach(p => {
      if (p.category) {
        counts.set(p.category, (counts.get(p.category) || 0) + 1);
      }
    });
    // Always return all categories, with disabled=true for those with 0 count
    return PRODUCT_CATEGORIES.map((categoryId) => ({
      id: categoryId,
      name: t(`categories.${categoryId.toLowerCase()}`),
      count: counts.get(categoryId) || 0,
      disabled: (counts.get(categoryId) || 0) === 0,
    }));
  }, [allInStockProducts, t]);

  const getCategoryTranslation = (category: ProductCategory) => {
    const categoryKey = category.toLowerCase();
    return t(`categories.${categoryKey}`);
  };

  const getStockBadge = (stockStatus: StockStatus) => {
    switch (stockStatus) {
      case 'low_stock':
        return <Badge variant="warning" className="text-xs">{t('products.lowStock')}</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive" className="text-xs">{t('products.outOfStock')}</Badge>;
      case 'in_stock':
      default:
        return null; // No badge needed for normal stock levels
    }
  };

  // Filter products by selected category (from pre-computed in-stock products)
  const inStockProducts = React.useMemo(() => {
    if (!selectedCategory) return allInStockProducts;
    return allInStockProducts.filter(p => p.category === selectedCategory);
  }, [allInStockProducts, selectedCategory]);

  const handleProductClick = (product: Product & ProductWithPricing) => {
    setSelectedProduct(product);
    setSidebarOpen(true);
  };

  // Skeleton component for sidebar
  const SidebarSkeleton = () => (
    <aside className="w-[70px] flex-shrink-0">
      <div className="sticky top-4 space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
      </div>
    </aside>
  );

  // Skeleton component for product list
  const ProductListSkeleton = () => (
    <div className="space-y-3 border border-border rounded-xl overflow-hidden divide-y divide-border">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-background">
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
  );

  // Error state
  if (error) {
    return (
      <IllustratedEmptyState
        variant="error"
        title={tIllustrated('error.title')}
        description={tIllustrated('error.description')}
        secondaryDescription={error.message}
        primaryAction={{
          label: tIllustrated('error.primaryAction'),
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  const totalProducts = allInStockProducts.length;

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
    <div
      ref={containerRef}
      className="flex gap-4 md:gap-6"
      {...touchHandlers}
    >
      {/* Category Sidebar - skeleton on initial load, visible during refetch */}
      {isLoading ? (
        <SidebarSkeleton />
      ) : (
        <CategorySidebar
          categories={categoriesWithCounts}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          totalProductCount={totalProducts}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Pull-to-refresh indicator (mobile only) */}
        <div className="md:hidden">
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            threshold={80}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Status Banner */}
        {!isLoading && renderStatusBanner()}

        {/* Search - skeleton on initial load, visible during refetch */}
        {isLoading ? (
          <Skeleton className="h-11 w-full rounded-lg" />
        ) : (
          <MobileSearch
            placeholder={t('products.searchPlaceholder')}
            value={searchQuery}
            onChange={setSearchQuery}
            showFilter={false}
          />
        )}

        {/* Product Count */}
        {!isLoading && inStockProducts.length > 0 && (
          <div className="flex items-center justify-between">
            <Muted className="text-sm">
              {t('products.showing', { count: inStockProducts.length })}
            </Muted>
          </div>
        )}

        {/* Product List with loading overlay during refetch */}
        {isLoading ? (
          <ProductListSkeleton />
        ) : (
          <div className="relative">
            {/* Loading overlay during refetch */}
            {isFetching && (
              <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-xl">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* Product List - Clean Minimalist Rows */}
            <StaggeredList className={cn("space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border", isFetching && "opacity-50")}>
        {inStockProducts.map((product) => {
          return (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className={cn(
                'group relative bg-background hover:bg-muted/50 hover:shadow-sm transition-all duration-200 cursor-pointer',
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
                  {product.hasCustomPricing ? (
                    <div>
                      <Large className="text-2xl font-bold text-green-600 dark:text-green-500">
                        {formatAUD(product.applyGst && product.priceWithGst ? product.priceWithGst : product.effectivePrice)}
                      </Large>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <Muted className="line-through text-xs">
                          {formatAUD(product.basePrice)}
                        </Muted>
                        <Badge variant="success" className="text-xs px-1.5 py-0">
                          -{product.discountPercentage?.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Large className="text-2xl font-bold text-primary">
                      {formatAUD(product.applyGst && product.priceWithGst ? product.priceWithGst : product.basePrice)}
                    </Large>
                  )}
                  <Muted className="text-xs mt-1">
                    {t('products.perUnit', { unit: product.unit })}
                    {product.applyGst && ` ${t('products.inclGst')}`}
                  </Muted>
                </div>

                {/* Stock Badge */}
                <div className="flex-shrink-0 min-w-[100px] flex justify-center">
                  {getStockBadge(product.stockStatus)}
                </div>

                {/* Inline Quantity Controls */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1">
                    {canAddToCart && getCartQuantity(product.id) > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 w-12 rounded-l-xl rounded-r-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold"
                        onClick={(e) => handleDecrementBy5(e, product.id)}
                        disabled={pendingProductId === product.id}
                        aria-label={t('products.decrementBy5')}
                      >
                        {pendingProductId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '-5'}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleProductClick(product)}
                      className={cn(
                        'h-11 w-14 border-y-2 border-border bg-background transition-colors flex items-center justify-center font-bold text-lg',
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
                      className="h-11 w-12 rounded-r-xl rounded-l-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold"
                      onClick={(e) => handleIncrementBy5(e, product.id)}
                      disabled={!canAddToCart || pendingProductId === product.id}
                      aria-label={t('products.incrementBy5')}
                    >
                      {pendingProductId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '+5'}
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
                    {product.hasCustomPricing ? (
                      <div>
                        <Large className="text-xl font-bold text-green-600 dark:text-green-500">
                          {formatAUD(product.applyGst && product.priceWithGst ? product.priceWithGst : product.effectivePrice)}
                        </Large>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Muted className="line-through text-xs">
                            {formatAUD(product.basePrice)}
                          </Muted>
                          <Badge variant="success" className="text-xs px-1.5 py-0">
                            -{product.discountPercentage?.toFixed(0)}%
                          </Badge>
                          {product.applyGst && (
                            <Muted className="text-xs">{t('products.inclGst')}</Muted>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Large className="text-xl font-bold text-primary">
                          {formatAUD(product.applyGst && product.priceWithGst ? product.priceWithGst : product.basePrice)}
                        </Large>
                        {product.applyGst && (
                          <Muted className="text-xs">{t('products.inclGst')}</Muted>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStockBadge(product.stockStatus)}
                    <div className="flex items-center">
                      {canAddToCart && getCartQuantity(product.id) > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 w-11 rounded-l-xl rounded-r-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold text-sm"
                          onClick={(e) => handleDecrementBy5(e, product.id)}
                          disabled={pendingProductId === product.id}
                          aria-label={t('products.decrementBy5')}
                        >
                          {pendingProductId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '-5'}
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleProductClick(product)}
                        className={cn(
                          'h-11 w-12 border-y-2 border-border bg-background transition-colors flex items-center justify-center font-bold text-base',
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
                        className="h-11 w-11 rounded-r-xl rounded-l-none border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-semibold text-sm"
                        onClick={(e) => handleIncrementBy5(e, product.id)}
                        disabled={!canAddToCart || pendingProductId === product.id}
                        aria-label={t('products.incrementBy5')}
                      >
                        {pendingProductId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '+5'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
            </StaggeredList>

            {/* Empty State */}
            {inStockProducts.length === 0 && (
              <IllustratedEmptyState
                variant="no-products"
                title={tIllustrated('noProducts.title')}
                description={tIllustrated('noProducts.description')}
                primaryAction={{
                  label: selectedCategory ? tIllustrated('noProducts.primaryAction') : tIllustrated('noProducts.secondaryAction'),
                  onClick: selectedCategory ? () => setSelectedCategory(undefined) : () => window.location.reload(),
                }}
                className="border border-dashed border-border rounded-2xl"
              />
            )}
          </div>
        )}
      </div>

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
