'use client';

import * as React from 'react';
import { Home, Package, ShoppingCart, User, ShoppingBag } from 'lucide-react';
import { Badge, cn } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/trpc/client';
import { MiniCartSheet, CartButtonStyles } from './mini-cart';

export function CustomerBottomNav({ locale }: { locale: string }) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { data: cart } = api.cart.getCart.useQuery();
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const prevCountRef = React.useRef(0);

  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  // Trigger animation when item count increases
  React.useEffect(() => {
    if (cartItemCount > prevCountRef.current && prevCountRef.current > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = cartItemCount;
  }, [cartItemCount]);

  const isActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      <CartButtonStyles />

      {/* Custom bottom navigation with cart button */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 shadow-lg md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <Link
            href={`/${locale}`}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200',
              isActive(`/${locale}`)
                ? 'text-primary scale-105 font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">{t('home')}</span>
          </Link>

          {/* Products */}
          <Link
            href={`/${locale}/products`}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200',
              isActive(`/${locale}/products`)
                ? 'text-primary scale-105 font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <Package className="h-6 w-6" />
            <span className="text-xs mt-1">{t('products')}</span>
          </Link>

          {/* Cart - Opens bottom sheet */}
          <button
            onClick={() => setIsCartOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200',
              'text-neutral-500 hover:text-primary active:scale-95'
            )}
          >
            <div className={cn(
              'relative',
              isAnimating && 'animate-cart-bounce'
            )}>
              <ShoppingBag className="h-6 w-6" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    'absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center px-1 text-[10px]',
                    isAnimating && 'animate-badge-pop'
                  )}
                >
                  {cartItemCount}
                </Badge>
              )}
            </div>
            <span className="text-xs mt-1">{t('cart')}</span>
          </button>

          {/* Orders */}
          <Link
            href={`/${locale}/orders`}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200',
              isActive(`/${locale}/orders`)
                ? 'text-primary scale-105 font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="text-xs mt-1">{t('myOrders')}</span>
          </Link>

          {/* Profile */}
          <Link
            href={`/${locale}/profile`}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200',
              isActive(`/${locale}/profile`)
                ? 'text-primary scale-105 font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">{t('profile')}</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for bottom nav including safe area */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />

      {/* Mini Cart Bottom Sheet */}
      <MiniCartSheet
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        locale={locale}
      />
    </>
  );
}
