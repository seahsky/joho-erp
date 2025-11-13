'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, Button, StatusBadge, type StatusType } from '@jimmy-beef/ui';
import { ShoppingCart } from 'lucide-react';

// Mock order data
const mockOrders = [
  {
    id: 'ORD-1235',
    customerId: 'customer-1',
    items: [
      { productName: 'Wagyu Beef', quantity: 5, unit: 'kg', price: 225.0 },
      { productName: 'Pork Belly', quantity: 3, unit: 'kg', price: 54.0 },
      { productName: 'Chicken Breast', quantity: 2, unit: 'kg', price: 25.0 },
    ],
    subtotal: 304.0,
    tax: 30.4,
    total: 334.4,
    status: 'out_for_delivery' as StatusType,
    createdAt: '2025-02-11T09:00:00Z',
    estimatedDelivery: '2025-02-11T14:00:00Z',
  },
  {
    id: 'ORD-1234',
    customerId: 'customer-1',
    items: [
      { productName: 'Angus Beef', quantity: 10, unit: 'kg', price: 385.0 },
      { productName: 'Pork Ribs', quantity: 5, unit: 'kg', price: 90.0 },
    ],
    subtotal: 475.0,
    tax: 47.5,
    total: 522.5,
    status: 'delivered' as StatusType,
    createdAt: '2025-02-10T08:30:00Z',
    deliveredAt: '2025-02-10T15:20:00Z',
  },
  {
    id: 'ORD-1233',
    customerId: 'customer-1',
    items: [
      { productName: 'Chicken Wings', quantity: 15, unit: 'kg', price: 180.0 },
    ],
    subtotal: 180.0,
    tax: 18.0,
    total: 198.0,
    status: 'delivered' as StatusType,
    createdAt: '2025-02-08T10:00:00Z',
    deliveredAt: '2025-02-08T16:30:00Z',
  },
];

export function OrderList() {
  const t = useTranslations('orders');
  const [filter, setFilter] = React.useState<'all' | StatusType>('all');

  const filteredOrders = filter === 'all'
    ? mockOrders
    : mockOrders.filter((order) => order.status === filter);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'confirmed', 'out_for_delivery', 'delivered'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {status === 'all' ? 'All Orders' : t(status)}
          </button>
        ))}
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">#{order.id}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Order Details */}
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{order.items.length}</span>{' '}
                  {order.items.length === 1 ? 'item' : 'items'} •{' '}
                  <span className="font-semibold">${order.total.toFixed(2)}</span>
                </p>
                {order.status === 'out_for_delivery' && order.estimatedDelivery && (
                  <p className="text-sm text-muted-foreground">
                    ETA: {formatDate(order.estimatedDelivery)}
                  </p>
                )}
                {order.status === 'delivered' && order.deliveredAt && (
                  <p className="text-sm text-muted-foreground">
                    Delivered: {formatDate(order.deliveredAt)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  {t('viewDetails')}
                </Button>
                {order.status === 'delivered' && (
                  <Button variant="default" size="sm" className="flex-1">
                    {t('reorder')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{t('noOrders')}</p>
          <Button>{t('startShopping')}</Button>
        </div>
      )}
    </div>
  );
}
