'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { MobileSearch, Card, CardContent, Button, Badge, Skeleton, H4, Muted, Large } from '@jimmy-beef/ui';
import { Package } from 'lucide-react';
import { api } from '@/trpc/client';

export function ProductList() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: products, isLoading, error } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
  });

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">{t('products.outOfStock')}</Badge>;
    }
    if (stock < 10) {
      return <Badge variant="warning">{t('products.lowStock')}</Badge>;
    }
    return <Badge variant="success">{t('products.inStock')}</Badge>;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-full rounded-lg" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 md:h-48 w-full" />
              <div className="p-4 space-y-3">
                <div>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-8 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            </Card>
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
        <p className="text-lg font-medium text-destructive mb-2">Error loading products</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <MobileSearch
        placeholder={t('products.searchPlaceholder')}
        value={searchQuery}
        onChange={setSearchQuery}
        showFilter={false}
      />

      {/* Product Grid - Single column on mobile, 2 on tablet, 3 on desktop */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <Card key={product._id.toString()} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Product Image Placeholder */}
              <div className="bg-muted flex items-center justify-center h-40 md:h-48">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div>
                  <H4 className="text-base md:text-lg line-clamp-2">{product.name}</H4>
                  <Muted>SKU: {product.sku}</Muted>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Large className="text-2xl text-primary">
                      ${product.basePrice.toFixed(2)}
                    </Large>
                    <Muted>per {product.unit}</Muted>
                  </div>
                  {getStockBadge(product.currentStock)}
                </div>

                <Muted>
                  {product.currentStock > 0
                    ? `${product.currentStock}${product.unit} available`
                    : 'Out of stock'}
                </Muted>

                <Button
                  className="w-full"
                  disabled={product.currentStock === 0}
                >
                  {t('products.addToCart')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {products && products.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No products found</p>
        </div>
      )}
    </div>
  );
}
