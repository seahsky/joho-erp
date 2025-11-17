'use client';

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatusBadge, Skeleton, H1, Muted, Small, CountUp, EmptyState, type StatusType } from '@jimmy-beef/ui';
import { Package, Users, ShoppingCart, TruckIcon, PackageX, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

export default function DashboardPage() {
  const t = useTranslations();

  const { data: stats, isLoading: statsLoading } = api.dashboard.getStats.useQuery();
  const { data: recentOrders, isLoading: ordersLoading } = api.dashboard.getRecentOrders.useQuery({ limit: 4 });
  const { data: lowStockItems, isLoading: stockLoading } = api.dashboard.getLowStockItems.useQuery({ limit: 3 });

  const isLoading = statsLoading || ordersLoading || stockLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Header Skeleton */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders & Low Stock Skeleton */}
        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between pb-4 border-b last:border-0">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between pb-3 border-b last:border-0">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <H1>{t('dashboard.title')}</H1>
          <Muted className="mt-2">{t('dashboard.subtitle')}</Muted>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalOrders')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={stats?.totalOrders || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">All time</Small>
          </CardContent>
        </Card>

        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('dashboard.pendingOrders')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Package className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={stats?.pendingOrders || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">Require processing</Small>
          </CardContent>
        </Card>

        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('dashboard.activeCustomers')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={stats?.totalCustomers || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">Active accounts</Small>
          </CardContent>
        </Card>

        <Card className="stat-card animate-fade-in-up delay-300">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('dashboard.activeDeliveries')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
              <TruckIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={stats?.activeDeliveries || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">Out for delivery</Small>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7 mb-6 md:mb-8">
        {/* Recent Orders */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{t('dashboard.recentOrders')}</CardTitle>
            <CardDescription>Latest orders from your customers</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                      <StatusBadge status={order.status as StatusType} showIcon={false} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={PackageX}
                  title="No recent orders"
                  description="Orders will appear here when customers place them"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('dashboard.lowStockAlerts')}</CardTitle>
            <CardDescription>Products requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {lowStockItems && lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-destructive">
                        {item.currentStock} {item.unit} {t('dashboard.unitsLeft', { default: 'left' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Threshold: {item.lowStockThreshold}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="No low stock items"
                  description="All products are well stocked"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
