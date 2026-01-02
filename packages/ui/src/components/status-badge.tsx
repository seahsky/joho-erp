'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';
import {
  CheckCircle2,
  Clock,
  Package,
  XCircle,
  AlertTriangle,
  Truck,
  Mail,
  Ban,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Settings,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';

export type StatusType =
  // Order lifecycle
  | 'awaiting_approval'
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  // Generic approval/status
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'closed'
  // Product status
  | 'discontinued'
  | 'out_of_stock'
  // User status
  | 'invited'
  | 'banned'
  // Sync/Job status
  | 'completed'
  | 'failed'
  | 'processing'
  // Audit action types
  | 'create'
  | 'update'
  | 'delete'
  // Inventory transaction types
  | 'sale'
  | 'adjustment'
  | 'return'
  // Pricing status
  | 'expired'
  | 'expiring_soon';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
  showIcon?: boolean;
}

interface StatusConfig {
  variant: BadgeProps['variant'];
  icon: React.ComponentType<{ className?: string }>;
  animated?: boolean;
}

const statusConfig: Record<StatusType, StatusConfig> = {
  // Order lifecycle
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
  ready_for_delivery: {
    variant: 'teal',
    icon: Truck,
  },
  out_for_delivery: {
    variant: 'info',
    icon: Truck,
  },
  delivered: {
    variant: 'success',
    icon: CheckCircle2,
  },
  cancelled: {
    variant: 'destructive',
    icon: XCircle,
  },
  // Generic approval/status
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
  suspended: {
    variant: 'warning',
    icon: XCircle,
  },
  closed: {
    variant: 'secondary',
    icon: XCircle,
  },
  // Product status
  discontinued: {
    variant: 'secondary',
    icon: XCircle,
  },
  out_of_stock: {
    variant: 'destructive',
    icon: AlertTriangle,
  },
  // User status
  invited: {
    variant: 'secondary',
    icon: Mail,
  },
  banned: {
    variant: 'destructive',
    icon: Ban,
  },
  // Sync/Job status
  completed: {
    variant: 'success',
    icon: CheckCircle2,
  },
  failed: {
    variant: 'destructive',
    icon: XCircle,
  },
  processing: {
    variant: 'info',
    icon: Loader2,
    animated: true,
  },
  // Audit action types
  create: {
    variant: 'success',
    icon: Plus,
  },
  update: {
    variant: 'default',
    icon: Pencil,
  },
  delete: {
    variant: 'destructive',
    icon: Trash2,
  },
  // Inventory transaction types
  sale: {
    variant: 'default',
    icon: ShoppingCart,
  },
  adjustment: {
    variant: 'secondary',
    icon: Settings,
  },
  return: {
    variant: 'outline',
    icon: RotateCcw,
  },
  // Pricing status
  expired: {
    variant: 'secondary',
    icon: Clock,
  },
  expiring_soon: {
    variant: 'warning',
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
  const isAnimated = config.animated === true;

  return (
    <Badge
      variant={config.variant}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {showIcon && <Icon className={cn('h-3 w-3', isAnimated && 'animate-spin')} />}
      <span>{t(status)}</span>
    </Badge>
  );
}

StatusBadge.displayName = 'StatusBadge';
