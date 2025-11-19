'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Card,
  CardContent,
  Skeleton,
  H3,
  Muted,
  StatusBadge,
  type StatusType,
} from '@jimmy-beef/ui';
import { MapPin, Package } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCurrency } from '@jimmy-beef/shared';

interface OrderItem {
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface DeliveryAddress {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  deliveryInstructions?: string | null;
}

interface StatusHistoryItem {
  status: string;
  changedAt: Date | string;
  changedBy: string;
  notes: string | null;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsModal({ orderId, open, onOpenChange }: OrderDetailsModalProps) {
  const t = useTranslations('orderDetails');
  const tCommon = useTranslations('common');

  const { data: order, isLoading, error } = api.order.getById.useQuery(
    { orderId: orderId! },
    { enabled: !!orderId && open }
  );

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8">
            <Package className="h-16 w-16 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">{t('errorLoading')}</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        )}

        {order && (
          <div className="space-y-4">
            {/* Order Header */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <H3 className="text-xl">#{order.orderNumber}</H3>
                    <Muted>{formatDate(order.orderedAt)}</Muted>
                  </div>
                  <StatusBadge status={order.status as StatusType} />
                </div>

                {order.requestedDeliveryDate && (
                  <div>
                    <Muted className="text-sm">{t('requestedDelivery')}</Muted>
                    <p className="text-base">{formatDate(order.requestedDeliveryDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardContent className="p-4">
                <H3 className="text-lg mb-3">{t('items')}</H3>
                <div className="space-y-3">
                  {(order.items as OrderItem[]).map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <Muted className="text-sm">
                          SKU: {item.sku} | {item.unit}
                        </Muted>
                        <Muted className="text-sm">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </Muted>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <Muted>{tCommon('subtotal')}</Muted>
                  <p className="font-medium">{formatCurrency(order.subtotal)}</p>
                </div>
                <div className="flex justify-between">
                  <Muted>{tCommon('tax')}</Muted>
                  <p className="font-medium">{formatCurrency(order.taxAmount)}</p>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <p className="text-lg font-semibold">{tCommon('total')}</p>
                  <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <H3 className="text-lg mb-2">{t('deliveryAddress')}</H3>
                    <p className="text-base">
                      {(order.deliveryAddress as DeliveryAddress).street}
                      <br />
                      {(order.deliveryAddress as DeliveryAddress).suburb} {(order.deliveryAddress as DeliveryAddress).state}{' '}
                      {(order.deliveryAddress as DeliveryAddress).postcode}
                    </p>
                    {(order.deliveryAddress as DeliveryAddress).deliveryInstructions && (
                      <Muted className="mt-2">
                        {t('instructions')}: {(order.deliveryAddress as DeliveryAddress).deliveryInstructions}
                      </Muted>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status History */}
            {order.statusHistory && (order.statusHistory as StatusHistoryItem[]).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <H3 className="text-lg mb-3">{t('statusHistory')}</H3>
                  <div className="space-y-2">
                    {(order.statusHistory as StatusHistoryItem[]).map((history, index) => (
                      <div key={index} className="flex justify-between items-start text-sm">
                        <div>
                          <StatusBadge status={history.status as StatusType} />
                          {history.notes && <Muted className="ml-2">{history.notes}</Muted>}
                        </div>
                        <Muted>{formatDate(history.changedAt)}</Muted>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
