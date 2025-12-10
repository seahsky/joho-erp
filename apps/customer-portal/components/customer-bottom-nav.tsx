'use client';

import { Home, Package, ShoppingCart, User, ShoppingBag } from 'lucide-react';
import { BottomNavigation, type BottomNavItem } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

export function CustomerBottomNav({ locale }: { locale: string }) {
  const t = useTranslations('navigation');
  const { data: cart } = api.cart.getCart.useQuery();

  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

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
      label: t('cart'),
      icon: ShoppingBag,
      href: `/${locale}/cart`,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
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
