'use client';

import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';

// Area object structure
export interface AreaInput {
  id?: string;
  name: string;
  displayName: string;
  colorVariant: string;
}

export interface AreaBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Area object with display properties, or simple string name for backwards compatibility */
  area: AreaInput | string | null | undefined;
}

/**
 * Displays geographic area with color coding
 * Uses the colorVariant property from the Area object
 */
export function AreaBadge({ area, className, ...props }: AreaBadgeProps) {
  if (!area) {
    return (
      <Badge variant="secondary" className={cn(className)} {...props}>
        Unassigned
      </Badge>
    );
  }

  // Handle simple string case (just the area name)
  if (typeof area === 'string') {
    return (
      <Badge variant="secondary" className={cn('capitalize', className)} {...props}>
        {area}
      </Badge>
    );
  }

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

AreaBadge.displayName = 'AreaBadge';
