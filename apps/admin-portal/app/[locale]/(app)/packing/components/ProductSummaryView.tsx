'use client';

import { useState } from 'react';
import { Badge, Card, CardContent } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { CheckSquare, Square, Package2 } from 'lucide-react';

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
  readonly deliveryDate: Date;
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

/**
 * Format date for localStorage key (YYYY-MM-DD)
 */
function formatDateForStorage(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function ProductSummaryView({ productSummary, deliveryDate, onOrderBadgeClick }: ProductSummaryViewProps): React.JSX.Element {
  const t = useTranslations('packing');

  // Initialize gathered state from localStorage for this delivery date
  const [gatheredProducts, setGatheredProducts] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();

    const storageKey = `packing-gathered-${formatDateForStorage(deliveryDate)}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Failed to parse gathered products from localStorage:', error);
        return new Set();
      }
    }

    return new Set();
  });

  // Filter out items without productId using type predicate for type safety
  const validProductSummary = productSummary.filter(hasProductId);

  /**
   * Toggles the gathered state of a product
   * Persists to localStorage for the current delivery date
   */
  const toggleProductGathered = (productId: string): void => {
    setGatheredProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        const storageKey = `packing-gathered-${formatDateForStorage(deliveryDate)}`;
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      }

      return next;
    });
  };

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
        {/* Checklist Items */}
        <div className="divide-y divide-border">
        {validProductSummary.map((item, index) => {
          const isGathered = gatheredProducts.has(item.productId);
          const allOrdersReady = item.orders?.every(order => order.status === 'ready_for_delivery') ?? false;

          return (
            <div
              key={item.productId}
              role="button"
              tabIndex={0}
              onClick={() => toggleProductGathered(item.productId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleProductGathered(item.productId);
                }
              }}
              className={`w-full text-left p-3 transition-all duration-200 hover:bg-muted/50 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                isGathered ? 'bg-success/10 hover:bg-success/15' : ''
              } ${allOrdersReady ? 'bg-muted/30' : ''}`}
              style={{
                animationDelay: `${index * 30}ms`,
                animation: 'slideIn 0.3s ease-out',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="flex-shrink-0 mt-0.5">
                  {isGathered ? (
                    <CheckSquare className="h-6 w-6 text-success transition-transform group-hover:scale-110" />
                  ) : (
                    <Square className="h-6 w-6 text-muted-foreground transition-transform group-hover:scale-110" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  {/* SKU + Quantity */}
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span
                      className={`font-mono font-semibold text-sm tracking-tight ${
                        isGathered ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}
                    >
                      {item.sku}
                    </span>
                    <span className="font-bold text-base text-primary tabular-nums whitespace-nowrap">
                      {item.totalQuantity}
                      <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                    </span>
                  </div>

                  {/* Product Name */}
                  <p
                    className={`text-xs font-medium mb-2 ${
                      isGathered ? 'text-muted-foreground line-through' : 'text-muted-foreground'
                    }`}
                  >
                    {item.productName}
                  </p>

                  {/* Order References */}
                  {item.orders && item.orders.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.orders.slice(0, 5).map((order) => (
                        <Badge
                          key={order.orderNumber}
                          variant={order.status === 'ready_for_delivery' ? 'success' : 'secondary'}
                          className="text-xs font-mono cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-1 transition-all"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onOrderBadgeClick?.(order.orderNumber);
                          }}
                        >
                          {order.orderNumber} ×{order.quantity}
                        </Badge>
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
