'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MobileDrawer, DrawerItem, DrawerSection } from '@jimmy-beef/ui';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Settings,
  User,
  Moon,
  Globe,
  LogOut,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function AdminMobileDrawer({ open, onClose, locale }: AdminMobileDrawerProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  const navigationItems = [
    {
      label: t('dashboard'),
      icon: LayoutDashboard,
      href: `/${locale}/dashboard`,
    },
    {
      label: t('customers'),
      icon: Users,
      href: `/${locale}/customers`,
    },
    {
      label: t('deliveries'),
      icon: Truck,
      href: `/${locale}/deliveries`,
    },
    {
      label: t('products'),
      icon: Package,
      href: `/${locale}/products`,
    },
  ];

  const handleNavigate = () => {
    onClose();
  };

  return (
    <MobileDrawer open={open} onClose={onClose}>
      {/* User Info */}
      <div className="flex items-center gap-3 p-4 border-b mb-4">
        <UserButton />
        <div className="flex-1">
          <p className="font-semibold">Admin User</p>
          <p className="text-sm text-muted-foreground">admin@jimmybeef.com</p>
        </div>
      </div>

      {/* Primary Navigation */}
      <DrawerSection>
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={handleNavigate}>
            <DrawerItem
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          </Link>
        ))}
      </DrawerSection>

      {/* Settings */}
      <DrawerSection title="Settings">
        <DrawerItem icon={Settings} label="Settings" onClick={onClose} />
        <DrawerItem icon={User} label="Profile" onClick={onClose} />
        <DrawerItem
          icon={Moon}
          label="Dark Mode"
          onClick={() => {
            // TODO: Implement dark mode toggle
            onClose();
          }}
        />
        <DrawerItem
          icon={Globe}
          label="Language"
          onClick={() => {
            // Language switcher
            onClose();
          }}
        />
      </DrawerSection>

      {/* Sign Out */}
      <div className="mt-auto pt-4 border-t">
        <DrawerItem
          icon={LogOut}
          label="Sign Out"
          onClick={() => {
            // TODO: Implement sign out
            onClose();
          }}
        />
      </div>
    </MobileDrawer>
  );
}
