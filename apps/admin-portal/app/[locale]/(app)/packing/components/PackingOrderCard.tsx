'use client';

import { useState } from 'react';
import { StatusBadge, type StatusType, useToast, Card, CardContent, Button } from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { CheckSquare, Square, Loader2, Send, StickyNote } from 'lucide-react';
import { api } from '@/trpc/client';

interface PackingOrderCardProps {
  order: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
    packingSequence: number | null;
    deliverySequence: number | null;
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
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">{t('loadingOrder')}</span>
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
  const progressPercent = items.length > 0 ? (packedCount / items.length) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/40">
      {/* Clean Header - With Sequence Badge */}
      <div className="relative">
        {/* Sequence Badge - Prominent Position */}
        {order.packingSequence !== null && (
          <div className="absolute top-0 left-0 z-10">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-tl-lg rounded-br-lg shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold opacity-90">Pack</span>
                <span className="text-2xl font-black tabular-nums leading-none">
                  #{order.packingSequence}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-4 bg-gradient-to-br from-muted/30 to-background border-b border-border pt-14">
          <div className="flex items-start justify-between gap-4 mb-3">
            {/* Order Info */}
            <div className="flex-1">
              <h3 className="font-mono font-bold text-xl text-foreground tracking-tight">
                {order.orderNumber}
              </h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">{order.customerName}</p>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <StatusBadge status={orderDetails.status as StatusType} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-muted-foreground">{t('progress')}</span>
              <span className="text-foreground tabular-nums">
                {packedCount} / {items.length}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent === 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Delivery Instructions if present */}
          {orderDetails.deliveryAddress && orderDetails.deliveryAddress.includes('instructions') && (
            <div className="mt-3 p-2.5 bg-warning/10 border-l-4 border-warning rounded">
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-xs text-warning-foreground font-medium">
                  {orderDetails.deliveryAddress}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Checklist */}
      <div className="p-4 space-y-1.5">
        {items.map((item, index) => {
          const isPacked = packedItems.has(item.sku);

          return (
            <button
              key={item.sku}
              onClick={() => toggleItemPacked(item.sku)}
              className={`w-full flex items-center gap-3 p-3 rounded-md border transition-all duration-200 ${
                isPacked
                  ? 'bg-success/10 border-success/30 hover:bg-success/15'
                  : 'bg-background border-border hover:bg-muted/50 hover:border-primary/30'
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'itemSlide 0.3s ease-out',
              }}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0">
                {isPacked ? (
                  <CheckSquare className="h-5 w-5 text-success transition-transform hover:scale-110" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground transition-transform hover:scale-110" />
                )}
              </div>

              {/* Item Details */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`font-mono font-semibold text-xs tracking-tight ${
                      isPacked ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {item.sku}
                  </span>
                  <span className="font-bold text-sm text-primary tabular-nums whitespace-nowrap">
                    {item.quantity}
                    <span className="text-xs text-muted-foreground ml-1">units</span>
                  </span>
                </div>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    isPacked ? 'text-muted-foreground line-through' : 'text-muted-foreground'
                  }`}
                >
                  {item.productName}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Notes Section */}
      <div className="px-4 pb-3">
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          {t('packingNotes')}
        </label>
        <textarea
          value={packingNotes}
          onChange={(e) => setPackingNotes(e.target.value)}
          placeholder={t('addNotes')}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-xs font-medium text-foreground placeholder:text-muted-foreground bg-background"
          rows={2}
        />
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        <Button
          onClick={handleMarkReady}
          disabled={!allItemsPacked || markOrderReadyMutation.isPending}
          className="w-full"
          variant={allItemsPacked && !markOrderReadyMutation.isPending ? "default" : "secondary"}
        >
          {markOrderReadyMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('marking')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t('markAsReady')}
            </>
          )}
        </Button>

        {!allItemsPacked && (
          <p className="text-xs text-center text-muted-foreground mt-2 font-medium">
            {t('checkAllItemsFirst')}
          </p>
        )}
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes itemSlide {
          from {
            opacity: 0;
            transform: translateX(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
