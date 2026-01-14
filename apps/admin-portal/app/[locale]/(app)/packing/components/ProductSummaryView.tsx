'use client';

import { Badge, Card, CardContent } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Package2 } from 'lucide-react';

/**
 * Reference to an order that requires a specific product
 */
interface OrderReference {
  orderNumber: string;
  quantity: number;
  status: 'confirmed' | 'packing' | 'ready_for_delivery';
}

/**
 * Summary of a product across all orders for a delivery date
 */
interface ProductSummaryItem {
  productId: string | null | undefined;
  sku: string;
  productName: string;
  category: 'Beef' | 'Pork' | 'Chicken' | 'Lamb' | 'Processed' | null;
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

interface ProductSummaryViewProps {
  readonly productSummary: readonly ProductSummaryItem[];
  readonly onOrderBadgeClick?: (orderNumber: string) => void;
}

/**
 * Type guard to check if a product summary item has a valid productId
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

export function ProductSummaryView({ productSummary, onOrderBadgeClick }: ProductSummaryViewProps): React.JSX.Element {
  const t = useTranslations('packing');

  // Filter out items without productId using type predicate for type safety
  const validProductSummary = productSummary.filter(hasProductId);

  if (validProductSummary.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center border-2 border-dashed">
          <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">{t('noProducts')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-t-none">
      <CardContent className="p-0">
        {/* Product List */}
        <div className="divide-y divide-border">
        {validProductSummary.map((item, index) => {
          const allOrdersReady = item.orders?.every(order => order.status === 'ready_for_delivery') ?? false;

          return (
            <div
              key={item.productId}
              className={`w-full p-3 transition-all duration-200 ${allOrdersReady ? 'bg-muted/30' : ''}`}
              style={{
                animationDelay: `${index * 30}ms`,
                animation: 'slideIn 0.3s ease-out',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  {/* SKU + Quantity */}
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="font-mono font-semibold text-sm tracking-tight text-foreground">
                      {item.sku}
                    </span>
                    <span className="font-bold text-base text-primary tabular-nums whitespace-nowrap">
                      {item.totalQuantity}
                      <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                    </span>
                  </div>

                  {/* Product Name and Category */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex-1 truncate">
                      {item.productName}
                    </p>
                    {item.category && (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium whitespace-nowrap"
                      >
                        {t(`categories.${item.category.toLowerCase()}`)}
                      </Badge>
                    )}
                  </div>

                  {/* Order References */}
                  {item.orders && item.orders.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.orders.slice(0, 5).map((order) => (
                        <button
                          key={order.orderNumber}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOrderBadgeClick?.(order.orderNumber);
                          }}
                          className="focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95 active:opacity-80 rounded-full transition-transform"
                          aria-label={`Navigate to order ${order.orderNumber}`}
                        >
                          <Badge
                            variant={order.status === 'ready_for_delivery' ? 'success' : 'secondary'}
                            className="text-xs font-mono cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 active:ring-2 active:ring-primary transition-all"
                          >
                            {order.orderNumber} ×{order.quantity}
                          </Badge>
                        </button>
                      ))}
                      {item.orders.length > 5 && (
                        <Badge
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          +{item.orders.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </CardContent>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </Card>
  );
}
