'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Package2 } from 'lucide-react';
import { PackingOrderCard } from './PackingOrderCard';

interface OrderListViewProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
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
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'south':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'east':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'west':
        return 'bg-purple-500 text-white hover:bg-purple-600';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
        <Package2 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">{t('noOrders')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Area Filter - Only show if there are multiple areas */}
      {areaTags.length > 1 && (
        <div className="bg-white border-2 border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
              <Filter className="h-4 w-4" />
              <span>{t('filterByArea')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAreaFilter('all')}
                className={`px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wide transition-all ${
                  areaFilter === 'all'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('allAreas')}
              </button>
              {areaTags.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaFilter(area)}
                  className={`px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wide transition-all ${
                    areaFilter === area
                      ? getAreaBadgeColor(area) + ' shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {area.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Orders Count */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-600">
          {filteredOrders.length} {filteredOrders.length === 1 ? t('order') : t('orders')}
          {areaFilter !== 'all' && ` · ${areaFilter.toUpperCase()}`}
        </p>
      </div>

      {/* Flat Order List */}
      <div className="space-y-4">
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
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
          <Package2 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">{t('noOrdersForArea')}</p>
          <button
            onClick={() => setAreaFilter('all')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md font-bold text-sm uppercase hover:bg-orange-600 transition-colors"
          >
            {t('showAllAreas')}
          </button>
        </div>
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
