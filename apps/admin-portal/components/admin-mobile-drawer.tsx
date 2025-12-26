'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MobileDrawer, DrawerItem, DrawerSection } from '@joho-erp/ui';
import { Settings, User, Moon, Globe, LogOut } from 'lucide-react';
import { UserButton, useClerk } from '@clerk/nextjs';
import { formatUserName } from '@joho-erp/shared';
import type { SerializableUser } from '@/types/user';
import { ADMIN_NAV_ITEMS } from '@/config/navigation';

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  locale: string;
  user?: SerializableUser;
}

export function AdminMobileDrawer({ open, onClose, locale, user }: AdminMobileDrawerProps) {
  const t = useTranslations('navigation');
  const tSettings = useTranslations('settings.dropdown');
  const tCommon = useTranslations('common');
  const tMobileDrawer = useTranslations('mobileDrawer');
  const pathname = usePathname();
  const { signOut } = useClerk();

  const navigationItems = ADMIN_NAV_ITEMS.map((item) => ({
    ...item,
    label: t(item.labelKey),
    href: `/${locale}${item.path}`,
  }));

  const handleNavigate = () => {
    onClose();
  };

  const handleSignOut = async () => {
    await signOut({ redirectUrl: `/${locale}` });
    onClose();
  };

  return (
    <MobileDrawer
      open={open}
      onClose={onClose}
      title={tMobileDrawer('title')}
      closeAriaLabel={tMobileDrawer('closeAriaLabel')}
    >
      {/* User Info */}
      <div className="flex items-center gap-3 p-4 border-b mb-4">
        <UserButton />
        <div className="flex-1">
          <p className="font-semibold">{formatUserName(user ?? null)}</p>
          <p className="text-sm text-muted-foreground">
            {user?.emailAddress || tCommon('noEmail')}
          </p>
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
      <DrawerSection title={tSettings('title')}>
        <DrawerItem icon={Settings} label={t('settings')} onClick={onClose} />
        <DrawerItem icon={User} label={tSettings('profile')} onClick={onClose} />
        <DrawerItem
          icon={Moon}
          label={tSettings('darkMode')}
          onClick={() => {
            // TODO: Implement dark mode toggle
            onClose();
          }}
        />
        <DrawerItem
          icon={Globe}
          label={tSettings('language')}
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
          label={tCommon('signOut')}
          onClick={handleSignOut}
        />
      </div>
    </MobileDrawer>
  );
}
