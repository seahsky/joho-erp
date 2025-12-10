'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  H3,
  Muted,
} from '@joho-erp/ui';
import { ShoppingCart, MapPin, Loader2, AlertCircle, Info } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCurrency } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';

export function OrderSummary() {
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const tBackorder = useTranslations('checkout.backorderWarning');
  const router = useRouter();
  const { toast } = useToast();

  // Fetch customer profile for delivery address
  const { data: customer, isLoading: isLoadingCustomer } = api.customer.getProfile.useQuery();

  // Create order mutation
  const createOrder = api.order.create.useMutation({
    onSuccess: () => {
      toast({
        title: t('orderPlaced'),
        description: t('orderPlacedSuccess'),
        variant: 'default',
      });
      router.push('/orders');
    },
    onError: (error) => {
      toast({
        title: t('orderFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch cart data
  const { data: cart, isLoading: isLoadingCart } = api.cart.getCart.useQuery();

  const handlePlaceOrder = () => {
    if (!customer) {
      toast({
        title: t('error'),
        description: t('customerNotFound'),
        variant: 'destructive',
      });
      return;
    }

    if (!cart || cart.items.length === 0) {
      toast({
        title: t('error'),
        description: t('emptyCart'),
        variant: 'destructive',
      });
      return;
    }

    // Convert cart items to order format
    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    createOrder.mutate({
      items: orderItems,
    });
  };

  // Cart totals (already calculated by backend)
  const subtotal = cart?.subtotal ?? 0;
  const gst = cart?.gst ?? 0;
  const total = cart?.total ?? 0;

  // Loading state
  if (isLoadingCustomer || isLoadingCart) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - customer not found
  if (!customer) {
    return (
      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-medium">{t('customerNotFound')}</p>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <H3 className="mb-2">{t('emptyCart')}</H3>
            <Muted className="mb-4">{t('emptyCartDescription')}</Muted>
            <Button onClick={() => {}}>
              {t('continueShopping')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Backorder Warning for Credit Customers */}
      {customer.creditApplication.status === 'approved' && (
        <Card className="border-info bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
              <div>
                <H3 className="text-base mb-1">{tBackorder('title')}</H3>
                <p className="text-sm text-muted-foreground">
                  {tBackorder('message')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t('orderItems')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0">
              <div className="flex-1">
                <p className="font-medium">{item.productName}</p>
                <Muted className="text-sm">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Muted>
              </div>
              <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('deliveryAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-base">
            <p>{customer.deliveryAddress.street}</p>
            <p>
              {customer.deliveryAddress.suburb} {customer.deliveryAddress.state}{' '}
              {customer.deliveryAddress.postcode}
            </p>
            {customer.deliveryAddress.deliveryInstructions && (
              <Muted className="mt-2">
                {t('instructions')}: {customer.deliveryAddress.deliveryInstructions}
              </Muted>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <Muted>{tCommon('subtotal')}</Muted>
            <p className="font-medium">{formatCurrency(subtotal)}</p>
          </div>
          <div className="flex justify-between">
            <Muted>{tCommon('tax')}</Muted>
            <p className="font-medium">{formatCurrency(gst)}</p>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <p className="text-lg font-semibold">{tCommon('total')}</p>
            <p className="text-lg font-bold">{formatCurrency(total)}</p>
          </div>

          {/* Credit limit warning if applicable */}
          {customer.creditApplication.status === 'approved' && (
            <div className="pt-3 border-t">
              <Muted className="text-sm">
                {t('availableCredit')}: {formatCurrency(customer.creditApplication.creditLimit)}
              </Muted>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Place Order Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={createOrder.isPending || cart.items.length === 0}
      >
        {createOrder.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('placingOrder')}
          </>
        ) : (
          tCommon('placeOrder')
        )}
      </Button>
    </div>
  );
}
