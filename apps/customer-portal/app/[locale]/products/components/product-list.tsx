'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { MobileSearch, Button, Badge, Skeleton, H4, Muted, Large, useToast, cn } from '@jimmy-beef/ui';
import { Package, Plus } from 'lucide-react';
import { api } from '@/trpc/client';
import type { ProductWithPricing } from '@jimmy-beef/shared';
import { formatAUD } from '@jimmy-beef/shared';
import { ProductDetailSidebar } from './product-detail-sidebar';
import { CategoryFilter } from './category-filter';

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  unit: string;
  basePrice: number;
  currentStock: number;
}

export function ProductList() {
  const t = useTranslations();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | undefined>();
  const [selectedProduct, setSelectedProduct] = React.useState<(Product & ProductWithPricing) | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const { data: products, isLoading, error } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
    category: selectedCategory,
  });

  const utils = api.useUtils();
  const addToCart = api.cart.addItem.useMutation({
    onSuccess: (data, variables) => {
      const product = products?.find(p => p.id === variables.productId);
      toast({
        title: t('cart.messages.addedToCart'),
        description: product ? t('cart.messages.productAddedToCart', { productName: product.name }) : undefined,
      });
      void utils.cart.getCart.invalidate();
    },
    onError: () => {
      toast({
        title: t('cart.messages.errorAddingToCart'),
        variant: 'destructive',
      });
    },
  });

  // Extract unique categories
  const categories = React.useMemo(() => {
    if (!products) return [];
    const uniqueCategories = new Set<string>();
    products.forEach(p => {
      if (p.category) uniqueCategories.add(p.category);
    });
    return Array.from(uniqueCategories).sort();
  }, [products]);

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive" className="text-xs">{t('products.outOfStock')}</Badge>;
    }
    if (stock < 10) {
      return <Badge variant="warning" className="text-xs">{t('products.lowStock')}</Badge>;
    }
    return <Badge variant="success" className="text-xs">{t('products.inStock')}</Badge>;
  };

  const handleProductClick = (product: Product & ProductWithPricing) => {
    setSelectedProduct(product);
    setSidebarOpen(true);
  };

  const handleQuickAdd = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation(); // Prevent sidebar from opening
    addToCart.mutate({ productId, quantity: 1 });
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

  const totalProducts = products?.length || 0;

  return (
    <div className="space-y-6">
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
      {products && products.length > 0 && (
        <div className="flex items-center justify-between">
          <Muted className="text-sm">
            {t('products.showing', { count: products.length })}
          </Muted>
        </div>
      )}

      {/* Product List - Clean Minimalist Rows */}
      <div className="space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border">
        {products?.map((product) => {
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
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Package className="h-8 w-8 text-neutral-400 dark:text-neutral-600" />
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
                          {product.category}
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

                {/* Quick Add Button */}
                <div className="flex-shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 rounded-xl border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 shadow-sm hover:shadow-md"
                    disabled={product.currentStock === 0 || addToCart.isPending}
                    onClick={(e) => handleQuickAdd(e, product.id)}
                    aria-label={t('products.quickAdd')}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Mobile Layout: Two-Row Card */}
              <div className="md:hidden p-4 space-y-3">
                {/* Top Row: Icon + Info */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center">
                      <Package className="h-7 w-7 text-neutral-400 dark:text-neutral-600" />
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
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-xl border-2 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                      disabled={product.currentStock === 0 || addToCart.isPending}
                      onClick={(e) => handleQuickAdd(e, product.id)}
                      aria-label={t('products.quickAdd')}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {products && products.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Package className="h-20 w-20 mx-auto text-muted-foreground/50 mb-4" />
          <H4 className="text-xl font-semibold mb-2">{t('products.noProductsFound')}</H4>
          <Muted className="text-sm mb-6">
            {selectedCategory ? 'Try selecting a different category or clear your filters.' : 'Try adjusting your search terms.'}
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
      />
    </div>
  );
}
