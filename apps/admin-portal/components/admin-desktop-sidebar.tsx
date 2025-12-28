'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DesktopSidebar,
  SidebarItem,
  SidebarSection,
} from '@joho-erp/ui';
import { Settings } from 'lucide-react';
import { ADMIN_NAV_ITEMS } from '@/config/navigation';
import { usePermission } from './permission-provider';

interface AdminDesktopSidebarProps {
  locale: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminDesktopSidebar({ locale, onCollapsedChange }: AdminDesktopSidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { hasPermission } = usePermission();

  const navigationItems = ADMIN_NAV_ITEMS
    .filter((item) => hasPermission(item.permission))
    .map((item) => ({
      ...item,
      label: t(item.labelKey),
      href: `/${locale}${item.path}`,
    }));

  const canViewSettings = hasPermission('settings:view');

  return (
    <DesktopSidebar topOffset="top-16" onCollapsedChange={onCollapsedChange}>
      {(collapsed) => (
        <>
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
          {canViewSettings && (
            <SidebarSection title={collapsed ? undefined : t('settingsSection')} collapsed={collapsed}>
              <Link href={`/${locale}/settings`}>
                <SidebarItem
                  icon={Settings}
                  label={t('settings')}
                  active={pathname.startsWith(`/${locale}/settings`)}
                  collapsed={collapsed}
                />
              </Link>
            </SidebarSection>
          )}
        </>
      )}
    </DesktopSidebar>
  );
}
