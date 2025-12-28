'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Package2, PauseCircle } from 'lucide-react';
import { PackingOrderCard } from './PackingOrderCard';
import { Card, CardContent, Button, Badge } from '@joho-erp/ui';

interface OrderListViewProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
    packingSequence: number | null;
    deliverySequence: number | null;
    // Partial progress fields
    isPaused?: boolean;
    lastPackedBy?: string | null;
    lastPackedAt?: Date | null;
    packedItemsCount?: number;
    totalItemsCount?: number;
  }>;
  deliveryDate: Date;
  onOrderUpdated: () => void;
  focusedOrderNumber?: string | null;
  onClearFocus?: () => void;
}

export function OrderListView({
  orders,
  deliveryDate: _deliveryDate,
  onOrderUpdated,
  focusedOrderNumber,
  onClearFocus
}: OrderListViewProps) {
  const t = useTranslations('packing');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  // Memoize the clear focus callback to avoid unnecessary effect re-runs
  const stableClearFocus = useCallback(() => {
    onClearFocus?.();
  }, [onClearFocus]);

  // Handle scrolling to and highlighting focused order
  useEffect(() => {
    if (!focusedOrderNumber) return;

    // Check if order is in current filter - if not, reset filter
    const orderInOrders = orders.some(o => o.orderNumber === focusedOrderNumber);
    const orderInFiltered = areaFilter === 'all'
      ? orderInOrders
      : orders.some(o => o.orderNumber === focusedOrderNumber && o.areaTag === areaFilter);

    if (orderInOrders && !orderInFiltered) {
      setAreaFilter('all');
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;
    const retryInterval = 100;
    let scrollTimer: NodeJS.Timeout | null = null;
    let highlightTimer: NodeJS.Timeout | null = null;

    const attemptScroll = () => {
      const element = document.getElementById(`order-card-${focusedOrderNumber}`);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('order-card-highlight');

        highlightTimer = setTimeout(() => {
          element.classList.remove('order-card-highlight');
          stableClearFocus();
        }, 1500);
      } else if (attempts < maxAttempts) {
        attempts++;
        scrollTimer = setTimeout(attemptScroll, retryInterval);
      } else {
        // Max attempts reached, clear focus to avoid stuck state
        stableClearFocus();
      }
    };

    // Initial delay to allow for any pending renders
    scrollTimer = setTimeout(attemptScroll, 100);

    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [focusedOrderNumber, orders, areaFilter, stableClearFocus]);

  // Get unique area tags
  const areaTags = Array.from(new Set(orders.map((o) => o.areaTag))).sort();

  // Filter orders by area
  const filteredOrders = areaFilter === 'all'
    ? orders
    : orders.filter((o) => o.areaTag === areaFilter);

  const getAreaBadgeColor = (areaTag: string) => {
    switch (areaTag.toLowerCase()) {
      case 'north':
        return 'bg-info text-info-foreground hover:bg-info/90';
      case 'south':
        return 'bg-success text-success-foreground hover:bg-success/90';
      case 'east':
        return 'bg-warning text-warning-foreground hover:bg-warning/90';
      case 'west':
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center border-2 border-dashed">
          <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">{t('noOrders')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Area Filter - Only show if there are multiple areas */}
      {areaTags.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{t('filterByArea')}</span>
              </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAreaFilter('all')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wide transition-all ${
                  areaFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t('allAreas')}
              </button>
              {areaTags.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaFilter(area)}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wide transition-all ${
                    areaFilter === area
                      ? getAreaBadgeColor(area) + ' shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {area.toUpperCase()}
                </button>
              ))}
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Count with Paused Indicator */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {filteredOrders.length} {filteredOrders.length === 1 ? t('order') : t('orders')}
            {areaFilter !== 'all' && ` · ${areaFilter.toUpperCase()}`}
          </p>
          {/* Show paused orders count */}
          {filteredOrders.filter(o => o.isPaused).length > 0 && (
            <Badge variant="outline" className="border-warning/50 text-warning-foreground bg-warning/10">
              <PauseCircle className="h-3 w-3 mr-1" />
              {filteredOrders.filter(o => o.isPaused).length} {t('paused')}
            </Badge>
          )}
          {/* Show orders with progress */}
          {filteredOrders.filter(o => (o.packedItemsCount ?? 0) > 0 && !o.isPaused).length > 0 && (
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
              {filteredOrders.filter(o => (o.packedItemsCount ?? 0) > 0 && !o.isPaused).length} {t('inProgress')}
            </Badge>
          )}
        </div>
      </div>

      {/* 2-Column Grid Layout for Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.map((order, index) => (
          <div
            key={order.orderId}
            id={`order-card-${order.orderNumber}`}
            style={{
              animationDelay: `${index * 50}ms`,
              animation: 'orderFadeIn 0.4s ease-out',
            }}
          >
            <PackingOrderCard order={order} onOrderUpdated={onOrderUpdated} />
          </div>
        ))}
      </div>

      {/* Empty State for Filter */}
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center border-2 border-dashed">
            <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t('noOrdersForArea')}</p>
            <Button
              onClick={() => setAreaFilter('all')}
              className="mt-4"
            >
              {t('showAllAreas')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes orderFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes orderHighlightPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 transparent;
          }
          25%, 75% {
            box-shadow: 0 0 0 4px hsl(var(--primary) / 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px hsl(var(--primary) / 0.3);
          }
        }

        .order-card-highlight {
          animation: orderHighlightPulse 1.5s ease-in-out;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
