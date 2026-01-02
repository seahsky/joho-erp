'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, StatusBadge, Skeleton, H3, Muted, Input, EmptyState, type StatusType } from '@joho-erp/ui';
import { ShoppingCart, Loader2, Search, Calendar, X } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCurrency } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { OrderDetailsModal } from './order-details-modal';
import { BackorderStatusBadge, type BackorderStatusType } from './BackorderStatusBadge';

export function OrderList() {
  const t = useTranslations('orders');
  const _tCommon = useTranslations('common');
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<'all' | StatusType>('all');
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = api.order.getMyOrders.useQuery({
    status: filter === 'all' ? undefined : filter,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom,
    dateTo: dateTo,
    limit: 50,
  });

  const hasActiveFilters = debouncedSearch || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Reorder mutation
  const reorderMutation = api.order.reorder.useMutation({
    onSuccess: () => {
      toast({
        title: t('reorderSuccess'),
        description: t('reorderSuccessMessage'),
        variant: 'default',
      });
      router.push('/orders');
    },
    onError: (error) => {
      toast({
        title: t('reorderError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleReorder = (orderId: string) => {
    // Use the reorder endpoint which handles everything
    reorderMutation.mutate({
      orderId,
    });
  };

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
      <div className="space-y-4">
        {/* Filter Pills Skeleton */}
        <div className="flex gap-2 pb-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-11 w-28 rounded-full" />
          ))}
        </div>

        {/* Order Cards Skeleton */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6 space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1 rounded-md" />
                  <Skeleton className="h-11 flex-1 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive mb-2">{t('errorLoading')}</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  // Use orders from data - tRPC infers the correct types from Prisma
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-4">
      {/* Search and Date Filters */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Date Range Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={dateFrom ? dateFrom.toISOString().split('T')[0] : ''}
              onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : undefined)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={t('dateFrom')}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="date"
              value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
              onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={t('dateTo')}
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'confirmed', 'delivered'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
              filter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {status === 'all' ? t('allOrders') : t(status)}
          </button>
        ))}
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-4 md:p-6 space-y-3">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div>
                  <H3 className="text-lg">#{order.orderNumber}</H3>
                  <Muted>{formatDate(order.orderedAt)}</Muted>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <StatusBadge status={order.status as StatusType} />
                  <BackorderStatusBadge
                    status={(order.backorderStatus as BackorderStatusType) || 'none'}
                  />
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{order.items.length}</span>{' '}
                  {order.items.length === 1 ? t('itemCount', { count: order.items.length }) : t('itemCount_plural', { count: order.items.length })} •{' '}
                  <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                </p>
                {order.status === 'ready_for_delivery' && order.requestedDeliveryDate && (
                  <p className="text-sm text-muted-foreground">
                    {t('requested')} {formatDate(order.requestedDeliveryDate)}
                  </p>
                )}
                {order.delivery?.deliveredAt && (
                  <p className="text-sm text-muted-foreground">
                    {t('deliveredDate')} {formatDate(order.delivery.deliveredAt)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="default"
                  className="flex-1 md:h-10"
                  onClick={() => handleViewDetails(order.id)}
                >
                  {t('viewDetails')}
                </Button>
                {order.status === 'delivered' && (
                  <Button
                    variant="default"
                    size="default"
                    className="flex-1 md:h-10"
                    onClick={() => handleReorder(order.id)}
                    disabled={reorderMutation.isPending}
                  >
                    {reorderMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('reordering')}
                      </>
                    ) : (
                      t('reorder')
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title={t('noOrders')}
          action={{
            label: t('startShopping'),
            onClick: () => router.push('/products'),
          }}
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
