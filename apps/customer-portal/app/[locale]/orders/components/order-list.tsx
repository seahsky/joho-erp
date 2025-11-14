'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, Button, StatusBadge, type StatusType } from '@jimmy-beef/ui';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';

export function OrderList() {
  const t = useTranslations('orders');
  const [filter, setFilter] = React.useState<'all' | StatusType>('all');

  const { data, isLoading, error } = api.order.getMyOrders.useQuery({
    status: filter === 'all' ? undefined : filter,
    limit: 50,
  });

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('loading', { default: 'Loading orders...' })}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive mb-2">Error loading orders</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const orders = data?.orders || [];

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
        {orders.map((order) => (
          <Card key={order._id.toString()} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.orderedAt)}
                  </p>
                </div>
                <StatusBadge status={order.status as StatusType} />
              </div>

              {/* Order Details */}
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{order.items.length}</span>{' '}
                  {order.items.length === 1 ? 'item' : 'items'} •{' '}
                  <span className="font-semibold">${order.totalAmount.toFixed(2)}</span>
                </p>
                {order.status === 'out_for_delivery' && order.estimatedDeliveryTime && (
                  <p className="text-sm text-muted-foreground">
                    ETA: {formatDate(order.estimatedDeliveryTime)}
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
      {orders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{t('noOrders')}</p>
          <Button>{t('startShopping')}</Button>
        </div>
      )}
    </div>
  );
}
