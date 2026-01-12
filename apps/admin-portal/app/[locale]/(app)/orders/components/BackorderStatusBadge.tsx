'use client';

import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@joho-erp/ui';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { inferBackorderDecision, type BackorderDecision } from '@joho-erp/shared';

export interface BackorderStatusBadgeProps {
  order: {
    stockShortfall?: unknown;
    approvedQuantities?: unknown;
    status: string;
  };
  showIcon?: boolean;
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  Exclude<BackorderDecision, 'none' | 'rejected'>,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
    icon: React.ComponentType<{ className?: string }>;
    labelKey: string;
  }
> = {
  approved: {
    variant: 'success',
    icon: CheckCircle2,
    labelKey: 'approved',
  },
  partial: {
    variant: 'warning',
    icon: AlertTriangle,
    labelKey: 'partial_approved',
  },
};

const variantBackgroundClasses: Record<string, string> = {
  secondary: 'bg-secondary text-secondary-foreground',
  warning: 'bg-warning text-warning-foreground',
  success: 'bg-success text-success-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

/**
 * BackorderStatusBadge - Shows a badge indicating backorder decision history
 *
 * This badge is only shown for orders that:
 * 1. Were backorders (have stockShortfall)
 * 2. Have been approved or partially approved
 * 3. Are not in awaiting_approval or cancelled status
 *
 * For pending backorders, the main status badge shows "Awaiting Approval"
 * For rejected backorders, the main status badge shows "Cancelled"
 */
export function BackorderStatusBadge({
  order,
  showIcon = true,
  compact = false,
  className,
}: BackorderStatusBadgeProps) {
  const t = useTranslations('orders.backorder');

  const decision = inferBackorderDecision(order);

  // Don't show for non-backorders
  if (decision === 'none') {
    return null;
  }

  // Don't show for pending backorders (main status badge shows awaiting_approval)
  if (order.status === 'awaiting_approval') {
    return null;
  }

  // Don't show for rejected backorders (main status badge shows cancelled)
  if (decision === 'rejected') {
    return null;
  }

  // Only show for approved or partial (on active orders as a historical indicator)
  const config = statusConfig[decision];
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
            <span>{t('label')}: {t(config.labelKey)}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${className || ''}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{t(config.labelKey)}</span>
    </Badge>
  );
}

BackorderStatusBadge.displayName = 'BackorderStatusBadge';
