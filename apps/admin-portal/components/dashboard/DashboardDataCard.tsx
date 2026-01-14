'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Skeleton } from '@joho-erp/ui';

interface DashboardDataCardProps {
  title: string;
  badge?: string | number;
  children: ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  isLoading?: boolean;
  emptyState?: ReactNode;
  isEmpty?: boolean;
}

export function DashboardDataCard({
  title,
  badge,
  children,
  viewAllHref,
  viewAllLabel = 'View All',
  isLoading,
  emptyState,
  isEmpty,
}: DashboardDataCardProps) {
  if (isLoading) {
    return (
      <div className="data-card-compact">
        <div className="data-card-compact-header">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
        <div className="data-card-compact-content scrollbar-slim">
          <div className="space-y-2 p-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-start py-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="data-card-compact-footer">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="data-card-compact">
      <div className="data-card-compact-header">
        <span className="data-card-compact-title">{title}</span>
        {badge !== undefined && (
          <span className="data-card-compact-badge">{badge}</span>
        )}
      </div>
      <div className="data-card-compact-content scrollbar-slim">
        {isEmpty && emptyState ? emptyState : children}
      </div>
      {viewAllHref && (
        <div className="data-card-compact-footer">
          <Link href={viewAllHref}>
            {viewAllLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// Subcomponent for dense list items
interface DashboardListItemProps {
  statusDot?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'delivered' | 'expired' | 'expiring' | 'low' | 'critical';
  primary: ReactNode;
  secondary?: ReactNode;
  rightPrimary?: ReactNode;
  rightSecondary?: ReactNode;
  onClick?: () => void;
}

export function DashboardListItem({
  statusDot,
  primary,
  secondary,
  rightPrimary,
  rightSecondary,
  onClick,
}: DashboardListItemProps) {
  return (
    <div
      className="list-item-dense"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {statusDot && (
          <span className={`status-dot status-dot-${statusDot}`} />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{primary}</div>
          {secondary && (
            <div className="text-xs text-muted-foreground truncate">{secondary}</div>
          )}
        </div>
      </div>
      {(rightPrimary || rightSecondary) && (
        <div className="text-right flex-shrink-0">
          {rightPrimary && (
            <div className="text-sm font-medium">{rightPrimary}</div>
          )}
          {rightSecondary && (
            <div className="text-xs text-muted-foreground">{rightSecondary}</div>
          )}
        </div>
      )}
    </div>
  );
}
