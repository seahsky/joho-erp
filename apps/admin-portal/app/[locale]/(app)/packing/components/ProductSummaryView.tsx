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
  type TableColumn,
} from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { Package, CheckCircle2, Circle } from 'lucide-react';

/**
 * Reference to an order that requires a specific product
 */
interface OrderReference {
  orderNumber: string;
  quantity: number;
}

/**
 * Summary of a product across all orders for a delivery date
 */
interface ProductSummaryItem {
  productId: string | null | undefined;
  sku: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  orders?: OrderReference[];
}

/**
 * Validated product summary item with guaranteed non-null productId
 */
interface ValidatedProductSummaryItem extends ProductSummaryItem {
  productId: string;
  orders: OrderReference[];
}

/**
 * Union type of all valid translation keys in the 'packing' namespace
 * Provides compile-time safety for translation key usage
 */
type PackingTranslationKey =
  | 'title'
  | 'subtitle'
  | 'selectDate'
  | 'selectDateDescription'
  | 'productSummary'
  | 'orderByOrder'
  | 'totalOrders'
  | 'uniqueProducts'
  | 'totalItems'
  | 'progress'
  | 'ordersPacked'
  | 'complete'
  | 'sku'
  | 'productName'
  | 'totalQuantity'
  | 'ordersRequiring'
  | 'gathered'
  | 'markAsGathered'
  | 'markAsNotGathered'
  | 'productSummaryDescription'
  | 'orderByOrderDescription'
  | 'orders'
  | 'order'
  | 'allAreas'
  | 'deliveryAddress'
  | 'items'
  | 'itemsPacked'
  | 'packingNotes'
  | 'addNotes'
  | 'markAsReady'
  | 'marking'
  | 'checkAllItemsFirst'
  | 'orderReady'
  | 'orderReadyDescription'
  | 'mustCheckAllItems'
  | 'mustCheckAllItemsDescription'
  | 'errorMarkingReady'
  | 'errorMarkingItem'
  | 'noOrders'
  | 'noOrdersDescription'
  | 'noProducts'
  | 'noOrdersForArea'
  | 'loadingSession'
  | 'loadingOrder'
  | 'errorLoading';

interface ProductSummaryViewProps {
  readonly productSummary: readonly ProductSummaryItem[];
}

/**
 * Type guard to check if a product summary item has a valid productId
 * @param item - The product summary item to validate
 * @returns True if the item has a non-null, non-empty productId
 */
function hasProductId(item: ProductSummaryItem): item is ValidatedProductSummaryItem {
  if (!item.productId) {
    console.warn('Product summary item missing productId:', {
      sku: item.sku,
      productName: item.productName,
    });
    return false;
  }
  return true;
}

export function ProductSummaryView({ productSummary }: ProductSummaryViewProps): React.JSX.Element {
  const tRaw = useTranslations('packing');
  // Type-safe translation function with compile-time key validation
  const t = (key: PackingTranslationKey): string => tRaw(key);

  const [gatheredProducts, setGatheredProducts] = useState<Set<string>>(new Set());

  // Filter out items without productId using type predicate for type safety
  const validProductSummary = productSummary.filter(hasProductId);

  /**
   * Toggles the gathered state of a product
   * @param productId - The ID of the product to toggle
   */
  const toggleProductGathered = (productId: string): void => {
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
  const totalCount = validProductSummary.length;

  const columns = [
    {
      key: 'gathered',
      label: '',
      className: 'w-12',
      render: (row: ValidatedProductSummaryItem) => (
        <button
          onClick={() => toggleProductGathered(row.productId)}
          className="hover:scale-110 transition-transform"
          aria-label={
            gatheredProducts.has(row.productId)
              ? t('markAsNotGathered')
              : t('markAsGathered')
          }
        >
          {gatheredProducts.has(row.productId) ? (
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
      render: (row: ValidatedProductSummaryItem) => (
        <span className="font-semibold">
          {row.totalQuantity} {row.unit}
        </span>
      ),
    },
    {
      key: 'orders',
      label: t('ordersRequiring'),
      render: (row: ValidatedProductSummaryItem) => (
        <div className="flex flex-wrap gap-1">
          {row.orders && row.orders.length > 0 && row.orders.slice(0, 3).map((order) => (
            <Badge key={order.orderNumber} variant="secondary" className="text-xs">
              {order.orderNumber} ({order.quantity})
            </Badge>
          ))}
          {row.orders && row.orders.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{row.orders.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
  ] as const satisfies readonly TableColumn<ValidatedProductSummaryItem>[];

  /**
   * Renders a mobile-friendly card view for a product summary item
   * @param item - The product summary item to render
   * @returns A card component or null if the item is invalid
   */
  const mobileCard = (item: ProductSummaryItem): React.ReactNode => {
    // Type guard: Return null if productId is missing to prevent crashes
    if (!hasProductId(item)) {
      return null;
    }

    // At this point, TypeScript knows item is ValidatedProductSummaryItem
    const validItem = item;
    const isGathered = gatheredProducts.has(validItem.productId);

    return (
      <Card
        key={validItem.productId}
        className={`transition-all ${isGathered ? 'bg-muted/50 border-success' : ''}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <button
                  onClick={() => toggleProductGathered(validItem.productId)}
                  className="hover:scale-110 transition-transform"
                  aria-label={
                    isGathered
                      ? t('markAsNotGathered')
                      : t('markAsGathered')
                  }
                >
                  {isGathered ? (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                {validItem.productName}
              </CardTitle>
              <CardDescription className="font-mono">{validItem.sku}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('totalQuantity')}</span>
            <span className="font-semibold text-lg">
              {validItem.totalQuantity} {validItem.unit}
            </span>
          </div>

          {validItem.orders && validItem.orders.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {t('ordersRequiring')} ({validItem.orders.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {validItem.orders.map((order) => (
                  <Badge key={order.orderNumber} variant="secondary" className="text-xs">
                    {order.orderNumber} ({order.quantity})
                  </Badge>
                ))}
              </div>
            </div>
          )}
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
            data={validProductSummary}
            mobileCard={mobileCard}
            emptyMessage={t('noProducts')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
