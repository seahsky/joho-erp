'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CountUp, Skeleton } from '@joho-erp/ui';
import { Clock, PackageCheck, Truck, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface OrderStatusCardsProps {
  pending: number;
  ready: number;
  delivering: number;
  completed: number;
  isLoading?: boolean;
}

export function OrderStatusCards({
  pending,
  ready,
  delivering,
  completed,
  isLoading,
}: OrderStatusCardsProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');

  const cards = [
    {
      label: t('orderStatus.pending'),
      value: pending,
      icon: Clock,
      color: 'warning',
      href: '/orders?status=pending',
      description: t('orderStatus.pendingDescription'),
    },
    {
      label: t('orderStatus.ready'),
      value: ready,
      icon: PackageCheck,
      color: 'info',
      href: '/orders?status=ready',
      description: t('orderStatus.readyDescription'),
    },
    {
      label: t('orderStatus.delivering'),
      value: delivering,
      icon: Truck,
      color: 'primary',
      href: '/orders?status=delivering',
      description: t('orderStatus.deliveringDescription'),
    },
    {
      label: t('orderStatus.completed'),
      value: completed,
      icon: CheckCircle2,
      color: 'success',
      href: '/orders?status=delivered',
      description: t('orderStatus.completedDescription'),
    },
  ];

  if (isLoading) {
    return (
      <div className="order-status-section">
        <div className="order-status-header">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="order-status-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="order-status-card">
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="order-status-section">
      <div className="order-status-header">
        <span className="order-status-title">{t('orderStatus.title')}</span>
        <Link href="/orders" className="order-status-view-all">
          {t('viewAll')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="order-status-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              className={`order-status-card order-status-${card.color}`}
              onClick={() => router.push(card.href)}
            >
              <div className="order-status-card-icon">
                <Icon className="h-5 w-5" />
              </div>
              <div className="order-status-card-value">
                <CountUp end={card.value} duration={0.6} />
              </div>
              <div className="order-status-card-label">{card.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
