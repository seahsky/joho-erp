'use client';

import { useState } from 'react';
import { Badge } from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { CheckSquare, Square, Package2 } from 'lucide-react';

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

interface ProductSummaryViewProps {
  readonly productSummary: readonly ProductSummaryItem[];
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

export function ProductSummaryView({ productSummary }: ProductSummaryViewProps): React.JSX.Element {
  const t = useTranslations('packing');
  const [gatheredProducts, setGatheredProducts] = useState<Set<string>>(new Set());

  // Filter out items without productId using type predicate for type safety
  const validProductSummary = productSummary.filter(hasProductId);

  /**
   * Toggles the gathered state of a product
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

  if (validProductSummary.length === 0) {
    return (
      <div className="bg-card border-2 border-dashed border-border rounded-lg p-12 text-center">
        <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">{t('noProducts')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-b-lg shadow-sm">
      {/* Checklist Items */}
      <div className="divide-y divide-border">
        {validProductSummary.map((item, index) => {
          const isGathered = gatheredProducts.has(item.productId);

          return (
            <button
              key={item.productId}
              onClick={() => toggleProductGathered(item.productId)}
              className={`w-full text-left p-3 transition-all duration-200 hover:bg-muted/50 group ${
                isGathered ? 'bg-success/10 hover:bg-success/15' : ''
              }`}
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
                          variant="secondary"
                          className="text-xs font-mono"
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
            </button>
          );
        })}
      </div>

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
    </div>
  );
}
