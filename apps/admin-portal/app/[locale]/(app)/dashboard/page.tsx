'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import {
  FinancialOverviewBar,
  AttentionStrip,
  OrderStatusCards,
  InventoryHealthCard,
  RecentOrdersStrip,
  RevenueTrendModal,
  type Period,
} from '@/components/dashboard';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const [period, setPeriod] = useState<Period>('today');
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  // Fetch all dashboard data
  const { data: financialData, isLoading: financialLoading } =
    api.dashboard.getFinancialOverview.useQuery({ period });
  const { data: statusCounts, isLoading: statusLoading } =
    api.dashboard.getOrderStatusCounts.useQuery();
  const { data: inventoryHealth, isLoading: healthLoading } =
    api.dashboard.getInventoryHealth.useQuery();
  const { data: trendData, isLoading: trendLoading } =
    api.dashboard.getRevenueTrend.useQuery({ days: 7 });
  const { data: recentOrders, isLoading: ordersLoading } =
    api.dashboard.getRecentOrders.useQuery({ limit: 5 });
  const { data: pendingBackorders } = api.order.getPendingBackorders.useQuery({});
  const { data: expiringStock } = api.dashboard.getExpiringStock.useQuery();

  const isLoading = financialLoading || statusLoading || healthLoading || trendLoading || ordersLoading;

  // Prepare attention items
  const attentionItems = [
    {
      label: t('needsAttention.pendingApproval', { count: statusCounts?.pending || 0 }),
      count: statusCounts?.pending || 0,
      href: '/orders?status=pending',
      icon: 'pending' as const,
      urgency: (statusCounts?.pending || 0) > 5 ? 'critical' as const : 'warning' as const,
    },
    {
      label: t('needsAttention.backorders', { count: pendingBackorders?.items.length || 0 }),
      count: pendingBackorders?.items.length || 0,
      href: '/orders?backorderFilter=pending',
      icon: 'backorder' as const,
      urgency: 'warning' as const,
    },
    {
      label: t('needsAttention.expiringSoon', { count: expiringStock?.summary.totalCount || 0 }),
      count: expiringStock?.summary.totalCount || 0,
      href: '/inventory?expiryFilter=alert',
      icon: 'expiring' as const,
      urgency: (expiringStock?.summary.expiredCount || 0) > 0 ? 'critical' as const : 'warning' as const,
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Financial Overview Bar */}
      <section className="dashboard-section-financial">
        <FinancialOverviewBar
          revenue={financialData?.revenue || 0}
          previousRevenue={financialData?.previousRevenue || 0}
          percentChange={financialData?.percentChange || 0}
          pendingPayments={financialData?.pendingPayments || 0}
          pendingPaymentsCount={financialData?.pendingPaymentsCount || 0}
          period={period}
          onPeriodChange={setPeriod}
          trendData={trendData}
          onTrendClick={() => setIsChartModalOpen(true)}
          isLoading={financialLoading || trendLoading}
        />
      </section>

      {/* Attention Strip */}
      <section className="dashboard-section-attention">
        <AttentionStrip items={attentionItems} isLoading={isLoading} />
      </section>

      {/* Main Content Grid */}
      <section className="dashboard-section-main">
        <div className="dashboard-main-grid">
          {/* Order Status Cards */}
          <div className="dashboard-orders-column">
            <OrderStatusCards
              pending={statusCounts?.pending || 0}
              ready={statusCounts?.ready || 0}
              delivering={statusCounts?.delivering || 0}
              completed={statusCounts?.completed || 0}
              isLoading={statusLoading}
            />
          </div>

          {/* Inventory Health */}
          <div className="dashboard-inventory-column">
            <InventoryHealthCard
              healthPercentage={inventoryHealth?.healthPercentage || 0}
              lowStockCount={inventoryHealth?.lowStockCount || 0}
              expiringCount={inventoryHealth?.expiringCount || 0}
              outOfStockCount={inventoryHealth?.outOfStockCount || 0}
              isLoading={healthLoading}
            />
          </div>
        </div>
      </section>

      {/* Recent Orders Strip */}
      <section className="dashboard-section-recent">
        <RecentOrdersStrip
          orders={recentOrders || []}
          isLoading={ordersLoading}
        />
      </section>

      {/* Revenue Trend Modal */}
      <RevenueTrendModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
      />
    </div>
  );
}
