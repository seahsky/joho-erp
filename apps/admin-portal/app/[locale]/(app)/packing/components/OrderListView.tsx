'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Package2 } from 'lucide-react';
import { PackingOrderCard } from './PackingOrderCard';
import { Card, CardContent, Button } from '@jimmy-beef/ui';

interface OrderListViewProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
    packingSequence: number | null;
    deliverySequence: number | null;
  }>;
  deliveryDate: Date;
  onOrderUpdated: () => void;
}

export function OrderListView({ orders, deliveryDate: _deliveryDate, onOrderUpdated }: OrderListViewProps) {
  const t = useTranslations('packing');
  const [areaFilter, setAreaFilter] = useState<string>('all');

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

      {/* Orders Count */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {filteredOrders.length} {filteredOrders.length === 1 ? t('order') : t('orders')}
          {areaFilter !== 'all' && ` · ${areaFilter.toUpperCase()}`}
        </p>
      </div>

      {/* 2-Column Grid Layout for Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.map((order, index) => (
          <div
            key={order.orderId}
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
      <style jsx>{`
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
      `}</style>
    </div>
  );
}
