'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Package2, PauseCircle, Truck } from 'lucide-react';
import { PackingOrderCard } from './PackingOrderCard';
import { Card, CardContent, Button, Badge } from '@joho-erp/ui';

interface OrderListViewProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaName: string | null;
    packingSequence: number | null;
    deliverySequence: number | null;
    status: string;
    // Per-driver fields for multi-driver grouping
    driverId?: string | null;
    driverName?: string | null;
    driverPackingSequence?: number | null;
    driverDeliverySequence?: number | null;
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

// Group orders by driver for multi-driver packing
interface DriverGroup {
  driverId: string | null;
  driverName: string | null;
  orders: OrderListViewProps['orders'];
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

    console.log('[OrderListView] Focus effect triggered:', focusedOrderNumber);

    // Check if order is in current filter - if not, reset filter
    const orderInOrders = orders.some(o => o.orderNumber === focusedOrderNumber);
    const orderInFiltered = areaFilter === 'all'
      ? orderInOrders
      : orders.some(o => o.orderNumber === focusedOrderNumber && o.areaName === areaFilter);

    if (orderInOrders && !orderInFiltered) {
      setAreaFilter('all');
      // Don't return - let the retry mechanism handle finding the element
      // after the filter resets and the DOM updates
    }

    let attempts = 0;
    const maxAttempts = 10;
    const retryInterval = 100;
    let scrollTimer: NodeJS.Timeout | null = null;
    let highlightTimer: NodeJS.Timeout | null = null;

    const attemptScroll = () => {
      const element = document.getElementById(`order-card-${focusedOrderNumber}`);
      console.log('[OrderListView] Attempt scroll, element found:', !!element, 'attempt:', attempts + 1);

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

  // Get unique area names (filter out null values)
  const areaNames = Array.from(new Set(orders.map((o) => o.areaName).filter((name): name is string => name !== null))).sort();

  // Filter orders by area
  const filteredByArea = areaFilter === 'all'
    ? orders
    : orders.filter((o) => o.areaName === areaFilter);

  // Sort orders: move ready_for_delivery orders to the bottom
  const filteredOrders = [...filteredByArea].sort((a, b) => {
    if (a.status === 'ready_for_delivery' && b.status !== 'ready_for_delivery') return 1;
    if (a.status !== 'ready_for_delivery' && b.status === 'ready_for_delivery') return -1;
    return 0; // Preserve original order for same status
  });

  // Group orders by driver for multi-driver support
  const driverGroups = useMemo<DriverGroup[]>(() => {
    const groupMap = new Map<string | null, DriverGroup>();

    for (const order of filteredOrders) {
      const driverId = order.driverId ?? null;
      const driverName = order.driverName ?? null;

      if (!groupMap.has(driverId)) {
        groupMap.set(driverId, {
          driverId,
          driverName,
          orders: [],
        });
      }
      groupMap.get(driverId)!.orders.push(order);
    }

    // Convert to array and sort: assigned drivers first, then unassigned
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
      // Unassigned (null) goes last
      if (a.driverId === null && b.driverId !== null) return 1;
      if (a.driverId !== null && b.driverId === null) return -1;
      // Sort by driver name if both assigned
      return (a.driverName || '').localeCompare(b.driverName || '');
    });
  }, [filteredOrders]);

  // Check if we have multiple drivers (need to show grouping)
  const hasMultipleDrivers = driverGroups.length > 1 || (driverGroups.length === 1 && driverGroups[0].driverId !== null);

  const getAreaBadgeColor = (areaName: string) => {
    switch (areaName.toLowerCase()) {
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
      {areaNames.length > 1 && (
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
              {areaNames.map((area) => (
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

      {/* Orders grouped by driver (or flat list if single/no driver) */}
      {hasMultipleDrivers ? (
        <div className="space-y-6">
          {driverGroups.map((group) => (
            <div key={group.driverId ?? 'unassigned'} className="space-y-3">
              {/* Driver Header */}
              <div className="flex items-center gap-2 px-2 py-2 bg-muted/50 rounded-lg">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {group.driverName || t('unassignedOrders')}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {group.orders.length} {group.orders.length === 1 ? t('order') : t('orders')}
                </Badge>
              </div>
              {/* 2-Column Grid Layout for Driver's Orders */}
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
        /* Flat list when no driver grouping needed */
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
      )}

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
