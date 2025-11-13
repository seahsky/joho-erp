'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { MobileSearch, Card, CardContent, Button, Badge } from '@jimmy-beef/ui';
import { Package } from 'lucide-react';

// Mock product data (in real app, fetch from tRPC)
const mockProducts = [
  {
    id: '1',
    name: 'Wagyu Beef Ribeye',
    sku: 'WBR-001',
    price: 45.0,
    unit: 'kg',
    stock: 25,
    category: 'Beef',
    imageUrl: null,
  },
  {
    id: '2',
    name: 'Angus Beef Striploin',
    sku: 'ABS-002',
    price: 38.5,
    unit: 'kg',
    stock: 42,
    category: 'Beef',
    imageUrl: null,
  },
  {
    id: '3',
    name: 'Pork Belly',
    sku: 'PB-003',
    price: 18.0,
    unit: 'kg',
    stock: 5,
    category: 'Pork',
    imageUrl: null,
  },
  {
    id: '4',
    name: 'Chicken Breast',
    sku: 'CB-004',
    price: 12.5,
    unit: 'kg',
    stock: 60,
    category: 'Chicken',
    imageUrl: null,
  },
];

export function ProductList() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredProducts = mockProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="secondary" className="bg-red-500 text-white">{t('products.outOfStock')}</Badge>;
    }
    if (stock < 10) {
      return <Badge variant="secondary" className="bg-amber-500 text-white">{t('products.lowStock')}</Badge>;
    }
    return <Badge variant="default" className="bg-green-500 text-white">{t('products.inStock')}</Badge>;
  };

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
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Product Image Placeholder */}
              <div className="bg-muted flex items-center justify-center h-40 md:h-48">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-base md:text-lg line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">per {product.unit}</p>
                  </div>
                  {getStockBadge(product.stock)}
                </div>

                <p className="text-sm text-muted-foreground">
                  {product.stock > 0 ? `${product.stock}${product.unit} available` : 'Out of stock'}
                </p>

                <Button
                  className="w-full"
                  disabled={product.stock === 0}
                >
                  {t('products.addToCart')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No products found</p>
        </div>
      )}
    </div>
  );
}
