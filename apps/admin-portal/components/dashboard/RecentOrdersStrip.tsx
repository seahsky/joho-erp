'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { StatusBadge, Skeleton, type StatusType } from '@joho-erp/ui';
import { formatAUD } from '@joho-erp/shared';
import { ArrowRight, PackageX } from 'lucide-react';

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  orderedAt: Date;
}

interface RecentOrdersStripProps {
  orders: RecentOrder[];
  isLoading?: boolean;
}

export function RecentOrdersStrip({ orders, isLoading }: RecentOrdersStripProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');

  if (isLoading) {
    return (
      <div className="recent-orders-strip animate-pulse">
        <div className="recent-orders-header">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="recent-orders-list">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="recent-orders-strip recent-orders-empty">
        <div className="recent-orders-header">
          <span className="recent-orders-title">{t('recentOrders')}</span>
        </div>
        <div className="recent-orders-empty-state">
          <PackageX className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('noRecentOrders')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-orders-strip">
      <div className="recent-orders-header">
        <span className="recent-orders-title">{t('recentOrders')}</span>
        <Link href="/orders" className="recent-orders-view-all">
          {t('viewAll')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="recent-orders-list">
        {orders.slice(0, 5).map((order) => (
          <button
            key={order.id}
            className="recent-order-card"
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            <div className="recent-order-header">
              <span className="recent-order-number">{order.orderNumber}</span>
              <span className="recent-order-amount">{formatAUD(order.totalAmount)}</span>
            </div>
            <div className="recent-order-customer">{order.customerName}</div>
            <div className="recent-order-status">
              <StatusBadge status={order.status as StatusType} showIcon={false} size="xs" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
