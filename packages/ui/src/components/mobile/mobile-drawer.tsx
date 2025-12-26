'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useLockBodyScroll } from '../../hooks';
import { X } from 'lucide-react';
import { Button } from '../button';

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
  /** Title displayed at the top of the drawer - required for i18n */
  title: string;
  /** Aria label for close button - required for accessibility and i18n */
  closeAriaLabel: string;
}

export function MobileDrawer({
  open,
  onClose,
  children,
  side = 'left',
  className,
  title,
  closeAriaLabel,
}: MobileDrawerProps) {
  useLockBodyScroll(open);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-50',
          'w-[280px] max-w-[80vw]',
          'bg-background',
          'shadow-lg',
          'overflow-y-auto',
          'transform transition-transform duration-300 ease-in-out',
          side === 'left' ? 'left-0' : 'right-0',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}

MobileDrawer.displayName = 'MobileDrawer';

export interface DrawerItemProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  className?: string;
}

export function DrawerItem({
  icon: Icon,
  label,
  onClick,
  href,
  active,
  className,
}: DrawerItemProps) {
  const content = (
    <>
      {Icon && <Icon className="h-5 w-5 mr-3" />}
      <span className="flex-1">{label}</span>
    </>
  );

  const baseClassName = cn(
    'flex items-center w-full',
    'px-4 py-3 rounded-lg',
    'text-sm font-medium',
    'transition-colors duration-200',
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
    className
  );

  if (href) {
    return (
      <a href={href} className={baseClassName}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClassName}>
      {content}
    </button>
  );
}

DrawerItem.displayName = 'DrawerItem';

export function DrawerSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      {title && (
        <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

DrawerSection.displayName = 'DrawerSection';
