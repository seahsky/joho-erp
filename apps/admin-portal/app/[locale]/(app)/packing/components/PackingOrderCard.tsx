'use client';

import { useState, useEffect } from 'react';
import { StatusBadge, type StatusType, useToast, Card, CardContent, Button } from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { CheckSquare, Square, Loader2, Send, StickyNote } from 'lucide-react';
import { api } from '@/trpc/client';
import { useDebouncedCallback } from 'use-debounce';

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
  const [packingNotes, setPackingNotes] = useState('');
  const utils = api.useUtils();

  const { data: orderDetails, isLoading } = api.packing.getOrderDetails.useQuery({
    orderId: order.orderId,
  });

  // Sync local notes state with server data on initial load
  useEffect(() => {
    if (orderDetails?.packingNotes) {
      setPackingNotes(orderDetails.packingNotes);
    }
  }, [orderDetails?.packingNotes]);

  const markOrderReadyMutation = api.packing.markOrderReady.useMutation({
    onMutate: async (variables) => {
      const { orderId, notes } = variables;

      // Cancel outgoing refetches
      await utils.packing.getOrderDetails.cancel({ orderId });

      // Snapshot for rollback
      const previousOrderDetails = utils.packing.getOrderDetails.getData({ orderId });

      // Optimistically update order status
      utils.packing.getOrderDetails.setData(
        { orderId },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            status: 'ready_for_delivery' as const,
            packingNotes: notes,
          };
        }
      );

      return { previousOrderDetails };
    },

    onSuccess: () => {
      toast({
        title: t('orderReady'),
        description: t('orderReadyDescription'),
      });
      // Trigger parent refetch to update order list
      onOrderUpdated();
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrderDetails) {
        utils.packing.getOrderDetails.setData(
          { orderId: variables.orderId },
          context.previousOrderDetails
        );
      }

      toast({
        title: t('errorMarkingReady'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markItemPackedMutation = api.packing.markItemPacked.useMutation({
    // Optimistic update: Update cache before server responds
    onMutate: async (variables) => {
      const { orderId, itemSku, packed } = variables;

      // Cancel any outgoing refetches (so they don't overwrite optimistic update)
      await utils.packing.getOrderDetails.cancel({ orderId });

      // Snapshot the previous value for rollback
      const previousOrderDetails = utils.packing.getOrderDetails.getData({ orderId });

      // Optimistically update orderDetails cache
      utils.packing.getOrderDetails.setData(
        { orderId },
        (old) => {
          if (!old) return old;

          const updatedItems = old.items.map((item) =>
            item.sku === itemSku ? { ...item, packed } : item
          );

          return {
            ...old,
            items: updatedItems,
            allItemsPacked: updatedItems.length > 0 && updatedItems.every((item) => item.packed),
          };
        }
      );

      // Return context for rollback
      return { previousOrderDetails };
    },

    // On error: rollback to previous state
    onError: (error, variables, context) => {
      // Restore previous cache state
      if (context?.previousOrderDetails) {
        utils.packing.getOrderDetails.setData(
          { orderId: variables.orderId },
          context.previousOrderDetails
        );
      }

      toast({
        title: t('errorMarkingItem'),
        description: error.message,
        variant: 'destructive',
      });
    },

    // On success: cache already updated optimistically, no action needed
    onSuccess: () => {
      // Success handled silently - UI already updated optimistically
    },
  });

  const addPackingNotesMutation = api.packing.addPackingNotes.useMutation({
    onMutate: async (variables) => {
      const { orderId, notes } = variables;

      await utils.packing.getOrderDetails.cancel({ orderId });

      const previousOrderDetails = utils.packing.getOrderDetails.getData({ orderId });

      // Optimistically update notes in cache
      utils.packing.getOrderDetails.setData(
        { orderId },
        (old) => {
          if (!old) return old;
          return { ...old, packingNotes: notes };
        }
      );

      return { previousOrderDetails };
    },

    onError: (error, variables, context) => {
      if (context?.previousOrderDetails) {
        utils.packing.getOrderDetails.setData(
          { orderId: variables.orderId },
          context.previousOrderDetails
        );
      }
      // Silent error - user can retry by typing again
    },

    onSuccess: () => {
      // Success handled silently
    },
  });

  // Debounced auto-save (500ms delay after typing stops)
  const debouncedSaveNotes = useDebouncedCallback((notes: string) => {
    addPackingNotesMutation.mutate({
      orderId: order.orderId,
      notes,
    });
  }, 500);

  const toggleItemPacked = (itemSku: string) => {
    if (!orderDetails) return;

    // Find current packed state from server data
    const currentItem = orderDetails.items.find((item) => item.sku === itemSku);
    if (!currentItem) return;

    const isPacked = currentItem.packed;

    // Trigger mutation with optimistic update
    markItemPackedMutation.mutate({
      orderId: order.orderId,
      itemSku,
      packed: !isPacked,
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
  const allItemsPacked = orderDetails.allItemsPacked;
  const packedCount = items.filter((item) => item.packed).length;
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
          const isPacked = item.packed;

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
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-muted-foreground">
            {t('packingNotes')}
          </label>
          {addPackingNotesMutation.isPending && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
        <textarea
          value={packingNotes}
          onChange={(e) => {
            const newNotes = e.target.value;
            setPackingNotes(newNotes);
            debouncedSaveNotes(newNotes);
          }}
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
