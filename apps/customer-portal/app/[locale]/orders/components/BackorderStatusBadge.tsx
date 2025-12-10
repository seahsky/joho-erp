'use client';

import { Badge } from '@joho-erp/ui';
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type BackorderStatusType =
  | 'none'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'partial_approved';

export interface BackorderStatusBadgeProps {
  status: BackorderStatusType;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  BackorderStatusType,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  none: {
    variant: 'secondary',
    icon: CheckCircle2,
  },
  pending_approval: {
    variant: 'warning',
    icon: Clock,
  },
  approved: {
    variant: 'info',
    icon: CheckCircle2,
  },
  rejected: {
    variant: 'destructive',
    icon: XCircle,
  },
  partial_approved: {
    variant: 'warning',
    icon: AlertTriangle,
  },
};

export function BackorderStatusBadge({
  status,
  showIcon = true,
  className,
}: BackorderStatusBadgeProps) {
  const t = useTranslations('orders.backorder');

  // Don't show badge for normal orders
  if (status === 'none') {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${className || ''}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{t(status)}</span>
    </Badge>
  );
}

BackorderStatusBadge.displayName = 'BackorderStatusBadge';
