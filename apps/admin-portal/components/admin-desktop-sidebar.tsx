'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DesktopSidebar,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from '@jimmy-beef/ui';
import { Bell, Settings } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@jimmy-beef/ui';
import { formatUserName } from '@jimmy-beef/shared';
import type { SerializableUser } from '@/types/user';
import { ADMIN_NAV_ITEMS } from '@/config/navigation';

interface AdminDesktopSidebarProps {
  locale: string;
  onCollapsedChange?: (collapsed: boolean) => void;
  user?: SerializableUser;
}

export function AdminDesktopSidebar({ locale, onCollapsedChange, user }: AdminDesktopSidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  const navigationItems = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    label: t(item.labelKey),
    href: `/${locale}${item.path}`,
  }));

  return (
    <DesktopSidebar onCollapsedChange={onCollapsedChange}>
      {(collapsed) => (
        <>
          {/* Header with Logo */}
          <SidebarHeader>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">J</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Jimmy Beef</span>
                  <span className="text-xs text-muted-foreground">Admin Portal</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">J</span>
                </div>
              </div>
            )}
          </SidebarHeader>

          {/* Navigation Items */}
          <SidebarSection collapsed={collapsed}>
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <SidebarItem
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  collapsed={collapsed}
                />
              </Link>
            ))}
          </SidebarSection>

          {/* Settings Section */}
          <SidebarSection title={collapsed ? undefined : 'Settings'} collapsed={collapsed}>
            <SidebarItem
              icon={Settings}
              label="Settings"
              onClick={() => {
                // TODO: Implement settings
              }}
              collapsed={collapsed}
            />
          </SidebarSection>

          {/* User Section at Bottom */}
          <div className="mt-auto border-t border-border p-4">
            <div className={collapsed ? 'flex justify-center' : 'flex items-center gap-3'}>
              {!collapsed ? (
                <>
                  <UserButton />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{formatUserName(user ?? null)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.emailAddress || 'No email'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <UserButton />
              )}
            </div>
          </div>
        </>
      )}
    </DesktopSidebar>
  );
}
