'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../button';

export interface DesktopSidebarProps {
  children: React.ReactNode | ((collapsed: boolean) => React.ReactNode);
  className?: string;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function DesktopSidebar({
  children,
  className,
  defaultCollapsed = false,
  onCollapsedChange,
}: DesktopSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(() => {
    // Try to get from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored ? JSON.parse(stored) : defaultCollapsed;
    }
    return defaultCollapsed;
  });

  React.useEffect(() => {
    // Save to localStorage whenever collapsed state changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    }
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-30',
        'bg-background border-r border-border',
        'transition-all duration-300 ease-in-out',
        'flex flex-col',
        collapsed ? 'w-20' : 'w-[280px]',
        className
      )}
      data-collapsed={collapsed}
    >
      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto">
        {typeof children === 'function' ? children(collapsed) : children}
      </div>

      {/* Collapse Toggle Button */}
      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="w-full"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  );
}

DesktopSidebar.displayName = 'DesktopSidebar';

export interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10',
        'bg-background border-b border-border',
        'p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

SidebarHeader.displayName = 'SidebarHeader';

export interface SidebarItemProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  collapsed?: boolean;
  className?: string;
}

export function SidebarItem({
  icon: Icon,
  label,
  onClick,
  href,
  active,
  collapsed,
  className,
}: SidebarItemProps) {
  const content = (
    <>
      {Icon && (
        <div className={cn('flex items-center justify-center', collapsed ? 'w-full' : 'mr-3')}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
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
    collapsed && 'justify-center px-2',
    className
  );

  if (href) {
    return (
      <a href={href} className={baseClassName} title={collapsed ? label : undefined}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseClassName} title={collapsed ? label : undefined}>
      {content}
    </button>
  );
}

SidebarItem.displayName = 'SidebarItem';

export interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}

export function SidebarSection({ title, children, collapsed, className }: SidebarSectionProps) {
  return (
    <div className={cn('mb-4', className)}>
      {title && !collapsed && (
        <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1 px-2">{children}</div>
    </div>
  );
}

SidebarSection.displayName = 'SidebarSection';
