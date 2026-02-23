'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Clock, Package, Calendar, UserCheck } from 'lucide-react';
import { Skeleton } from '@joho-erp/ui';

interface AttentionItem {
  label: string;
  count: number;
  href: string;
  icon: 'pending' | 'backorder' | 'expiring' | 'credit';
  urgency: 'warning' | 'critical' | 'info';
}

interface AttentionStripProps {
  items: AttentionItem[];
  isLoading?: boolean;
}

export function AttentionStrip({ items, isLoading }: AttentionStripProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');

  const getIcon = (icon: AttentionItem['icon']) => {
    const icons = {
      pending: Clock,
      backorder: Package,
      expiring: Calendar,
      credit: UserCheck,
    };
    return icons[icon];
  };

  const getUrgencyClass = (urgency: AttentionItem['urgency']) => {
    const classes = {
      warning: 'attention-item-warning',
      critical: 'attention-item-critical',
      info: 'attention-item-info',
    };
    return classes[urgency];
  };

  // Filter out items with zero count
  const activeItems = items.filter((item) => item.count > 0);

  if (isLoading) {
    return (
      <div className="attention-strip animate-pulse">
        <div className="attention-strip-title">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="attention-strip-items">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-48" />
          ))}
        </div>
      </div>
    );
  }

  if (activeItems.length === 0) {
    return (
      <div className="attention-strip attention-strip-clear">
        <div className="attention-strip-title">
          <AlertCircle className="h-4 w-4 text-success" />
          <span>{t('needsAttention.allClear')}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('needsAttention.allClearDescription')}
        </div>
      </div>
    );
  }

  return (
    <div className="attention-strip">
      <div className="attention-strip-title">
        <AlertCircle className="h-4 w-4" />
        <span>{t('needsAttention.title')}</span>
        <span className="attention-strip-count">{activeItems.length}</span>
      </div>
      <div className="attention-strip-items">
        {activeItems.map((item, index) => {
          const Icon = getIcon(item.icon);
          return (
            <button
              key={index}
              className={`attention-item ${getUrgencyClass(item.urgency)}`}
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="attention-item-count">{item.count}</span>
              <span className="attention-item-label">{item.label}</span>
              <span className="attention-item-arrow">→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
