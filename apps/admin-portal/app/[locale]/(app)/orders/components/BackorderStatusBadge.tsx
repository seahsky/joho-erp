'use client';

import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@joho-erp/ui';
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
  compact?: boolean;
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
    variant: 'success',
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

const variantBackgroundClasses: Record<string, string> = {
  secondary: 'bg-secondary text-secondary-foreground',
  warning: 'bg-warning text-warning-foreground',
  success: 'bg-success text-success-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

export function BackorderStatusBadge({
  status,
  showIcon = true,
  compact = false,
  className,
}: BackorderStatusBadgeProps) {
  const t = useTranslations('orders.backorder');

  // Don't show badge for normal orders
  if (status === 'none') {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  // Compact mode: icon-only with tooltip
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center justify-center h-6 w-6 rounded-full cursor-help',
                variantBackgroundClasses[config.variant],
                className
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>{t('label')}: {t(status)}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${className || ''}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{t(status)}</span>
    </Badge>
  );
}

BackorderStatusBadge.displayName = 'BackorderStatusBadge';
