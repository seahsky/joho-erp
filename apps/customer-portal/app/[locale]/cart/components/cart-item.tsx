'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, H4, Muted, useToast } from '@joho-erp/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface CartItemProps {
  item: {
    productId: string;
    sku: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number; // in cents
    basePrice: number; // in cents
    subtotal: number; // in cents
    hasCustomPricing: boolean;
  };
}

export function CartItem({ item }: CartItemProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const utils = api.useUtils();

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

  // Item total is already calculated by backend
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Info */}
          <div className="flex-1">
            <H4 className="text-base md:text-lg mb-1">{item.productName}</H4>
            <Muted className="text-sm">SKU: {item.sku}</Muted>
            <div className="mt-2">
              <p className="text-sm font-medium">{formatAUD(item.unitPrice)}</p>
              <Muted className="text-xs">{t('products.perUnit', { unit: item.unit })}</Muted>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleDecrease}
                disabled={item.quantity <= 1 || updateQuantity.isPending}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleIncrease}
                disabled={updateQuantity.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Item Total */}
            <div className="text-right">
              <p className="font-semibold">{formatAUD(item.subtotal)}</p>
              <Muted className="text-xs">{t('cart.itemTotal')}</Muted>
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removeItem.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('cart.buttons.removeItem')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
