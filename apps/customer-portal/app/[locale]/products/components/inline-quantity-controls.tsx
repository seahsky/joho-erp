'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, useToast, cn } from '@joho-erp/ui';
import { Minus, Plus, Loader2, Check, X } from 'lucide-react';
import { api } from '@/trpc/client';

const MAX_QUANTITY = 999;
const MIN_QUANTITY = 1;

interface InlineQuantityControlsProps {
  productId: string;
  productName: string;
  currentQuantity: number; // 0 if not in cart
  disabled: boolean; // credit status, onboarding
  className?: string;
}

export function InlineQuantityControls({
  productId,
  productName,
  currentQuantity,
  disabled,
  className,
}: InlineQuantityControlsProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(currentQuantity.toString());
  const [isPending, setIsPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const utils = api.useUtils();

  // Sync input value when currentQuantity changes externally
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(currentQuantity.toString());
    }
  }, [currentQuantity, isEditing]);

  // Auto-focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Add to cart mutation
  const addToCart = api.cart.addItem.useMutation({
    onMutate: async (variables) => {
      setIsPending(true);
      await utils.cart.getCart.cancel();

      // Optimistic update
      const previousCart = utils.cart.getCart.getData();
      utils.cart.getCart.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          itemCount: old.itemCount + variables.quantity,
        };
      });

      return { previousCart };
    },
    onSuccess: () => {
      toast({
        title: t('cart.messages.addedToCart'),
        description: t('cart.messages.productAddedToCart', { productName }),
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        utils.cart.getCart.setData(undefined, context.previousCart);
      }
      toast({
        title: t('cart.messages.errorAddingToCart'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsPending(false);
      void utils.cart.getCart.invalidate();
    },
  });

  // Update quantity mutation
  const updateQuantity = api.cart.updateQuantity.useMutation({
    onMutate: async (variables) => {
      setIsPending(true);
      await utils.cart.getCart.cancel();

      // Optimistic update
      const previousCart = utils.cart.getCart.getData();
      utils.cart.getCart.setData(undefined, (old) => {
        if (!old) return old;
        const quantityDiff = variables.quantity - currentQuantity;
        return {
          ...old,
          itemCount: old.itemCount + quantityDiff,
          items: old.items.map((item) =>
            item.productId === variables.productId
              ? { ...item, quantity: variables.quantity }
              : item
          ),
        };
      });

      return { previousCart };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        utils.cart.getCart.setData(undefined, context.previousCart);
      }
      toast({
        title: t('cart.messages.errorUpdatingQuantity'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsPending(false);
      void utils.cart.getCart.invalidate();
    },
  });

  // Remove item mutation
  const removeItem = api.cart.removeItem.useMutation({
    onMutate: async (variables) => {
      setIsPending(true);
      await utils.cart.getCart.cancel();

      // Optimistic update
      const previousCart = utils.cart.getCart.getData();
      utils.cart.getCart.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          itemCount: old.itemCount - currentQuantity,
          items: old.items.filter((item) => item.productId !== variables.productId),
        };
      });

      return { previousCart };
    },
    onSuccess: () => {
      toast({
        title: t('cart.messages.removedFromCart'),
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        utils.cart.getCart.setData(undefined, context.previousCart);
      }
      toast({
        title: t('cart.messages.errorRemovingItem'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsPending(false);
      void utils.cart.getCart.invalidate();
    },
  });

  const handleAdd5 = () => {
    const newQty = currentQuantity + 5;
    if (currentQuantity === 0) {
      addToCart.mutate({ productId, quantity: 5 });
    } else {
      updateQuantity.mutate({ productId, quantity: Math.min(newQty, MAX_QUANTITY) });
    }
  };

  const handleSubtract5 = () => {
    const newQty = currentQuantity - 5;
    if (newQty <= 0) {
      removeItem.mutate({ productId });
    } else {
      updateQuantity.mutate({ productId, quantity: Math.max(newQty, MIN_QUANTITY) });
    }
  };

  const handleEnablePrecisionMode = () => {
    setIsEditing(true);
  };

  const handleSaveQuantity = () => {
    // Handle empty input - remove item from cart
    if (inputValue.trim() === '') {
      // Only remove if item is in cart
      if (currentQuantity > 0) {
        removeItem.mutate({ productId });
      }
      setIsEditing(false);
      return;
    }

    const newQty = parseInt(inputValue, 10);

    // If invalid number or 0, remove item if in cart
    if (isNaN(newQty) || newQty <= 0) {
      if (currentQuantity > 0) {
        removeItem.mutate({ productId });
      } else {
        toast({
          title: t('products.quantity.invalid'),
          description: t('products.quantity.precision'),
          variant: 'destructive',
        });
        setInputValue(currentQuantity.toString());
      }
      setIsEditing(false);
      return;
    }

    // Validate range
    if (newQty > MAX_QUANTITY) {
      toast({
        title: t('products.quantity.invalid'),
        description: t('products.quantity.precision'),
        variant: 'destructive',
      });
      setInputValue(currentQuantity.toString());
      setIsEditing(false);
      return;
    }

    // No change, just exit edit mode
    if (newQty === currentQuantity) {
      setIsEditing(false);
      return;
    }

    // Update quantity
    if (currentQuantity === 0) {
      addToCart.mutate({ productId, quantity: newQty });
    } else {
      updateQuantity.mutate({ productId, quantity: newQty });
    }

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setInputValue(currentQuantity.toString());
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty for typing convenience
    if (value === '') {
      setInputValue('');
      return;
    }
    // Only allow numbers
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue <= MAX_QUANTITY) {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveQuantity();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // State 1: Not in cart (just +5 button)
  if (currentQuantity === 0 && !isEditing) {
    return (
      <div className={cn('flex items-center', className)}>
        <Button
          size="sm"
          onClick={handleAdd5}
          disabled={disabled || isPending}
          className="gap-1.5 px-4"
          title={t('products.quantity.add')}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {t('products.quantity.add5')}
        </Button>
      </div>
    );
  }

  // State 2: In cart (not editing) - show [-5] [qty] [+5]
  if (!isEditing) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSubtract5}
          disabled={disabled || isPending}
          className="h-9 w-9 p-0"
          title={t('products.quantity.remove5')}
          aria-label={t('products.quantity.remove5')}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
        </Button>

        <button
          onClick={handleEnablePrecisionMode}
          disabled={disabled || isPending}
          className={cn(
            'h-9 w-14 border-y-2 border-border font-bold text-sm transition-colors',
            'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title={t('products.quantity.edit')}
          aria-label={t('products.quantity.current', { count: currentQuantity })}
        >
          {currentQuantity}
        </button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd5}
          disabled={disabled || isPending}
          className="h-9 w-9 p-0"
          title={t('products.quantity.add5')}
          aria-label={t('products.quantity.add5')}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    );
  }

  // State 3: Precision edit mode - show [-5] [input] [+5]
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={handleSubtract5}
        disabled={disabled || isPending}
        className="h-9 w-9 p-0"
        title={t('products.quantity.remove5')}
        aria-label={t('products.quantity.remove5')}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <input
        ref={inputRef}
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled || isPending}
        min={MIN_QUANTITY}
        max={MAX_QUANTITY}
        className={cn(
          'h-9 w-14 border-2 border-primary text-center font-bold text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'transition-all duration-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        placeholder={currentQuantity.toString()}
        aria-label={t('products.quantity.precision')}
      />

      <Button
        size="sm"
        variant="outline"
        onClick={handleSaveQuantity}
        disabled={disabled || isPending || inputValue === currentQuantity.toString()}
        className={cn(
          'h-9 w-9 p-0',
          'border-green-500 hover:bg-green-50 hover:border-green-600',
          'disabled:border-border disabled:hover:bg-transparent'
        )}
        title={t('products.quantity.confirm')}
        aria-label={t('products.quantity.confirm')}
      >
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleCancelEdit}
        disabled={disabled || isPending}
        className="h-9 w-9 p-0 hover:bg-muted"
        title={t('products.quantity.cancel')}
        aria-label={t('products.quantity.cancel')}
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleAdd5}
        disabled={disabled || isPending}
        className="h-9 w-9 p-0"
        title={t('products.quantity.add5')}
        aria-label={t('products.quantity.add5')}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
