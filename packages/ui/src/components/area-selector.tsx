'use client';

import { cn } from '../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Badge, type BadgeProps } from './badge';

export interface AreaOption {
  id: string;
  name: string;
  displayName: string;
  colorVariant: string;
}

export interface AreaSelectorProps {
  /** Currently selected area ID, or null for unassigned */
  value: string | null;
  /** Callback when area selection changes */
  onChange: (areaId: string | null) => void;
  /** Available areas to select from */
  areas: AreaOption[];
  /** Whether to show "Unassigned" option (default: true) */
  includeUnassigned?: boolean;
  /** Label for unassigned option */
  unassignedLabel?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional class name for the trigger */
  className?: string;
}

/**
 * AreaSelector - A select component for choosing delivery areas
 *
 * Features:
 * - Shows area name with color-coded badge
 * - Optional "Unassigned" option for null values
 * - Uses the same color variants as AreaBadge
 */
export function AreaSelector({
  value,
  onChange,
  areas,
  includeUnassigned = true,
  unassignedLabel = 'Unassigned',
  placeholder = 'Select area',
  disabled = false,
  className,
}: AreaSelectorProps) {
  return (
    <Select
      value={value ?? 'unassigned'}
      onValueChange={(val) => onChange(val === 'unassigned' ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeUnassigned && (
          <SelectItem value="unassigned">
            <span className="text-muted-foreground">{unassignedLabel}</span>
          </SelectItem>
        )}
        {areas.map((area) => (
          <SelectItem key={area.id} value={area.id}>
            <div className="flex items-center gap-2">
              <Badge
                variant={area.colorVariant as BadgeProps['variant']}
                className="text-xs"
              >
                {area.displayName}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

AreaSelector.displayName = 'AreaSelector';
