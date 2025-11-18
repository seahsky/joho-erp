'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  ResponsiveTable,
  type Column,
} from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { Package, CheckCircle2, Circle } from 'lucide-react';

interface ProductSummaryItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  orders: {
    orderNumber: string;
    quantity: number;
  }[];
}

interface ProductSummaryViewProps {
  productSummary: ProductSummaryItem[];
}

export function ProductSummaryView({ productSummary }: ProductSummaryViewProps) {
  const t = useTranslations('packing');
  const [gatheredProducts, setGatheredProducts] = useState<Set<string>>(new Set());

  const toggleProductGathered = (productId: string) => {
    setGatheredProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const gatheredCount = gatheredProducts.size;
  const totalCount = productSummary.length;

  const columns: Column<ProductSummaryItem>[] = [
    {
      key: 'gathered',
      label: '',
      className: 'w-12',
      render: (item) => (
        <button
          onClick={() => toggleProductGathered(item.productId)}
          className="hover:scale-110 transition-transform"
          aria-label={
            gatheredProducts.has(item.productId)
              ? t('markAsNotGathered')
              : t('markAsGathered')
          }
        >
          {gatheredProducts.has(item.productId) ? (
            <CheckCircle2 className="h-6 w-6 text-success" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
      ),
    },
    {
      key: 'sku',
      label: t('sku'),
      className: 'font-mono font-medium',
    },
    {
      key: 'productName',
      label: t('productName'),
    },
    {
      key: 'totalQuantity',
      label: t('totalQuantity'),
      render: (item) => (
        <span className="font-semibold">
          {item.totalQuantity} {item.unit}
        </span>
      ),
    },
    {
      key: 'orders',
      label: t('ordersRequiring'),
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.orders.slice(0, 3).map((order: { orderNumber: string; quantity: number }) => (
            <Badge key={order.orderNumber} variant="secondary" className="text-xs">
              {order.orderNumber} ({order.quantity})
            </Badge>
          ))}
          {item.orders.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.orders.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const mobileCard = (item: ProductSummaryItem) => {
    const isGathered = gatheredProducts.has(item.productId);

    return (
      <Card
        key={item.productId}
        className={`transition-all ${isGathered ? 'bg-muted/50 border-success' : ''}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <button
                  onClick={() => toggleProductGathered(item.productId)}
                  className="hover:scale-110 transition-transform"
                >
                  {isGathered ? (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                {item.productName}
              </CardTitle>
              <CardDescription className="font-mono">{item.sku}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('totalQuantity')}</span>
            <span className="font-semibold text-lg">
              {item.totalQuantity} {item.unit}
            </span>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {t('ordersRequiring')} ({item.orders.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {item.orders.map((order: { orderNumber: string; quantity: number }) => (
                <Badge key={order.orderNumber} variant="secondary" className="text-xs">
                  {order.orderNumber} ({order.quantity})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('productSummary')}
          </CardTitle>
          <CardDescription>
            {t('productSummaryDescription')} ({gatheredCount}/{totalCount} {t('gathered')})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={columns}
            data={productSummary}
            mobileCard={mobileCard}
            emptyMessage={t('noProducts')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
