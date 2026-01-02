'use client';

import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';

export type AreaType = 'north' | 'south' | 'east' | 'west';

export interface AreaBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Geographic area identifier */
  area: AreaType | string;
}

const areaConfig: Record<string, BadgeProps['variant']> = {
  north: 'info',
  south: 'success',
  east: 'warning',
  west: 'default',
};

/**
 * Displays geographic area with color coding
 * - North: Blue (info)
 * - South: Green (success)
 * - East: Yellow (warning)
 * - West: Gray (default)
 */
export function AreaBadge({ area, className, ...props }: AreaBadgeProps) {
  const t = useTranslations('areaTags');
  const normalizedArea = area.toLowerCase();
  const variant = areaConfig[normalizedArea] || 'secondary';

  return (
    <Badge variant={variant} className={cn(className)} {...props}>
      {t(normalizedArea)}
    </Badge>
  );
}

AreaBadge.displayName = 'AreaBadge';
