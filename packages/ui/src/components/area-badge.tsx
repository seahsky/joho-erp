'use client';

import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';

// Support both legacy string and new Area object
export type AreaInput = string | {
  name: string;
  displayName: string;
  colorVariant: string;
};

export interface AreaBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Geographic area - can be legacy string or Area object */
  area: AreaInput;
}

// Legacy color mapping for backward compatibility
const legacyColorMap: Record<string, BadgeProps['variant']> = {
  north: 'info',
  south: 'success',
  east: 'warning',
  west: 'default',
};

/**
 * Displays geographic area with color coding
 * Supports both legacy area strings and new Area objects
 *
 * Legacy strings (north, south, east, west) use hardcoded color mapping
 * Area objects use the colorVariant property directly
 */
export function AreaBadge({ area, className, ...props }: AreaBadgeProps) {
  const t = useTranslations('areaTags');

  // Handle new Area object format
  if (typeof area === 'object' && area !== null) {
    return (
      <Badge
        variant={area.colorVariant as BadgeProps['variant']}
        className={cn(className)}
        {...props}
      >
        {area.displayName}
      </Badge>
    );
  }

  // Handle legacy string format
  const normalizedArea = area.toLowerCase();
  const variant = legacyColorMap[normalizedArea] || 'secondary';

  return (
    <Badge variant={variant} className={cn(className)} {...props}>
      {t(normalizedArea)}
    </Badge>
  );
}

AreaBadge.displayName = 'AreaBadge';
