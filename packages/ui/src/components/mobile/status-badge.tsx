'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '../../lib/utils';
import { Badge, type BadgeProps } from '../badge';
import { CheckCircle2, Clock, Package, XCircle, AlertTriangle, Truck } from 'lucide-react';

export type StatusType =
  | 'awaiting_approval' // For backorders requiring admin approval
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'pending' // For other uses (credit applications, invitations, etc.)
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
    variant: BadgeProps['variant'];
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  awaiting_approval: {
    variant: 'warning',
    icon: Clock,
  },
  confirmed: {
    variant: 'info',
    icon: CheckCircle2,
  },
  packing: {
    variant: 'violet',
    icon: Package,
  },
  delivered: {
    variant: 'success',
    icon: CheckCircle2,
  },
  cancelled: {
    variant: 'destructive',
    icon: XCircle,
  },
  pending: {
    variant: 'warning',
    icon: Clock,
  },
  approved: {
    variant: 'success',
    icon: CheckCircle2,
  },
  rejected: {
    variant: 'destructive',
    icon: XCircle,
  },
  active: {
    variant: 'success',
    icon: CheckCircle2,
  },
  inactive: {
    variant: 'secondary',
    icon: XCircle,
  },
  ready_for_delivery: {
    variant: 'teal',
    icon: Truck,
  },
  suspended: {
    variant: 'warning',
    icon: XCircle,
  },
  closed: {
    variant: 'secondary',
    icon: XCircle,
  },
  discontinued: {
    variant: 'secondary',
    icon: XCircle,
  },
  out_of_stock: {
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
  const t = useTranslations('statusBadges');
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
      <span>{t(status)}</span>
    </Badge>
  );
}

StatusBadge.displayName = 'StatusBadge';
