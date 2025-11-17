'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  StatusBadge,
  type StatusType,
  useToast,
} from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { MapPin, Package, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';

interface PackingOrderCardProps {
  order: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
  };
  onOrderUpdated: () => void;
}

export function PackingOrderCard({ order, onOrderUpdated }: PackingOrderCardProps) {
  const t = useTranslations('packing');
  const { toast } = useToast();
  const [packedItems, setPackedItems] = useState<Set<string>>(new Set());
  const [packingNotes, setPackingNotes] = useState('');

  const { data: orderDetails, isLoading } = api.packing.getOrderDetails.useQuery({
    orderId: order.orderId,
  });

  const markOrderReadyMutation = api.packing.markOrderReady.useMutation({
    onSuccess: () => {
      toast({
        title: t('orderReady'),
        description: t('orderReadyDescription'),
      });
      onOrderUpdated();
    },
    onError: (error) => {
      toast({
        title: t('errorMarkingReady'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markItemPackedMutation = api.packing.markItemPacked.useMutation({
    onSuccess: () => {
      // Success handled silently
    },
    onError: (error) => {
      toast({
        title: t('errorMarkingItem'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleItemPacked = (itemSku: string) => {
    setPackedItems((prev) => {
      const next = new Set(prev);
      const isPacked = !next.has(itemSku);

      if (isPacked) {
        next.add(itemSku);
      } else {
        next.delete(itemSku);
      }

      // Call API to mark item
      markItemPackedMutation.mutate({
        orderId: order.orderId,
        itemSku,
        packed: isPacked,
      });

      return next;
    });
  };

  const handleMarkReady = () => {
    if (!allItemsPacked) {
      toast({
        title: t('mustCheckAllItems'),
        description: t('mustCheckAllItemsDescription'),
        variant: 'destructive',
      });
      return;
    }

    markOrderReadyMutation.mutate({
      orderId: order.orderId,
      notes: packingNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">{t('loadingOrder')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orderDetails) {
    return null;
  }

  const items = orderDetails.items || [];
  const allItemsPacked = items.every((item) => packedItems.has(item.sku));
  const packedCount = Array.from(packedItems).filter((sku) =>
    items.some((item) => item.sku === sku)
  ).length;

  const getAreaBadgeColor = (areaTag: string) => {
    switch (areaTag.toLowerCase()) {
      case 'north':
        return 'bg-blue-100 text-blue-800';
      case 'south':
        return 'bg-green-100 text-green-800';
      case 'east':
        return 'bg-yellow-100 text-yellow-800';
      case 'west':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Package className="h-5 w-5" />
              {order.orderNumber}
            </CardTitle>
            <CardDescription className="mt-1">{order.customerName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getAreaBadgeColor(order.areaTag)}>
              {order.areaTag.toUpperCase()}
            </Badge>
            <StatusBadge status={orderDetails.status as StatusType} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Delivery Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">{t('deliveryAddress')}</p>
            <p className="text-muted-foreground">{orderDetails.deliveryAddress}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('itemsPacked')}</span>
            <span className="font-medium">
              {packedCount} / {items.length}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${items.length > 0 ? (packedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Items Checklist */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{t('items')}</h4>
          <div className="space-y-2">
            {items.map((item) => {
              const isPacked = packedItems.has(item.sku);
              return (
                <button
                  key={item.sku}
                  onClick={() => toggleItemPacked(item.sku)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${
                    isPacked
                      ? 'bg-success/5 border-success/20'
                      : 'bg-background hover:bg-muted/50'
                  }`}
                >
                  {isPacked ? (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left">
                    <p className={`font-medium text-sm ${isPacked ? 'line-through text-muted-foreground' : ''}`}>
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku} • {item.quantity} units
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Packing Notes */}
        <div className="space-y-2">
          <label htmlFor={`notes-${order.orderId}`} className="text-sm font-medium">
            {t('packingNotes')}
          </label>
          <textarea
            id={`notes-${order.orderId}`}
            value={packingNotes}
            onChange={(e) => setPackingNotes(e.target.value)}
            placeholder={t('addNotes')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </div>

        {/* Mark as Ready Button */}
        <Button
          onClick={handleMarkReady}
          disabled={!allItemsPacked || markOrderReadyMutation.isPending}
          className="w-full"
          size="lg"
        >
          {markOrderReadyMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('marking')}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('markAsReady')}
            </>
          )}
        </Button>

        {!allItemsPacked && (
          <p className="text-xs text-center text-muted-foreground">
            {t('checkAllItemsFirst')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
