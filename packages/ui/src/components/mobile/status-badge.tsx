'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge, type BadgeProps } from '../badge';
import { CheckCircle2, Clock, Truck, Package, XCircle } from 'lucide-react';

export type StatusType =
  | 'confirmed'
  | 'packing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'inactive';

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
    variant: 'warning',
    icon: Package,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    variant: 'info',
    icon: Truck,
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
};

export function StatusBadge({
  status,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];
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
