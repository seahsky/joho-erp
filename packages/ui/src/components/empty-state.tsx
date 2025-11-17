'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className || ''}`}>
      {/* Subtle icon background with blur effect */}
      <div className="relative mb-6">
        <div className="empty-state-icon-bg" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border/50 bg-card">
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </div>

      {/* Clear messaging */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}

      {/* Optional action button */}
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="btn-enhanced"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
