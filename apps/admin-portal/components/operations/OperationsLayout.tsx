'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button, cn } from '@joho-erp/ui';
import type { LucideIcon } from 'lucide-react';

export interface OperationsLayoutProps {
  sidebar: ReactNode;
  sidebarTitle: string;
  sidebarIcon?: LucideIcon;
  sidebarDescription?: string;
  main: ReactNode;
  mainTitle: string;
  mainIcon?: LucideIcon;
  mainDescription?: string;
  /** Optional key to auto-switch to main panel on mobile (e.g., focused order ID) */
  focusKey?: string | null;
  className?: string;
}

type TabType = 'sidebar' | 'main';

export function OperationsLayout({
  sidebar,
  sidebarTitle,
  sidebarIcon: SidebarIcon,
  sidebarDescription,
  main,
  mainTitle,
  mainIcon: MainIcon,
  mainDescription,
  focusKey,
  className,
}: OperationsLayoutProps) {
  const t = useTranslations('common');
  const [activeTab, setActiveTab] = useState<TabType>('sidebar');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Switch to main tab when focusKey changes (mobile behavior)
  useEffect(() => {
    if (focusKey && activeTab !== 'main') {
      setActiveTab('main');
    }
  }, [focusKey, activeTab]);

  return (
    <>
      {/* Mobile: Tabbed Layout */}
      <div className={cn('lg:hidden space-y-4', className)}>
        {/* Tab Navigation */}
        <div className="flex gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('sidebar')}
            className={cn(
              'flex-1 py-4 px-6 font-semibold text-sm transition-all relative',
              activeTab === 'sidebar'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              {SidebarIcon && <SidebarIcon className="h-5 w-5" />}
              <span>{sidebarTitle}</span>
            </div>
            {activeTab === 'sidebar' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
            )}
            {sidebarDescription && (
              <div className="text-xs mt-1 tabular-nums text-muted-foreground">
                {sidebarDescription}
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={cn(
              'flex-1 py-4 px-6 font-semibold text-sm transition-all relative',
              activeTab === 'main'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              {MainIcon && <MainIcon className="h-5 w-5" />}
              <span>{mainTitle}</span>
            </div>
            {activeTab === 'main' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
            )}
            {mainDescription && (
              <div className="text-xs mt-1 tabular-nums text-muted-foreground">
                {mainDescription}
              </div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'sidebar' ? sidebar : main}
        </div>
      </div>

      {/* Desktop: Side-by-Side Layout */}
      <div
        className={cn(
          'hidden lg:grid gap-6 transition-all duration-300',
          isCollapsed ? 'lg:grid-cols-[52px_1fr]' : 'lg:grid-cols-[380px_1fr]',
          className
        )}
      >
        {/* Sidebar Panel - Fixed Width */}
        <div className="space-y-4">
          <div className="sticky top-4">
            <Card>
              <CardHeader
                className={cn(
                  'flex flex-row items-center space-y-0',
                  isCollapsed ? 'justify-center p-3' : 'justify-between'
                )}
              >
                <div
                  className={cn(
                    'transition-opacity duration-200',
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  )}
                >
                  <CardTitle className="flex items-center gap-2">
                    {SidebarIcon && <SidebarIcon className="h-5 w-5" />}
                    {sidebarTitle}
                  </CardTitle>
                  {sidebarDescription && (
                    <CardDescription className="tabular-nums mt-1.5">
                      {sidebarDescription}
                    </CardDescription>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="shrink-0"
                  title={isCollapsed ? t('operations.expand') : t('operations.collapse')}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </Button>
              </CardHeader>
            </Card>
            <div
              className={cn(
                'transition-all duration-300 overflow-hidden',
                isCollapsed
                  ? 'max-h-0 opacity-0'
                  : 'max-h-[calc(100vh-200px)] opacity-100 overflow-y-auto'
              )}
            >
              {sidebar}
            </div>
          </div>
        </div>

        {/* Main Panel - Flexible Width */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {MainIcon && <MainIcon className="h-5 w-5" />}
                {mainTitle}
              </CardTitle>
              {mainDescription && (
                <CardDescription className="tabular-nums">
                  {mainDescription}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
          <div>{main}</div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
