'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, StatusBadge, Skeleton, H3, Muted, Input, IllustratedEmptyState, type StatusType, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@joho-erp/ui';
import { Loader2, Search, Calendar, X, ArrowUpDown } from 'lucide-react';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { OrderDetailsModal } from './order-details-modal';
import { StaggeredList } from '@/components/staggered-list';
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/use-pull-to-refresh';

export function OrderList() {
  const t = useTranslations('orders');
  const tStatus = useTranslations('statusBadges');
  const _tCommon = useTranslations('common');
  const tIllustrated = useTranslations('illustratedEmptyState');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<'all' | StatusType>('all');
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>('date-desc');

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = api.order.getMyOrders.useQuery({
    status: filter === 'all' ? undefined : filter,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom,
    dateTo: dateTo,
    limit: 50,
  });

  // Pull-to-refresh for mobile
  const {
    containerRef,
    pullDistance,
    isRefreshing,
    touchHandlers,
  } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
  });

  // Sort orders based on selected sort option - must be called before early returns
  const orders = React.useMemo(() => {
    const rawOrders = data?.orders ?? [];
    const sorted = [...rawOrders];
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime());
      case 'amount-desc':
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
      case 'amount-asc':
        return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
      default:
        return sorted;
    }
  }, [data?.orders, sortBy]);

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
      console.error('Reorder error:', error.message);
      toast({
        title: t('reorderError'),
        description: tErrors('orderFailed'),
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
      <IllustratedEmptyState
        variant="error"
        title={tIllustrated('error.title')}
        description={tIllustrated('error.description')}
        secondaryDescription={error.message}
        primaryAction={{
          label: tIllustrated('error.primaryAction'),
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-4"
      {...touchHandlers}
    >
      {/* Pull-to-refresh indicator (mobile only) */}
      <div className="md:hidden">
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          threshold={80}
          isRefreshing={isRefreshing}
        />
      </div>

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
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={t('dateFrom')}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="date"
              value={dateTo ? dateTo.toISOString().split('T')[0] : ''}
              onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : undefined)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">{t('sortDateDesc')}</SelectItem>
              <SelectItem value="date-asc">{t('sortDateAsc')}</SelectItem>
              <SelectItem value="amount-desc">{t('sortAmountDesc')}</SelectItem>
              <SelectItem value="amount-asc">{t('sortAmountAsc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'awaiting_approval', 'confirmed', 'packing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
              filter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {status === 'all' ? t('allOrders') : tStatus(status)}
          </button>
        ))}
      </div>

      {/* Order Cards */}
      <StaggeredList className="space-y-3">
        {orders.map((order) => (
          <Card key={order.id} className="overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.005] transition-all duration-200 bg-gradient-to-br from-background to-muted/10">
            <CardContent className="p-4 md:p-6 space-y-3">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div>
                  <H3 className="text-lg">#{order.orderNumber}</H3>
                  <Muted>{formatDate(order.orderedAt)}</Muted>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <StatusBadge status={order.status as StatusType} />
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{order.items.length}</span>{' '}
                  {order.items.length === 1 ? t('itemCount', { count: order.items.length }) : t('itemCount_plural', { count: order.items.length })} •{' '}
                  <span className="font-semibold">{formatAUD(order.totalAmount)}</span>
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
      </StaggeredList>

      {/* Empty State */}
      {orders.length === 0 && (
        <IllustratedEmptyState
          variant="no-orders"
          title={tIllustrated('noOrders.title')}
          description={tIllustrated('noOrders.description')}
          secondaryDescription={tIllustrated('noOrders.secondaryDescription')}
          primaryAction={{
            label: tIllustrated('noOrders.primaryAction'),
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
