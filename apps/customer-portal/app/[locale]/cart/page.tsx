'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button, Skeleton, Card, CardContent, useToast, IllustratedEmptyState } from '@joho-erp/ui';
import { Trash2, Check, ShoppingCart as CartIcon, ClipboardCheck, CheckCircle } from 'lucide-react';
import { cn } from '@joho-erp/ui';
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
          <IllustratedEmptyState
            variant="error"
            title={t('illustratedEmptyState.error.title')}
            description={t('illustratedEmptyState.error.description')}
            secondaryDescription={error.message}
            primaryAction={{
              label: t('illustratedEmptyState.error.primaryAction'),
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  // Checkout progress steps
  const checkoutSteps = [
    { key: 'cart', icon: CartIcon, label: t('cart.checkoutProgress.step1') },
    { key: 'review', icon: ClipboardCheck, label: t('cart.checkoutProgress.step2') },
    { key: 'complete', icon: CheckCircle, label: t('cart.checkoutProgress.step3') },
  ];
  const currentStepIndex = 0; // Cart page is always step 0

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

      {/* Checkout Progress Indicator */}
      {!isEmpty && (
        <div className="container mx-auto px-4 pt-4">
          <div className="flex items-center justify-center gap-0 sm:gap-2 mb-2">
            {checkoutSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-xs font-medium hidden sm:block",
                      isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  {idx < checkoutSteps.length - 1 && (
                    <div className={cn(
                      "h-0.5 w-8 sm:w-12 mx-1 sm:mx-2 transition-colors duration-200",
                      idx < currentStepIndex ? "bg-green-500" : "bg-muted"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isEmpty ? (
          <IllustratedEmptyState
            variant="empty-cart"
            title={t('illustratedEmptyState.emptyCart.title')}
            description={t('illustratedEmptyState.emptyCart.description')}
            secondaryDescription={t('illustratedEmptyState.emptyCart.secondaryDescription')}
            primaryAction={{
              label: t('illustratedEmptyState.emptyCart.primaryAction'),
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
