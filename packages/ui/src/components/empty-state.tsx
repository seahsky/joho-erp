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
  size?: 'default' | 'sm';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'default',
}: EmptyStateProps) {
  const isSmall = size === 'sm';

  return (
    <div className={`flex flex-col items-center justify-center ${isSmall ? 'py-6 px-2' : 'py-12 px-4'} text-center ${className || ''}`}>
      {/* Subtle icon background with blur effect */}
      <div className={`relative ${isSmall ? 'mb-3' : 'mb-6'}`}>
        {!isSmall && <div className="empty-state-icon-bg" />}
        <div className={`relative flex items-center justify-center rounded-full border border-border/50 bg-card ${isSmall ? 'h-10 w-10' : 'h-16 w-16'}`}>
          <Icon className={`text-muted-foreground/50 ${isSmall ? 'h-5 w-5' : 'h-8 w-8'}`} />
        </div>
      </div>

      {/* Clear messaging */}
      <h3 className={`font-semibold text-foreground ${isSmall ? 'text-sm mb-1' : 'text-lg mb-2'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-muted-foreground max-w-sm ${isSmall ? 'text-xs mb-3' : 'text-sm mb-6'}`}>
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
