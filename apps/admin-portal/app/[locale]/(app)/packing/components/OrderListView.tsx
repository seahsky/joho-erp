'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Package2, PauseCircle, Truck } from 'lucide-react';
import { PackingOrderCard } from './PackingOrderCard';
import { AreaLabelFilter } from './AreaLabelFilter';
import { Card, CardContent, Button, Badge } from '@joho-erp/ui';

interface OrderListViewProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaName: string | null;
    areaPackingSequence: number | null;
    areaColorVariant?: string;
    areaDisplayName?: string;
    deliverySequence: number | null;
    status: string;
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
  areaId?: string;
  onAreaChange?: (areaId: string) => void;
}

// Group orders by area for per-area packing sequences
interface AreaGroup {
  areaName: string | null;
  areaDisplayName: string;
  areaColorVariant: string;
  orders: OrderListViewProps['orders'];
}

export function OrderListView({
  orders,
  deliveryDate: _deliveryDate,
  onOrderUpdated,
  focusedOrderNumber,
  onClearFocus,
  areaId = '',
  onAreaChange
}: OrderListViewProps) {
  const t = useTranslations('packing');

  // Memoize the clear focus callback to avoid unnecessary effect re-runs
  const stableClearFocus = useCallback(() => {
    onClearFocus?.();
  }, [onClearFocus]);

  // Handle scrolling to and highlighting focused order
  useEffect(() => {
    if (!focusedOrderNumber) return;

    // Check if order is in current list - if not in view but we have an area filter, reset it
    const orderInOrders = orders.some(o => o.orderNumber === focusedOrderNumber);

    if (!orderInOrders && areaId && onAreaChange) {
      // Order might be filtered out by area - reset area filter to show all
      onAreaChange('');
      // Let the retry mechanism handle finding the element after the filter resets
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
  }, [focusedOrderNumber, orders, areaId, onAreaChange, stableClearFocus]);

  // Sort orders: move ready_for_delivery orders to the bottom
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === 'ready_for_delivery' && b.status !== 'ready_for_delivery') return 1;
    if (a.status !== 'ready_for_delivery' && b.status === 'ready_for_delivery') return -1;
    return 0; // Preserve original order for same status
  });

  // Group orders by area for per-area packing sequences
  const areaGroups = useMemo<AreaGroup[]>(() => {
    const groupMap = new Map<string | null, AreaGroup>();

    for (const order of sortedOrders) {
      const areaName = order.areaName ?? null;
      const areaDisplayName = order.areaDisplayName ?? 'Unassigned';
      const areaColorVariant = order.areaColorVariant ?? 'secondary';

      if (!groupMap.has(areaName)) {
        groupMap.set(areaName, {
          areaName,
          areaDisplayName,
          areaColorVariant,
          orders: [],
        });
      }
      groupMap.get(areaName)!.orders.push(order);
    }

    // Convert to array and sort: named areas first (alphabetically), then unassigned
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
      // Unassigned (null) goes last
      if (a.areaName === null && b.areaName !== null) return 1;
      if (a.areaName !== null && b.areaName === null) return -1;
      // Sort by area name if both assigned
      return (a.areaName || '').localeCompare(b.areaName || '');
    });
  }, [sortedOrders]);

  // Check if we have multiple areas (need to show grouping)
  const hasMultipleAreas = areaGroups.length > 1 || (areaGroups.length === 1 && areaGroups[0].areaName !== null);

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
      {/* Area Label Filter */}
      {onAreaChange && (
        <AreaLabelFilter
          selectedAreaId={areaId}
          onAreaChange={onAreaChange}
        />
      )}

      {/* Orders Count with Paused Indicator */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {sortedOrders.length} {sortedOrders.length === 1 ? t('order') : t('orders')}
          </p>
          {/* Show paused orders count */}
          {sortedOrders.filter(o => o.isPaused).length > 0 && (
            <Badge variant="outline" className="border-warning/50 text-warning-foreground bg-warning/10">
              <PauseCircle className="h-3 w-3 mr-1" />
              {sortedOrders.filter(o => o.isPaused).length} {t('paused')}
            </Badge>
          )}
          {/* Show orders with progress */}
          {sortedOrders.filter(o => (o.packedItemsCount ?? 0) > 0 && !o.isPaused).length > 0 && (
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
              {sortedOrders.filter(o => (o.packedItemsCount ?? 0) > 0 && !o.isPaused).length} {t('inProgress')}
            </Badge>
          )}
        </div>
      </div>

      {/* Orders grouped by area (or flat list if single/no area) */}
      {hasMultipleAreas ? (
        <div className="space-y-6">
          {areaGroups.map((group) => (
            <div key={group.areaName ?? 'unassigned'} className="space-y-3">
              {/* Area Header */}
              <div className="flex items-center gap-2 px-2 py-2 bg-muted/50 rounded-lg">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {group.areaDisplayName}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {group.orders.length} {group.orders.length === 1 ? t('order') : t('orders')}
                </Badge>
              </div>
              {/* 2-Column Grid Layout for Area's Orders */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.orders.map((order, index) => (
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
            </div>
          ))}
        </div>
      ) : (
        /* Flat list when no area grouping needed */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedOrders.map((order, index) => (
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
      )}

      {/* Empty State for Filter */}
      {sortedOrders.length === 0 && areaId && onAreaChange && (
        <Card>
          <CardContent className="p-12 text-center border-2 border-dashed">
            <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t('noOrdersForArea')}</p>
            <Button
              onClick={() => onAreaChange('')}
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
            background-color: transparent;
            border-color: transparent;
            transform: scale(1);
          }
          25%, 75% {
            box-shadow: 0 0 0 4px hsl(var(--primary) / 0.4);
            background-color: hsl(var(--primary) / 0.08);
            border-color: hsl(var(--primary) / 0.6);
            transform: scale(1.01);
          }
          50% {
            box-shadow: 0 0 0 6px hsl(var(--primary) / 0.3);
            background-color: hsl(var(--primary) / 0.12);
            border-color: hsl(var(--primary));
            transform: scale(1.02);
          }
        }

        .order-card-highlight {
          animation: orderHighlightPulse 2s ease-in-out;
          border-radius: 0.5rem;
          border: 2px solid transparent;
        }
      `}</style>
    </div>
  );
}
