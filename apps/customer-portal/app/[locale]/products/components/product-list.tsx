'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { MobileSearch, Skeleton, cn, IllustratedEmptyState, Button, useIsMobile } from '@joho-erp/ui';
import { AlertCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';
import type { ProductWithPricing, StockStatus } from '@joho-erp/shared';
import { StickyCartSummary } from './sticky-cart-summary';
import { CategoryChipBar } from './category-chip-bar';
import { ProductRow } from './product-row';
import { MiniCartDrawer } from '@/components/mini-cart/mini-cart-drawer';
import { MiniCartSheet } from '@/components/mini-cart/mini-cart-sheet';
import { SimpleCategorySidebar } from '@/components/simple-category-sidebar';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/use-pull-to-refresh';

// Product type for customer portal (receives stockStatus/hasStock from API)
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

// Type for API response items (cast to Product since customers always get transformed data)
type ApiProduct = Product & ProductWithPricing;

export function ProductList() {
  const t = useTranslations('products');
  const tIllustrated = useTranslations('illustratedEmptyState');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedProductId, setExpandedProductId] = React.useState<string | null>(null);
  const [miniCartOpen, setMiniCartOpen] = React.useState(false);

  // Get category from URL and sync with state
  const categoryFromUrl = searchParams.get('category') || undefined;
  const [selectedCategory, setSelectedCategoryState] = React.useState<string | undefined>(categoryFromUrl);

  // Sync state when URL changes externally (e.g., browser back/forward)
  React.useEffect(() => {
    setSelectedCategoryState(categoryFromUrl);
  }, [categoryFromUrl]);

  // Update URL when category changes
  const setSelectedCategory = React.useCallback((category: string | undefined) => {
    setSelectedCategoryState(category);
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    router.replace(`/${locale}/products${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  }, [searchParams, router, locale]);

  const { data: products, isLoading, isFetching, error, refetch } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
    categoryId: selectedCategory,
  });

  const { data: categoriesData } = api.category.getAll.useQuery();
  const categories = React.useMemo(() => categoriesData ?? [], [categoriesData]);

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
  const canAddToCart = !!(onboardingStatus?.hasCustomerRecord && onboardingStatus?.creditStatus === 'approved');

  // Get cart data to check which products are in cart (only if user can add to cart)
  const { data: cart } = api.cart.getCart.useQuery(undefined, {
    enabled: canAddToCart,
  });

  // Helper to get cart quantity for a product
  const getCartQuantity = React.useCallback((productId: string): number => {
    if (!cart?.items) return 0;
    const item = cart.items.find(i => i.productId === productId);
    return item?.quantity || 0;
  }, [cart?.items]);

  // Extract unique categories with counts (from ALL in-stock products, not filtered)
  const allInStockProducts = React.useMemo(() => {
    const items = (products?.items || []) as ApiProduct[];
    return items.filter(p => p.hasStock);
  }, [products]);

  const categoriesWithCounts = React.useMemo(() => {
    if (!categories.length) return [];

    const counts = new Map<string, number>();
    allInStockProducts.forEach(p => {
      if (p.categoryId) {
        counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1);
      }
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name, // Use name directly from database
      count: counts.get(category.id) || 0,
      disabled: (counts.get(category.id) || 0) === 0,
    }));
  }, [allInStockProducts, categories]);

  // Filter products by selected category (from pre-computed in-stock products)
  const inStockProducts = React.useMemo(() => {
    if (!selectedCategory) return allInStockProducts;
    return allInStockProducts.filter(p => p.categoryId === selectedCategory);
  }, [allInStockProducts, selectedCategory]);

  const handleProductExpand = (productId: string) => {
    setExpandedProductId(prev => prev === productId ? null : productId);
  };

  // Skeleton component for product list
  const ProductListSkeleton = () => (
    <div className="space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-background">
          <Skeleton className="h-16 w-16 md:h-20 md:w-20 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-32" />
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
              {t('onboardingRequired')}
            </span>
            <Link href={`/${locale}/onboarding`}>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900">
                {t('completeOnboarding')}
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
            {t('creditPending')}
          </span>
        </div>
      );
    }

    if (onboardingStatus.creditStatus === 'rejected') {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive bg-destructive/10">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <span className="text-destructive text-sm">
            {t('creditRejected')}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Sticky Cart Summary */}
      <StickyCartSummary
        locale={locale}
        onCartClick={() => setMiniCartOpen(true)}
        isHidden={miniCartOpen}
      />

      {/* Main Layout - Sidebar + Content on desktop */}
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        {!isLoading && isMobile === false && (
          <SimpleCategorySidebar
            categories={categoriesWithCounts}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            totalProductCount={totalProducts}
          />
        )}

        {/* Main Container */}
        <div
          ref={containerRef}
          className="flex-1 min-h-screen"
          {...touchHandlers}
        >
          <div className="container mx-auto px-4">
            {/* Pull-to-refresh indicator (mobile only) */}
            <div className="md:hidden">
              <PullToRefreshIndicator
                pullDistance={pullDistance}
                threshold={80}
                isRefreshing={isRefreshing}
              />
            </div>

            {/* Category Chip Bar - Mobile only */}
            {!isLoading && isMobile && (
              <CategoryChipBar
                categories={categoriesWithCounts}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                totalProductCount={totalProducts}
              />
            )}

          {/* Status Banner */}
          {!isLoading && (
            <div className="py-4">
              {renderStatusBanner()}
            </div>
          )}

          {/* Search */}
          <div className="py-4">
            {isLoading ? (
              <Skeleton className="h-11 w-full rounded-lg" />
            ) : (
              <MobileSearch
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={setSearchQuery}
                showFilter={false}
              />
            )}
          </div>

          {/* Product List */}
          {isLoading ? (
            <ProductListSkeleton />
          ) : (
            <div className="relative pb-8">
              {/* Loading overlay during refetch */}
              {isFetching && (
                <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-xl">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Product Rows */}
              <div className={cn("space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border", isFetching && "opacity-50")}>
                {inStockProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    expanded={expandedProductId === product.id}
                    onExpandToggle={() => handleProductExpand(product.id)}
                    canAddToCart={canAddToCart}
                    cartQuantity={getCartQuantity(product.id)}
                    creditStatus={onboardingStatus?.creditStatus}
                  />
                ))}
              </div>

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
        </div>
      </div>

      {/* Mini-Cart (Desktop: Drawer, Mobile: Sheet) */}
      {isMobile === true ? (
        <MiniCartSheet
          open={miniCartOpen}
          onClose={() => setMiniCartOpen(false)}
          locale={locale}
        />
      ) : (
        <MiniCartDrawer
          open={miniCartOpen}
          onClose={() => setMiniCartOpen(false)}
          locale={locale}
        />
      )}
    </>
  );
}
