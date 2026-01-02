'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button, Skeleton, Card, CardContent, useToast, EmptyState } from '@joho-erp/ui';
import { ShoppingCart, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '@/trpc/client';
import { CartItem } from './components/cart-item';
import { CartSummary } from './components/cart-summary';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader, PageHeaderSkeleton } from '@/components/page-header';

export default function CartPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const { data: cart, isLoading, error } = api.cart.getCart.useQuery();
  const utils = api.useUtils();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);

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
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmClearCart = () => {
    clearCart.mutate();
  };

  const handleContinueShopping = () => {
    router.push(`/${locale}/products`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeaderSkeleton />

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
        <PageHeader title={t('cart.title')} subtitle={t('cart.subtitle')} />
        <div className="container mx-auto px-4 py-6">
          <EmptyState
            icon={AlertTriangle}
            title={t('cart.messages.errorLoadingCart')}
            description={error.message}
            action={{
              label: t('common.retry'),
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <>
      <ConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        title={t('cart.dialog.clearCartTitle')}
        description={t('cart.dialog.clearCartDescription')}
        confirmText={t('cart.dialog.clearCartConfirm')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmClearCart}
        variant="destructive"
      />
      <div className="min-h-screen bg-background">
      <PageHeader
        title={t('cart.title')}
        subtitle={t('cart.subtitle')}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isEmpty ? (
          <EmptyState
            icon={ShoppingCart}
            title={t('cart.emptyCart')}
            description={t('cart.emptyCartDescription')}
            action={{
              label: t('cart.continueShopping'),
              onClick: handleContinueShopping,
            }}
          />
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
    </>
  );
}
