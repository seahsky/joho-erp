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
  Input,
  Label,
} from '@joho-erp/ui';
import { ShoppingCart, MapPin, Loader2, AlertCircle, Info, Calendar, Clock } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';

export function OrderSummary() {
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const tBackorder = useTranslations('checkout.backorderWarning');
  const tDelivery = useTranslations('checkout.deliveryDate');
  const tCredit = useTranslations('checkout.credit');
  const router = useRouter();
  const { toast } = useToast();

  // State for delivery date
  const [deliveryDate, setDeliveryDate] = React.useState<string>('');

  // Fetch customer profile for delivery address
  const { data: customer, isLoading: isLoadingCustomer } = api.customer.getProfile.useQuery();

  // Fetch cutoff info
  const { data: cutoffInfo } = api.order.getCutoffInfo.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch available credit info
  const { data: creditInfo, isLoading: isLoadingCredit } = api.order.getAvailableCreditInfo.useQuery();

  // Set default delivery date based on cutoff info
  React.useEffect(() => {
    if (cutoffInfo?.nextAvailableDeliveryDate && !deliveryDate) {
      const nextDate = new Date(cutoffInfo.nextAvailableDeliveryDate);
      setDeliveryDate(nextDate.toISOString().split('T')[0]);
    }
  }, [cutoffInfo, deliveryDate]);

  // Calculate min date for date picker (tomorrow or day after based on cutoff)
  const minDeliveryDate = React.useMemo(() => {
    if (cutoffInfo?.nextAvailableDeliveryDate) {
      return new Date(cutoffInfo.nextAvailableDeliveryDate).toISOString().split('T')[0];
    }
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, [cutoffInfo]);

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
      requestedDeliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
    });
  };

  // Check if order exceeds available credit
  const exceedsCredit = React.useMemo(() => {
    if (!creditInfo || !cart) return false;
    return cart.total > creditInfo.availableCredit;
  }, [creditInfo, cart]);

  // Cart totals (already calculated by backend)
  const subtotal = cart?.subtotal ?? 0;
  const gst = cart?.gst ?? 0;
  const total = cart?.total ?? 0;

  // Loading state
  if (isLoadingCustomer || isLoadingCart || isLoadingCredit) {
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

      {/* Delivery Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {tDelivery('label')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="deliveryDate">{tDelivery('selectDate')}</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              min={minDeliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Cutoff Warning */}
          {cutoffInfo?.isAfterCutoff && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {tDelivery('cutoffWarning', { time: cutoffInfo.cutoffTime })}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {tDelivery('nextAvailable', {
                    date: new Date(cutoffInfo.nextAvailableDeliveryDate).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }),
                  })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Limit Warning */}
      {exceedsCredit && creditInfo && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <H3 className="text-base mb-1 text-destructive">{tCredit('exceedsCredit')}</H3>
                <p className="text-sm text-muted-foreground">
                  {tCredit('exceedsCreditMessage', {
                    total: formatAUD(total),
                    available: formatAUD(creditInfo.availableCredit),
                  })}
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
                  {item.quantity} × {formatAUD(item.unitPrice)}
                </Muted>
              </div>
              <p className="font-semibold">{formatAUD(item.subtotal)}</p>
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
            <p className="font-medium">{formatAUD(subtotal)}</p>
          </div>
          <div className="flex justify-between">
            <Muted>{tCommon('tax')}</Muted>
            <p className="font-medium">{formatAUD(gst)}</p>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <p className="text-lg font-semibold">{tCommon('total')}</p>
            <p className="text-lg font-bold">{formatAUD(total)}</p>
          </div>

          {/* Credit info if applicable */}
          {customer.creditApplication.status === 'approved' && creditInfo && (
            <div className="pt-3 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <Muted>{tCredit('creditLimit')}</Muted>
                <span>{formatAUD(creditInfo.creditLimit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <Muted>{tCredit('outstandingBalance')}</Muted>
                <span>{formatAUD(creditInfo.outstandingBalance)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className={exceedsCredit ? 'text-destructive' : 'text-green-600'}>
                  {tCredit('availableCredit')}
                </span>
                <span className={exceedsCredit ? 'text-destructive' : 'text-green-600'}>
                  {formatAUD(creditInfo.availableCredit)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Place Order Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePlaceOrder}
        disabled={createOrder.isPending || cart.items.length === 0 || exceedsCredit || !deliveryDate}
      >
        {createOrder.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('placingOrder')}
          </>
        ) : exceedsCredit ? (
          tCredit('exceedsCredit')
        ) : (
          tCommon('placeOrder')
        )}
      </Button>
    </div>
  );
}
