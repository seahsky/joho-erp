'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, useToast, cn } from '@joho-erp/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface MiniCartItemProps {
  item: {
    productId: string;
    sku: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number; // in cents
    subtotal: number; // in cents
    hasCustomPricing: boolean;
  };
}

export function MiniCartItem({ item }: MiniCartItemProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const utils = api.useUtils();
  const [isHovered, setIsHovered] = React.useState(false);

  const updateQuantity = api.cart.updateQuantity.useMutation({
    onSuccess: () => {
      void utils.cart.getCart.invalidate();
    },
    onError: () => {
      toast({
        title: t('cart.messages.errorUpdatingQuantity'),
        variant: 'destructive',
      });
    },
  });

  const removeItem = api.cart.removeItem.useMutation({
    onSuccess: () => {
      toast({
        title: t('cart.messages.removedFromCart'),
      });
      void utils.cart.getCart.invalidate();
    },
    onError: () => {
      toast({
        title: t('cart.messages.errorRemovingItem'),
        variant: 'destructive',
      });
    },
  });

  const handleIncrease = () => {
    updateQuantity.mutate({
      productId: item.productId,
      quantity: item.quantity + 1,
    });
  };

  const handleDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity.mutate({
        productId: item.productId,
        quantity: item.quantity - 1,
      });
    }
  };

  const handleRemove = () => {
    removeItem.mutate({ productId: item.productId });
  };

  const isPending = updateQuantity.isPending || removeItem.isPending;

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 py-4',
        'border-b border-neutral-100 last:border-b-0',
        'transition-all duration-200',
        isHovered && 'bg-neutral-50/50 -mx-2 px-2 rounded-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
          {item.productName}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-neutral-500">
            {formatAUD(item.unitPrice)}
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-xs text-neutral-400">
            {item.unit}
          </span>
          {item.hasCustomPricing && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="text-xs text-emerald-600 font-medium">
                Special Price
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center">
        <div className={cn(
          'flex items-center gap-1 p-1 rounded-xl',
          'bg-neutral-100/80 border border-neutral-200/60'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-lg',
              'hover:bg-white hover:shadow-sm',
              'transition-all duration-150',
              'disabled:opacity-40'
            )}
            onClick={handleDecrease}
            disabled={item.quantity <= 1 || isPending}
            aria-label={t('products.decreaseQuantity')}
          >
            <Minus className="h-4 w-4 text-neutral-600" />
          </Button>

          <span className={cn(
            'w-10 text-center text-sm font-semibold text-neutral-800',
            'tabular-nums'
          )}>
            {item.quantity}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 rounded-lg',
              'hover:bg-white hover:shadow-sm',
              'transition-all duration-150',
              'disabled:opacity-40'
            )}
            onClick={handleIncrease}
            disabled={isPending}
            aria-label={t('products.increaseQuantity')}
          >
            <Plus className="h-4 w-4 text-neutral-600" />
          </Button>
        </div>
      </div>

      {/* Subtotal & Remove */}
      <div className="flex flex-col items-end gap-1.5 min-w-[72px]">
        <span className="text-sm font-semibold text-neutral-900 tabular-nums">
          {formatAUD(item.subtotal)}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-11 px-3 -mr-2',
            'text-neutral-400 hover:text-destructive',
            'hover:bg-destructive/10',
            'transition-all duration-200',
            'opacity-0 group-hover:opacity-100',
            isHovered && 'opacity-100'
          )}
          onClick={handleRemove}
          disabled={isPending}
          aria-label={t('miniCart.removeItem')}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-medium">{t('miniCart.removeItem')}</span>
        </Button>
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-[hsl(0,67%,35%)] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
