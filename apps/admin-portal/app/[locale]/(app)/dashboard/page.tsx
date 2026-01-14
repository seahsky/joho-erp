'use client';

export const dynamic = 'force-dynamic';

import { StatusBadge, EmptyState, type StatusType } from '@joho-erp/ui';
import { PackageX, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import {
  DashboardStatBar,
  DashboardDataCard,
  DashboardListItem,
} from '@/components/dashboard';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = api.dashboard.getStats.useQuery();
  const { data: recentOrders, isLoading: ordersLoading } = api.dashboard.getRecentOrders.useQuery({ limit: 6 });
  const { data: lowStockItems, isLoading: stockLoading } = api.dashboard.getLowStockItems.useQuery({ limit: 6 });
  const { data: pendingBackorders, isLoading: backordersLoading } = api.order.getPendingBackorders.useQuery({});
  const { data: expiringStock, isLoading: expiringStockLoading } = api.dashboard.getExpiringStock.useQuery();

  const isLoading = statsLoading || ordersLoading || stockLoading || backordersLoading || expiringStockLoading;
  const pendingBackordersCount = pendingBackorders?.items.length || 0;

  // Map order status to status dot type
  const getStatusDot = (status: string): 'pending' | 'processing' | 'completed' | 'cancelled' | 'delivered' => {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'cancelled' | 'delivered'> = {
      pending: 'pending',
      processing: 'processing',
      ready_for_delivery: 'processing',
      out_for_delivery: 'processing',
      delivered: 'delivered',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    return statusMap[status] || 'pending';
  };

  // Get stock level status
  const getStockDot = (current: number, threshold: number): 'low' | 'critical' => {
    return current < threshold * 0.5 ? 'critical' : 'low';
  };

  // Prepare stat items for the stat bar
  const statItems = [
    {
      label: t('totalOrders'),
      value: stats?.totalOrders || 0,
      color: 'primary' as const,
      href: '/orders',
    },
    {
      label: t('pendingOrders'),
      value: stats?.pendingOrders || 0,
      color: 'warning' as const,
      href: '/orders?status=pending',
    },
    {
      label: t('activeCustomers'),
      value: stats?.totalCustomers || 0,
      color: 'success' as const,
      href: '/customers',
    },
    {
      label: t('activeDeliveries'),
      value: stats?.activeDeliveries || 0,
      color: 'info' as const,
      href: '/driver',
    },
    {
      label: t('pendingBackorders'),
      value: pendingBackordersCount,
      color: 'warning' as const,
      href: '/orders?backorderFilter=pending',
    },
    {
      label: t('dashboard.expiringStock'),
      value: expiringStock?.summary.totalCount || 0,
      color: 'destructive' as const,
      href: '/inventory?expiryFilter=alert',
      subtitle: expiringStock
        ? `${expiringStock.summary.expiredCount} ${t('dashboard.expired')}`
        : undefined,
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] px-4 py-4">
      {/* Stat Bar */}
      <DashboardStatBar stats={statItems} isLoading={isLoading} />

      {/* Three-Column Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 flex-1 min-h-0">
        {/* Recent Orders */}
        <DashboardDataCard
          title={t('recentOrders')}
          badge={recentOrders?.length || 0}
          viewAllHref="/orders"
          viewAllLabel={t('dashboard.viewAll')}
          isLoading={ordersLoading}
          isEmpty={!recentOrders || recentOrders.length === 0}
          emptyState={
            <EmptyState
              icon={PackageX}
              title={t('noRecentOrders')}
              description={t('ordersWillAppearHere')}
              size="sm"
            />
          }
        >
          {recentOrders?.map((order) => (
            <DashboardListItem
              key={order.id}
              statusDot={getStatusDot(order.status)}
              primary={
                <span>
                  {order.orderNumber}{' '}
                  <span className="text-muted-foreground font-normal">• {order.customerName}</span>
                </span>
              }
              secondary={
                <StatusBadge status={order.status as StatusType} showIcon={false} size="xs" />
              }
              rightPrimary={formatAUD(order.totalAmount)}
              onClick={() => router.push(`/orders?orderId=${order.id}`)}
            />
          ))}
        </DashboardDataCard>

        {/* Low Stock Alerts */}
        <DashboardDataCard
          title={t('lowStockAlerts')}
          badge={lowStockItems?.length || 0}
          viewAllHref="/inventory?stockFilter=low"
          viewAllLabel={t('dashboard.viewAll')}
          isLoading={stockLoading}
          isEmpty={!lowStockItems || lowStockItems.length === 0}
          emptyState={
            <EmptyState
              icon={AlertTriangle}
              title={t('noLowStockItems')}
              description={t('allProductsWellStocked')}
              size="sm"
            />
          }
        >
          {lowStockItems?.map((item) => (
            <DashboardListItem
              key={item.id}
              statusDot={getStockDot(item.currentStock, item.lowStockThreshold)}
              primary={item.name}
              secondary={item.sku}
              rightPrimary={
                <span className={item.currentStock < item.lowStockThreshold * 0.5 ? 'text-destructive' : 'text-warning'}>
                  {item.currentStock} {item.unit}
                </span>
              }
              rightSecondary={`${t('threshold')} ${item.lowStockThreshold}`}
              onClick={() => router.push(`/inventory?productId=${item.id}`)}
            />
          ))}
        </DashboardDataCard>

        {/* Expiring Inventory */}
        <DashboardDataCard
          title={t('dashboard.expiringInventory.title')}
          badge={expiringStock?.batches.length || 0}
          viewAllHref="/inventory?expiryFilter=alert"
          viewAllLabel={t('dashboard.viewAll')}
          isLoading={expiringStockLoading}
          isEmpty={!expiringStock || expiringStock.batches.length === 0}
          emptyState={
            <EmptyState
              icon={AlertTriangle}
              title={t('dashboard.expiringInventory.noItems')}
              description={t('dashboard.expiringInventory.allGood')}
              size="sm"
            />
          }
        >
          {expiringStock?.batches.map((batch) => (
            <DashboardListItem
              key={batch.id}
              statusDot={batch.isExpired ? 'expired' : 'expiring'}
              primary={
                <span className="flex items-center gap-1.5">
                  {batch.productName}
                  <StatusBadge
                    status={batch.isExpired ? 'expired' : 'expiring_soon'}
                    showIcon={false}
                    size="xs"
                  />
                </span>
              }
              secondary={`${batch.productSku} • ${batch.productCategory}`}
              rightPrimary={
                <span className={batch.isExpired ? 'text-destructive' : 'text-warning'}>
                  {batch.quantityRemaining} {batch.productUnit}
                </span>
              }
              rightSecondary={
                batch.isExpired
                  ? t('dashboard.expiringInventory.expiredDays', { days: Math.abs(batch.daysUntilExpiry) })
                  : t('dashboard.expiringInventory.expiresIn', { days: batch.daysUntilExpiry })
              }
              onClick={() => router.push(`/inventory?productId=${batch.productId}`)}
            />
          ))}
        </DashboardDataCard>
      </div>
    </div>
  );
}
