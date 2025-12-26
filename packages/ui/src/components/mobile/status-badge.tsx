'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge, type BadgeProps } from '../badge';
import { CheckCircle2, Clock, Package, XCircle, AlertTriangle } from 'lucide-react';

export type StatusType =
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'closed'
  | 'discontinued'
  | 'out_of_stock';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
  showIcon?: boolean;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    variant: BadgeProps['variant'];
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  confirmed: {
    label: 'Confirmed',
    variant: 'info',
    icon: CheckCircle2,
  },
  packing: {
    label: 'Packing',
    variant: 'info',
    icon: Package,
  },
  delivered: {
    label: 'Delivered',
    variant: 'success',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'secondary',
    icon: XCircle,
  },
  pending: {
    label: 'Pending',
    variant: 'warning',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
  },
  active: {
    label: 'Active',
    variant: 'success',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inactive',
    variant: 'secondary',
    icon: XCircle,
  },
  ready_for_delivery: {
    label: 'Ready for Delivery',
    variant: 'info',
    icon: Package,
  },
  suspended: {
    label: 'Suspended',
    variant: 'warning',
    icon: XCircle,
  },
  closed: {
    label: 'Closed',
    variant: 'secondary',
    icon: XCircle,
  },
  discontinued: {
    label: 'Discontinued',
    variant: 'secondary',
    icon: XCircle,
  },
  out_of_stock: {
    label: 'Out of Stock',
    variant: 'destructive',
    icon: AlertTriangle,
  },
};

export function StatusBadge({
  status,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];

  // Fallback for undefined status
  if (!config) {
    console.warn(`Unknown status: ${status}`);
    return (
      <Badge variant="secondary" className={cn('flex items-center gap-1', className)} {...props}>
        <span>{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </Badge>
  );
}

StatusBadge.displayName = 'StatusBadge';
