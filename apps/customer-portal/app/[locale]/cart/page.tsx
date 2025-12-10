'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button, H2, Muted, Skeleton, Card, CardContent, useToast } from '@joho-erp/ui';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { api } from '@/trpc/client';
import { CartItem } from './components/cart-item';
import { CartSummary } from './components/cart-summary';

export default function CartPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const { data: cart, isLoading, error } = api.cart.getCart.useQuery();
  const utils = api.useUtils();

  const clearCart = api.cart.clearCart.useMutation({
    onSuccess: () => {
      toast({
        title: t('cart.messages.cartCleared'),
      });
      void utils.cart.getCart.invalidate();
    },
    onError: () => {
      toast({
        title: t('cart.messages.errorClearingCart'),
        variant: 'destructive',
      });
    },
  });

  const handleClearCart = () => {
    if (confirm(t('cart.messages.cartCleared'))) {
      clearCart.mutate();
    }
  };

  const handleContinueShopping = () => {
    router.push(`/${locale}/products`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="space-y-3">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive mb-2">
              {t('cart.messages.errorLoadingCart')}
            </p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <H2 className="text-2xl md:text-3xl">{t('cart.title')}</H2>
          <Muted className="mt-1">{t('cart.subtitle')}</Muted>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isEmpty ? (
          /* Empty State */
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">{t('cart.emptyCart')}</p>
            <Button onClick={handleContinueShopping} className="mt-4">
              {t('cart.continueShopping')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Clear Cart Button */}
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">
                  {cart.items.length === 1
                    ? t('cart.itemCount', { count: cart.items.length })
                    : t('cart.itemCount_plural', { count: cart.items.length })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCart}
                  disabled={clearCart.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('cart.buttons.clearCart')}
                </Button>
              </div>

              {/* Item List */}
              {cart.items.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <CartSummary
                subtotalCents={cart.subtotal}
                gstCents={cart.gst}
                totalCents={cart.total}
                exceedsCredit={cart.exceedsCredit}
                creditLimitCents={cart.creditLimit}
                locale={locale}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
