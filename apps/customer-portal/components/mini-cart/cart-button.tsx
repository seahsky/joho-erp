'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingCart } from 'lucide-react';
import { Button, cn } from '@joho-erp/ui';
import { api } from '@/trpc/client';

interface CartButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'desktop' | 'mobile';
}

export function CartButton({ onClick, className, variant = 'desktop' }: CartButtonProps) {
  const t = useTranslations('miniCart');
  const tNav = useTranslations('navigation');
  const { data: cart } = api.cart.getCart.useQuery();
  const [isAnimating, setIsAnimating] = React.useState(false);
  const prevCountRef = React.useRef(0);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  // Trigger animation when item count increases
  React.useEffect(() => {
    if (itemCount > prevCountRef.current && prevCountRef.current > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 800);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  const ariaLabel = itemCount > 0
    ? t('cartWithItems', { count: itemCount })
    : t('title');

  if (variant === 'mobile') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'relative flex flex-col items-center justify-center p-2',
          'text-neutral-600 hover:text-primary transition-colors duration-200',
          className
        )}
        aria-label={ariaLabel}
      >
        <div className={cn(
          'relative',
          isAnimating && 'animate-cart-bounce'
        )}>
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <span
              className={cn(
                'absolute -top-2 -right-2.5 h-5 min-w-5 flex items-center justify-center',
                'px-1.5 text-[11px] font-semibold text-white',
                'bg-gradient-to-br from-[hsl(0,67%,42%)] to-[hsl(0,67%,32%)]',
                'rounded-full shadow-sm',
                'ring-2 ring-white',
                isAnimating && 'animate-badge-pop'
              )}
            >
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-xs mt-1 font-medium">{tNav('cart')}</span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'relative gap-2.5 px-4 py-2.5 rounded-xl',
        'bg-gradient-to-b from-neutral-50 to-neutral-100/80',
        'border border-neutral-200/60',
        'hover:from-white hover:to-neutral-50',
        'hover:border-[hsl(0,67%,35%)]/20',
        'hover:shadow-[0_4px_12px_-2px_hsl(0,67%,35%,0.12)]',
        'transition-all duration-300 ease-out',
        isAnimating && 'animate-cart-glow',
        className
      )}
      aria-label={ariaLabel}
    >
      <div className="relative">
        <ShoppingCart className={cn(
          'h-[18px] w-[18px] text-neutral-700 transition-all duration-300',
          isAnimating && 'text-[hsl(0,67%,35%)] scale-110'
        )} />
        {itemCount > 0 && (
          <span
            className={cn(
              'absolute -top-2 -right-2.5 h-[18px] min-w-[18px] flex items-center justify-center',
              'px-1 text-[10px] font-bold text-white',
              'bg-gradient-to-br from-[hsl(0,67%,42%)] to-[hsl(0,67%,30%)]',
              'rounded-full shadow-sm',
              isAnimating && 'animate-badge-pop'
            )}
          >
            {itemCount}
          </span>
        )}
      </div>
    </Button>
  );
}

// Enhanced animation keyframes
export function CartButtonStyles() {
  return (
    <style jsx global>{`
      @keyframes cart-glow {
        0% {
          box-shadow: 0 0 0 0 hsl(0 67% 35% / 0);
          transform: scale(1);
        }
        20% {
          box-shadow: 0 0 0 4px hsl(0 67% 35% / 0.15);
          transform: scale(1.02);
        }
        50% {
          box-shadow: 0 0 20px 8px hsl(0 67% 35% / 0.08);
          transform: scale(1.04);
        }
        100% {
          box-shadow: 0 4px 12px -2px hsl(0 67% 35% / 0.12);
          transform: scale(1);
        }
      }

      @keyframes cart-bounce {
        0%, 100% {
          transform: translateY(0) scale(1);
        }
        15% {
          transform: translateY(-4px) scale(1.05);
        }
        30% {
          transform: translateY(0) scale(1);
        }
        45% {
          transform: translateY(-2px) scale(1.02);
        }
        60% {
          transform: translateY(0) scale(1);
        }
      }

      @keyframes badge-pop {
        0% {
          transform: scale(1);
        }
        25% {
          transform: scale(1.35);
        }
        50% {
          transform: scale(0.9);
        }
        75% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }

      .animate-cart-glow {
        animation: cart-glow 0.8s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .animate-cart-bounce {
        animation: cart-bounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .animate-badge-pop {
        animation: badge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    `}</style>
  );
}
