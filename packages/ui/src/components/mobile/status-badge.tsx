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
    className?: string;
  }
> = {
  confirmed: {
    label: 'Confirmed',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  packing: {
    label: 'Packing',
    variant: 'secondary',
    icon: Package,
    className: 'bg-orange-500 text-white hover:bg-orange-600',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    variant: 'default',
    icon: Truck,
    className: 'bg-purple-500 text-white hover:bg-purple-600',
  },
  delivered: {
    label: 'Delivered',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'secondary',
    icon: XCircle,
    className: 'bg-gray-500 text-white hover:bg-gray-600',
  },
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-amber-500 text-white hover:bg-amber-600',
  },
  approved: {
    label: 'Approved',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
  },
  active: {
    label: 'Active',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-green-500 text-white hover:bg-green-600',
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
      className={cn(
        'flex items-center gap-1',
        config.className,
        className
      )}
      {...props}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </Badge>
  );
}

StatusBadge.displayName = 'StatusBadge';
