'use client';

import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';

export interface DaysOnHandBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Days of inventory on hand, null if no sales data */
  days: number | null;
}

/**
 * Displays days of inventory on hand with color-coded severity
 * - Red (destructive): 7 days or less (fast moving/low stock)
 * - Gray (secondary): 8-30 days (moderate)
 * - Outline: Over 30 days (slow moving)
 * - Outline: No sales data (null)
 */
export function DaysOnHandBadge({ days, className, ...props }: DaysOnHandBadgeProps) {
  const t = useTranslations('inventory.stats.turnover');

  if (days === null) {
    return (
      <Badge variant="outline" className={cn('tabular-nums', className)} {...props}>
        {t('noSales')}
      </Badge>
    );
  }

  const getVariant = (): BadgeProps['variant'] => {
    if (days <= 7) return 'destructive';
    if (days <= 30) return 'secondary';
    return 'outline';
  };

  const roundedDays = Math.round(days);

  return (
    <Badge variant={getVariant()} className={cn('tabular-nums', className)} {...props}>
      {roundedDays} {t('days')}
    </Badge>
  );
}

DaysOnHandBadge.displayName = 'DaysOnHandBadge';
