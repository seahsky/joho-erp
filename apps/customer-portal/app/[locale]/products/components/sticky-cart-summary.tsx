'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Badge, Muted, Large, cn } from '@joho-erp/ui';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface StickyCartSummaryProps {
  locale: string;
  onCartClick: () => void; // Open mini-cart drawer/sheet
  isHidden?: boolean; // Hide sticky summary when mini-cart is open
}

export function StickyCartSummary({ locale, onCartClick, isHidden = false }: StickyCartSummaryProps) {
  const t = useTranslations('products');
  const tCart = useTranslations('cart');
  const router = useRouter();
  const [animate, setAnimate] = React.useState(false);

  const { data: cart } = api.cart.getCart.useQuery(undefined, {
    // Poll every 30 seconds to keep cart fresh
    refetchInterval: 30000,
  });

  const { data: cutoffInfo } = api.order.getCutoffInfo.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  // Trigger animation when cart total changes
  const prevTotalRef = React.useRef(cart?.total);
  React.useEffect(() => {
    if (cart?.total !== undefined && prevTotalRef.current !== undefined && cart.total !== prevTotalRef.current) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
    prevTotalRef.current = cart?.total;
  }, [cart?.total]);

  const handleCheckout = () => {
    router.push(`/${locale}/checkout`);
  };

  const itemCount = cart?.itemCount || 0;
  const total = cart?.total || 0;
  const availableCredit = cart ? cart.creditLimit - cart.total : 0;
  const exceedsCredit = cart?.exceedsCredit || false;

  // Determine if user can checkout
  const canCheckout = itemCount > 0 && !exceedsCredit;

  return (
    <div className={cn(
      "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border",
      isHidden && "opacity-0 pointer-events-none -translate-y-full",
      "transition-all duration-300 ease-out"
    )}>
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-[60px]">
            {/* Left: Cart Icon + Item Count */}
            <button
              onClick={onCartClick}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200',
                'hover:bg-muted/50 active:scale-95',
                animate && 'animate-cart-bounce'
              )}
              aria-label={t('cartSummary.viewCart')}
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge
                    variant="default"
                    className={cn(
                      'absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]',
                      animate && 'animate-badge-pop'
                    )}
                  >
                    {itemCount}
                  </Badge>
                )}
              </div>
              <span className="font-medium">
                {t('cartSummary.title')}
              </span>
            </button>

            {/* Center: Order Cutoff Reminder (if applicable) */}
            {cutoffInfo && !cutoffInfo.isAfterCutoff && (
              <div className="flex items-center gap-2 text-sm">
                <Muted className="text-xs">
                  {t('cartSummary.orderBy', {
                    time: cutoffInfo.cutoffTime,
                    date: cutoffInfo.nextAvailableDeliveryDate.toLocaleDateString(),
                  })}
                </Muted>
              </div>
            )}

            {/* Right: Total, Credit Available, Checkout Button */}
            <div className="flex items-center gap-6">
              {/* Total */}
              <div className="text-right">
                <Muted className="text-xs">{t('cartSummary.total')}</Muted>
                <Large className={cn(
                  'font-bold transition-all duration-200',
                  animate && 'scale-110'
                )}>
                  {formatAUD(total)}
                </Large>
              </div>

              {/* Credit Available */}
              {cart && (
                <div className="text-right">
                  <Muted className="text-xs">{t('cartSummary.creditAvailable')}</Muted>
                  <span className={cn(
                    'font-semibold',
                    exceedsCredit ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {formatAUD(Math.max(0, availableCredit))}
                  </span>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                size="lg"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className={cn(
                  'gap-2 px-6',
                  !canCheckout && 'opacity-50 cursor-not-allowed'
                )}
              >
                {t('cartSummary.checkout')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex items-center justify-between h-[50px] px-4">
          {/* Left: Cart Icon + Badge + Total */}
          <button
            onClick={onCartClick}
            className={cn(
              'flex items-center gap-2.5 transition-all duration-200',
              'active:scale-95',
              animate && 'animate-cart-bounce'
            )}
            aria-label={t('cartSummary.viewCart')}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge
                  variant="default"
                  className={cn(
                    'absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[9px]',
                    animate && 'animate-badge-pop'
                  )}
                >
                  {itemCount}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className={cn(
                'font-bold text-sm transition-all duration-200',
                animate && 'scale-110'
              )}>
                {formatAUD(total)}
              </span>
              {itemCount > 0 && (
                <Muted className="text-[10px]">
                  {t('cartSummary.items', { count: itemCount })}
                </Muted>
              )}
            </div>
          </button>

          {/* Right: Checkout Button */}
          <Button
            size="sm"
            onClick={handleCheckout}
            disabled={!canCheckout}
            className={cn(
              'gap-1.5 px-4',
              !canCheckout && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t('cartSummary.checkout')}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Mobile: Credit Warning if exceeds */}
        {exceedsCredit && (
          <div className="bg-destructive/10 border-t border-destructive/20 px-4 py-2">
            <p className="text-xs text-destructive font-medium">
              {tCart('creditLimitWarning')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
