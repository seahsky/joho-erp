'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  ResponsiveTable,
  type Column,
  StatusBadge,
  type StatusType,
  CountUp,
  EmptyState,
} from '@jimmy-beef/ui';
import { Search, ShoppingBag, Loader2, Eye, Package, PackageX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  orderedAt: Date;
  status: StatusType;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  deliveryAddress: {
    areaTag: string;
  };
};

export default function OrdersPage() {
  const t = useTranslations('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');

  const { data, isLoading, error } = api.order.getAll.useQuery({
    status: statusFilter || undefined,
    areaTag: areaFilter || undefined,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const orders = (data?.orders ?? []) as Order[];

  // Apply client-side search filter
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query)
    );
  });

  const totalOrders = filteredOrders.length;
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending').length;
  const confirmedOrders = filteredOrders.filter((o) => o.status === 'confirmed').length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'delivered').length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      label: t('orderNumber'),
      className: 'font-medium',
    },
    {
      key: 'customerName',
      label: t('customer'),
    },
    {
      key: 'orderedAt',
      label: t('date'),
      render: (value) => new Date(value as Date).toLocaleDateString(),
    },
    {
      key: 'items',
      label: t('items'),
      render: (value) => (value as Array<{ productName: string; quantity: number }>).length,
    },
    {
      key: 'deliveryAddress',
      label: t('area'),
      render: (_, order) => order.deliveryAddress.areaTag.toUpperCase(),
    },
    {
      key: 'totalAmount',
      label: t('total'),
      render: (value) => `$${(value as number).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      label: t('status'),
      render: (value) => <StatusBadge status={value as StatusType} />,
    },
    {
      key: 'id',
      label: t('common.actions', { ns: 'common' }),
      className: 'text-right',
      render: () => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" aria-label={t('common.view', { ns: 'common' })}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCard = (order: Order) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{order.orderNumber}</h3>
          <p className="text-sm text-muted-foreground">{order.customerName}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">{t('date')}</p>
          <p className="font-medium">{new Date(order.orderedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('items')}</p>
          <p className="font-medium">{order.items.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('area')}</p>
          <p className="font-medium">{order.deliveryAddress.areaTag.toUpperCase()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('total')}</p>
          <p className="font-medium">${order.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="h-4 w-4 mr-1" />
          {t('viewDetails')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('totalOrders')}</CardDescription>
            <div className="stat-value tabular-nums">
              <CountUp end={totalOrders} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('pendingOrders')}</CardDescription>
            <div className="stat-value tabular-nums text-warning">
              <CountUp end={pendingOrders} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('confirmedOrders')}</CardDescription>
            <div className="stat-value tabular-nums text-info">
              <CountUp end={confirmedOrders} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-300">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('deliveredOrders')}</CardDescription>
            <div className="stat-value tabular-nums text-success">
              <CountUp end={deliveredOrders} />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="confirmed">{t('confirmed')}</option>
                <option value="packing">{t('packing')}</option>
                <option value="ready_for_delivery">{t('readyForDelivery')}</option>
                <option value="out_for_delivery">{t('outForDelivery')}</option>
                <option value="delivered">{t('delivered')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </select>
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="">{t('allAreas')}</option>
                <option value="north">{t('north')}</option>
                <option value="south">{t('south')}</option>
                <option value="east">{t('east')}</option>
                <option value="west">{t('west')}</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Revenue Card */}
      <Card className="stat-card mb-6">
        <div className="stat-card-gradient" />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>{t('totalRevenue')}</CardDescription>
              <div className="text-3xl font-bold tabular-nums">
                $<CountUp end={totalRevenue} />
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {t('listTitle')}
            </div>
          </CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {filteredOrders.length > 0 ? (
            <ResponsiveTable
              data={filteredOrders}
              columns={columns}
              mobileCard={mobileCard}
              className="md:border-0"
            />
          ) : (
            <EmptyState
              icon={PackageX}
              title={t('noOrdersFound')}
              description={searchQuery || statusFilter || areaFilter ? t('adjustFilters') : t('ordersWillAppear')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
