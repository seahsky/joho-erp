'use client';

import { useRouter } from 'next/navigation';
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

  const cards = [
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      color: 'warning',
      href: '/orders?status=pending',
      description: 'Awaiting approval or confirmation',
    },
    {
      label: 'Ready',
      value: ready,
      icon: PackageCheck,
      color: 'info',
      href: '/orders?status=ready',
      description: 'Packed and ready for delivery',
    },
    {
      label: 'Delivering',
      value: delivering,
      icon: Truck,
      color: 'primary',
      href: '/orders?status=delivering',
      description: 'Out for delivery',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      color: 'success',
      href: '/orders?status=delivered',
      description: 'Successfully delivered',
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
        <span className="order-status-title">Order Status</span>
        <Link href="/orders" className="order-status-view-all">
          View All <ArrowRight className="h-3 w-3" />
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
      {/* Flow indicator */}
      <div className="order-status-flow">
        <div className="order-status-flow-line" />
        <div className="order-status-flow-labels">
          <span>New</span>
          <span>→</span>
          <span>In Progress</span>
          <span>→</span>
          <span>Complete</span>
        </div>
      </div>
    </div>
  );
}
