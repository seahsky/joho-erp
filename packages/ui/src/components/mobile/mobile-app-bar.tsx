'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Menu } from 'lucide-react';

export interface MobileAppBarProps {
  title?: string;
  onMenuClick?: () => void;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
}

export function MobileAppBar({
  title,
  onMenuClick,
  leftAction,
  rightActions,
  className,
}: MobileAppBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'bg-background border-b border-border',
        'h-14 px-4',
        'flex items-center justify-between',
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {leftAction || (
          onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )
        )}
      </div>

      {/* Center section (title) */}
      {title && (
        <div className="flex-1 text-center px-4">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightActions}
      </div>
    </header>
  );
}

MobileAppBar.displayName = 'MobileAppBar';
