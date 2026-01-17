'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, cn, useToast } from '@joho-erp/ui';
import { ShoppingCart, ArrowRight, Package, Sparkles, Loader2, AlertCircle } from 'lucide-react';
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
  const tDelivery = useTranslations('checkout.deliveryDate');
  const tCheckout = useTranslations('checkout');
  const router = useRouter();
  const { toast } = useToast();

  // Core data queries
  const { data: cart, isLoading } = api.cart.getCart.useQuery();
  const { data: cutoffInfo } = api.order.getCutoffInfo.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });
  const { data: customer } = api.customer.getProfile.useQuery();
  const { data: onboardingStatus } = api.customer.getOnboardingStatus.useQuery();
  const { data: minimumOrderInfo } = api.order.getMinimumOrderInfo.useQuery();

  // State for delivery date
  const [deliveryDate, setDeliveryDate] = React.useState<string>('');
  const [isSundayError, setIsSundayError] = React.useState<boolean>(false);

  // Set default delivery date based on cutoff info
  React.useEffect(() => {
    if (cutoffInfo?.nextAvailableDeliveryDate && !deliveryDate) {
      const nextDate = new Date(cutoffInfo.nextAvailableDeliveryDate);
      setDeliveryDate(nextDate.toISOString().split('T')[0]);
    }
  }, [cutoffInfo, deliveryDate]);

  // Calculate min date for date picker
  const minDeliveryDate = React.useMemo(() => {
    if (cutoffInfo?.nextAvailableDeliveryDate) {
      return new Date(cutoffInfo.nextAvailableDeliveryDate).toISOString().split('T')[0];
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, [cutoffInfo]);

  // Clear cart mutation
  const clearCart = api.cart.clearCart.useMutation();

  // Create order mutation
  const createOrder = api.order.create.useMutation({
    onSuccess: () => {
      clearCart.mutate();
      toast({
        title: t('orderPlaced'),
        description: t('orderSuccess'),
        variant: 'default',
      });
      onClose();
      router.push(`/${locale}/orders`);
    },
    onError: (error) => {
      toast({
        title: tCheckout('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Date change handler
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setDeliveryDate(date);
    if (date) {
      const selectedDate = new Date(date);
      setIsSundayError(selectedDate.getDay() === 0);
    } else {
      setIsSundayError(false);
    }
  };

  // Place order handler
  const handlePlaceOrder = () => {
    if (!customer || !cart || cart.items.length === 0) return;

    if (deliveryDate) {
      const selectedDate = new Date(deliveryDate);
      if (selectedDate.getDay() === 0) {
        toast({
          title: tCheckout('error'),
          description: tDelivery('sundayNotAvailable'),
          variant: 'destructive',
        });
        return;
      }
    }

    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    createOrder.mutate({
      items: orderItems,
      requestedDeliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
    });
  };

  const handleViewCart = () => {
    onClose();
    router.push(`/${locale}/cart`);
  };

  const handleContinueShopping = () => {
    onClose();
    router.push(`/${locale}/products`);
  };

  // Check for blocking conditions
  const isOnboardingIncomplete = !onboardingStatus?.onboardingComplete;
  const isCreditPending = onboardingStatus?.creditStatus !== 'approved';
  const isOrderingBlocked = isOnboardingIncomplete || isCreditPending;

  // Check if order exceeds credit or below minimum
  const exceedsCredit = cart?.exceedsCredit ?? false;
  const belowMinimum = React.useMemo(() => {
    if (!minimumOrderInfo?.hasMinimum || !cart) return false;
    return cart.total < (minimumOrderInfo.minimumOrderAmount || 0);
  }, [minimumOrderInfo, cart]);

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

  // Determine if place order button should be disabled
  const isPlaceOrderDisabled =
    createOrder.isPending ||
    cart.items.length === 0 ||
    exceedsCredit ||
    belowMinimum ||
    !deliveryDate ||
    isSundayError ||
    isOrderingBlocked;

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

        {/* Delivery Date Selection */}
        {!isOrderingBlocked && (
          <div className="mb-4">
            <label htmlFor="miniCartDeliveryDate" className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('deliveryDate')}
            </label>
            <input
              id="miniCartDeliveryDate"
              type="date"
              value={deliveryDate}
              min={minDeliveryDate}
              onChange={handleDateChange}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border bg-white',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(0,67%,35%)]/20 focus:border-[hsl(0,67%,35%)]',
                'transition-all duration-200',
                isSundayError
                  ? 'border-destructive text-destructive'
                  : 'border-neutral-300 text-neutral-900'
              )}
            />
            {isSundayError && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('sundayNotAvailable')}
              </p>
            )}
          </div>
        )}

        {/* Cutoff Reminder */}
        {cutoffInfo && !isOrderingBlocked && (
          <CutoffReminder
            cutoffTime={cutoffInfo.cutoffTime}
            isAfterCutoff={cutoffInfo.isAfterCutoff}
            nextAvailableDate={new Date(cutoffInfo.nextAvailableDeliveryDate)}
            variant="compact"
            className="mb-4"
          />
        )}

        {/* Credit warning */}
        {exceedsCredit && (
          <div className={cn(
            'mb-4 p-3 rounded-lg',
            'bg-gradient-to-r from-destructive/10 to-destructive/5',
            'border border-destructive/20'
          )}>
            <p className="text-xs text-destructive text-center font-medium flex items-center justify-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('exceedsCredit')}
            </p>
          </div>
        )}

        {/* Minimum order warning */}
        {belowMinimum && minimumOrderInfo && (
          <div className={cn(
            'mb-4 p-3 rounded-lg',
            'bg-gradient-to-r from-amber-100/80 to-amber-50',
            'border border-amber-200'
          )}>
            <p className="text-xs text-amber-700 text-center font-medium flex items-center justify-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('belowMinimum')} ({formatAUD(minimumOrderInfo.minimumOrderAmount || 0)})
            </p>
          </div>
        )}

        {/* Ordering blocked warning */}
        {isOrderingBlocked && (
          <div className={cn(
            'mb-4 p-3 rounded-lg',
            'bg-gradient-to-r from-amber-100/80 to-amber-50',
            'border border-amber-200'
          )}>
            <p className="text-xs text-amber-700 text-center font-medium">
              {isOnboardingIncomplete
                ? t('completeOnboarding')
                : t('creditPending')
              }
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <Button
            onClick={handlePlaceOrder}
            disabled={isPlaceOrderDisabled}
            className={cn(
              'w-full gap-2.5 h-12 text-[15px] font-semibold',
              'bg-gradient-to-b from-[hsl(0,67%,38%)] to-[hsl(0,67%,30%)]',
              'hover:from-[hsl(0,67%,42%)] hover:to-[hsl(0,67%,33%)]',
              'shadow-sm hover:shadow-lg hover:shadow-[hsl(0,67%,35%)]/20',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {createOrder.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tCheckout('placingOrder')}
              </>
            ) : (
              <>
                {tCommon('placeOrder')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
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
