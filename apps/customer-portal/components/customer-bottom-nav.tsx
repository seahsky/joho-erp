'use client';

import { Home, Package, ShoppingCart, User } from 'lucide-react';
import { BottomNavigation, type BottomNavItem } from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';

export function CustomerBottomNav({ locale }: { locale: string }) {
  const t = useTranslations('navigation');

  const items: BottomNavItem[] = [
    {
      label: t('home'),
      icon: Home,
      href: `/${locale}`,
    },
    {
      label: t('products'),
      icon: Package,
      href: `/${locale}/products`,
    },
    {
      label: t('myOrders'),
      icon: ShoppingCart,
      href: `/${locale}/orders`,
    },
    {
      label: t('profile'),
      icon: User,
      href: `/${locale}/profile`,
    },
  ];

  return <BottomNavigation items={items} />;
}
