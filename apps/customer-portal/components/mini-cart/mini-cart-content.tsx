'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, cn } from '@joho-erp/ui';
import { ShoppingCart, ArrowRight, Package, Sparkles } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';
import { MiniCartItem } from './mini-cart-item';
import { CutoffReminder } from '@/components/cutoff-reminder';

interface MiniCartContentProps {
  locale: string;
  onClose: () => void;
}

export function MiniCartContent({ locale, onClose }: MiniCartContentProps) {
  const t = useTranslations('miniCart');
  const tCommon = useTranslations('common');
  const tCart = useTranslations('cart');
  const router = useRouter();
  const { data: cart, isLoading } = api.cart.getCart.useQuery();
  const { data: cutoffInfo } = api.order.getCutoffInfo.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  const handleViewCart = () => {
    onClose();
    router.push(`/${locale}/cart`);
  };

  const handleCheckout = () => {
    onClose();
    router.push(`/${locale}/checkout`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${locale}/products`);
  };

  // Loading state with refined animation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-[hsl(0,67%,35%)]" />
          <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border border-[hsl(0,67%,35%)]/20" />
        </div>
        <p className="mt-5 text-sm text-neutral-500 font-medium">{tCommon('loading')}</p>
      </div>
    );
  }

  // Empty cart state with elegant design
  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        {/* Decorative icon container */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 flex items-center justify-center shadow-sm border border-neutral-200/50">
            <ShoppingCart className="h-9 w-9 text-neutral-400" />
          </div>
          {/* Subtle sparkle decoration */}
          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-[hsl(0,67%,35%)]/40" />
        </div>

        <h3 className="text-lg font-semibold text-neutral-900 mb-1.5 tracking-tight">
          {t('empty')}
        </h3>
        <p className="text-sm text-neutral-500 text-center mb-7 max-w-[200px] leading-relaxed">
          {t('emptyDescription')}
        </p>

        <Button
          onClick={handleContinueShopping}
          className={cn(
            'gap-2.5 px-6 h-11',
            'bg-gradient-to-b from-[hsl(0,67%,38%)] to-[hsl(0,67%,32%)]',
            'hover:from-[hsl(0,67%,42%)] hover:to-[hsl(0,67%,35%)]',
            'shadow-sm hover:shadow-md',
            'transition-all duration-200'
          )}
        >
          <Package className="h-4 w-4" />
          {t('continueShopping')}
        </Button>
      </div>
    );
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header with item count */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80">
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
          {t('title')}
        </h2>
        <span className={cn(
          'text-sm font-medium px-2.5 py-1 rounded-full',
          'bg-neutral-100 text-neutral-600'
        )}>
          {t('items', { count: itemCount })}
        </span>
      </div>

      {/* Scrollable items list with refined scroll styling */}
      <div className={cn(
        'flex-1 overflow-y-auto py-3 -mx-1 px-1',
        'scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent'
      )}>
        {cart.items.map((item, index) => (
          <div
            key={item.productId}
            className={cn(
              'animate-in fade-in slide-in-from-right-2',
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MiniCartItem item={item} />
          </div>
        ))}
      </div>

      {/* Summary and actions - elevated section */}
      <div className={cn(
        'border-t border-neutral-200/80 pt-5 mt-auto',
        '-mx-1 px-1'
      )}>
        {/* Summary card */}
        <div className="bg-gradient-to-b from-neutral-50 to-neutral-100/50 rounded-xl p-4 mb-4 border border-neutral-200/60">
          {/* Subtotal */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-neutral-600">{t('subtotal')}</span>
            <span className="text-sm font-medium text-neutral-800">{formatAUD(cart.subtotal)}</span>
          </div>

          {/* GST */}
          {cart.gst > 0 && (
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-neutral-200/60">
              <span className="text-sm text-neutral-600">{t('gst')}</span>
              <span className="text-sm font-medium text-neutral-800">{formatAUD(cart.gst)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-neutral-900">
              {tCart('orderTotal')}
            </span>
            <span className="text-xl font-bold bg-gradient-to-r from-[hsl(0,67%,35%)] to-[hsl(0,50%,35%)] bg-clip-text text-transparent">
              {formatAUD(cart.total)}
            </span>
          </div>
        </div>

        {/* Cutoff Reminder */}
        {cutoffInfo && (
          <CutoffReminder
            cutoffTime={cutoffInfo.cutoffTime}
            isAfterCutoff={cutoffInfo.isAfterCutoff}
            nextAvailableDate={new Date(cutoffInfo.nextAvailableDeliveryDate)}
            variant="compact"
            className="mb-4"
          />
        )}

        {/* Credit warning */}
        {cart.exceedsCredit && (
          <div className={cn(
            'mb-4 p-3 rounded-lg',
            'bg-gradient-to-r from-destructive/10 to-destructive/5',
            'border border-destructive/20'
          )}>
            <p className="text-xs text-destructive text-center font-medium">
              {tCart('checkoutBlockedWarning')}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <Button
            onClick={handleCheckout}
            disabled={cart.exceedsCredit}
            className={cn(
              'w-full gap-2.5 h-12 text-[15px] font-semibold',
              'bg-gradient-to-b from-[hsl(0,67%,38%)] to-[hsl(0,67%,30%)]',
              'hover:from-[hsl(0,67%,42%)] hover:to-[hsl(0,67%,33%)]',
              'shadow-sm hover:shadow-lg hover:shadow-[hsl(0,67%,35%)]/20',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {t('checkoutNow')}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={handleViewCart}
            className={cn(
              'w-full h-11 text-sm font-medium',
              'border-neutral-300 text-neutral-700',
              'hover:bg-neutral-50 hover:border-neutral-400',
              'transition-all duration-200'
            )}
          >
            {t('viewCart')}
          </Button>
        </div>
      </div>
    </div>
  );
}
