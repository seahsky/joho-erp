'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DesktopSidebar,
  SidebarItem,
  SidebarSection,
} from '@jimmy-beef/ui';
import { Settings } from 'lucide-react';
import { ADMIN_NAV_ITEMS } from '@/config/navigation';

interface AdminDesktopSidebarProps {
  locale: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminDesktopSidebar({ locale, onCollapsedChange }: AdminDesktopSidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  const navigationItems = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    label: t(item.labelKey),
    href: `/${locale}${item.path}`,
  }));

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
        </>
      )}
    </DesktopSidebar>
  );
}
