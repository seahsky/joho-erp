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
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
        <Package2 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">{t('noProducts')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-slate-200 rounded-b-lg shadow-sm">
      {/* Checklist Items */}
      <div className="divide-y-2 divide-slate-100">
        {validProductSummary.map((item, index) => {
          const isGathered = gatheredProducts.has(item.productId);

          return (
            <button
              key={item.productId}
              onClick={() => toggleProductGathered(item.productId)}
              className={`w-full text-left p-4 transition-all duration-200 hover:bg-slate-50 group ${
                isGathered ? 'bg-green-50 hover:bg-green-100' : ''
              }`}
              style={{
                animationDelay: `${index * 30}ms`,
                animation: 'slideIn 0.3s ease-out',
              }}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div className="flex-shrink-0 mt-0.5">
                  {isGathered ? (
                    <CheckSquare className="h-7 w-7 text-green-600 transition-transform group-hover:scale-110" />
                  ) : (
                    <Square className="h-7 w-7 text-slate-400 transition-transform group-hover:scale-110" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  {/* SKU + Quantity */}
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span
                      className={`font-mono font-bold text-base tracking-tight ${
                        isGathered ? 'text-slate-500 line-through' : 'text-slate-900'
                      }`}
                    >
                      {item.sku}
                    </span>
                    <span className="font-bold text-lg text-orange-600 tabular-nums whitespace-nowrap">
                      {item.totalQuantity}
                      <span className="text-sm text-slate-600 ml-1">{item.unit}</span>
                    </span>
                  </div>

                  {/* Product Name */}
                  <p
                    className={`text-sm font-medium mb-2 ${
                      isGathered ? 'text-slate-500 line-through' : 'text-slate-700'
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
                          className="text-xs font-mono bg-slate-100 text-slate-700 border border-slate-300"
                        >
                          {order.orderNumber} ×{order.quantity}
                        </Badge>
                      ))}
                      {item.orders.length > 5 && (
                        <Badge
                          variant="outline"
                          className="text-xs font-mono border-slate-400 text-slate-600"
                        >
                          +{item.orders.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Barcode-style divider */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
