'use client';

import { useState } from 'react';
import { StatusBadge, type StatusType, useToast } from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { CheckSquare, Square, Loader2, Send, StickyNote } from 'lucide-react';
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
      <div className="bg-white border-2 border-slate-200 rounded-lg p-8">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
          <span className="text-sm text-slate-600 font-medium">{t('loadingOrder')}</span>
        </div>
      </div>
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
    <div className="bg-white border-2 border-slate-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header with Barcode Stripe */}
      <div className="relative">
        {/* Barcode-style decorative element */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 opacity-80">
          <div className="flex h-full">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.3)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="pt-6 px-6 pb-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-start justify-between gap-4 mb-3">
            {/* Order Info */}
            <div className="flex-1">
              <h3 className="font-mono font-bold text-2xl text-slate-900 tracking-tight">
                {order.orderNumber}
              </h3>
              <p className="text-base font-semibold text-slate-700 mt-1">{order.customerName}</p>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <StatusBadge status={orderDetails.status as StatusType} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm font-bold mb-2">
              <span className="text-slate-600 uppercase tracking-wide">{t('progress')}</span>
              <span className="text-slate-900 tabular-nums">
                {packedCount} / {items.length}
              </span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    progressPercent === 100
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
                }}
              />
            </div>
          </div>

          {/* Delivery Instructions if present */}
          {orderDetails.deliveryAddress && orderDetails.deliveryAddress.includes('instructions') && (
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800 font-medium">
                  {orderDetails.deliveryAddress}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Checklist */}
      <div className="p-6 space-y-2">
        {items.map((item, index) => {
          const isPacked = packedItems.has(item.sku);

          return (
            <button
              key={item.sku}
              onClick={() => toggleItemPacked(item.sku)}
              className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-all duration-200 hover:shadow-sm ${
                isPacked
                  ? 'bg-green-50 border-green-300 hover:bg-green-100'
                  : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400'
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: 'itemSlide 0.3s ease-out',
              }}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0">
                {isPacked ? (
                  <CheckSquare className="h-7 w-7 text-green-600 transition-transform hover:scale-110" />
                ) : (
                  <Square className="h-7 w-7 text-slate-400 transition-transform hover:scale-110" />
                )}
              </div>

              {/* Item Details */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`font-mono font-bold text-sm tracking-tight ${
                      isPacked ? 'text-slate-500 line-through' : 'text-slate-900'
                    }`}
                  >
                    {item.sku}
                  </span>
                  <span className="font-bold text-base text-orange-600 tabular-nums whitespace-nowrap">
                    {item.quantity}
                    <span className="text-xs text-slate-600 ml-1">units</span>
                  </span>
                </div>
                <p
                  className={`text-sm font-medium mt-0.5 ${
                    isPacked ? 'text-slate-500 line-through' : 'text-slate-700'
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
      <div className="px-6 pb-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          {t('packingNotes')}
        </label>
        <textarea
          value={packingNotes}
          onChange={(e) => setPackingNotes(e.target.value)}
          placeholder={t('addNotes')}
          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
          rows={2}
        />
      </div>

      {/* Action Button */}
      <div className="p-6 pt-2">
        <button
          onClick={handleMarkReady}
          disabled={!allItemsPacked || markOrderReadyMutation.isPending}
          className={`w-full py-4 px-6 rounded-lg font-bold uppercase tracking-wider text-sm transition-all duration-200 ${
            allItemsPacked && !markOrderReadyMutation.isPending
              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {markOrderReadyMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('marking')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send className="h-5 w-5" />
              {t('markAsReady')}
            </span>
          )}
        </button>

        {!allItemsPacked && (
          <p className="text-xs text-center text-slate-500 mt-3 font-medium">
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
