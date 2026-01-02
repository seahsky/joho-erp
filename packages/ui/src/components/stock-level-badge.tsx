'use client';

import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';

export interface StockLevelBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Current stock quantity */
  currentStock: number;
  /** Optional threshold below which stock is considered low */
  lowStockThreshold?: number;
}

/**
 * Displays stock level with color-coded severity
 * - Red (destructive): Out of stock (0)
 * - Yellow (warning): Low stock (below threshold)
 * - Green (success): Normal stock
 */
export function StockLevelBadge({
  currentStock,
  lowStockThreshold,
  className,
  ...props
}: StockLevelBadgeProps) {
  const getVariant = (): BadgeProps['variant'] => {
    if (currentStock === 0) return 'destructive';
    if (lowStockThreshold && currentStock <= lowStockThreshold) return 'warning';
    return 'success';
  };

  return (
    <Badge variant={getVariant()} className={cn('tabular-nums', className)} {...props}>
      {currentStock}
    </Badge>
  );
}

StockLevelBadge.displayName = 'StockLevelBadge';
