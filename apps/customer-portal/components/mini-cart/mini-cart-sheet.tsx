'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button, useLockBodyScroll, cn } from '@joho-erp/ui';
import { MiniCartContent } from './mini-cart-content';

interface MiniCartSheetProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function MiniCartSheet({ open, onClose, locale }: MiniCartSheetProps) {
  const t = useTranslations();
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);

  useLockBodyScroll(open);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const dragDistance = currentY - startY;
    const threshold = 80;

    if (dragDistance > threshold) {
      onClose();
    }

    setStartY(0);
    setCurrentY(0);
  };

  const translateY = isDragging ? Math.max(0, currentY - startY) : 0;

  return (
    <>
      {/* Backdrop with smooth fade */}
      <div
        className={cn(
          'fixed inset-0 z-40',
          'bg-gradient-to-b from-black/20 via-black/35 to-black/50',
          'backdrop-blur-[2px]',
          'transition-all duration-400 ease-out',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet with spring animation */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50',
          'flex flex-col',
          'transform',
          isDragging
            ? 'transition-none'
            : 'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          height: '78vh',
          maxHeight: '78vh',
          transform: open ? `translateY(${translateY}px)` : 'translateY(100%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('miniCart.title')}
      >
        {/* Premium sheet container */}
        <div className={cn(
          'h-full flex flex-col',
          'bg-gradient-to-b from-white via-white to-neutral-50/90',
          'rounded-t-[28px]',
          'shadow-[0_-12px_48px_-8px_rgba(0,0,0,0.18)]'
        )}>
          {/* Decorative top accent - integrated with handle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] rounded-b-full bg-gradient-to-r from-transparent via-[hsl(0,67%,35%)] to-transparent opacity-60" />

          {/* Drag handle area */}
          <div
            className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className={cn(
              'w-10 h-1 rounded-full',
              'bg-neutral-300',
              'transition-all duration-200',
              isDragging && 'w-12 bg-neutral-400'
            )} />
          </div>

          {/* Close button */}
          <div className="absolute top-3 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn(
                'h-8 w-8 rounded-full',
                'bg-neutral-100/80 backdrop-blur-sm',
                'border border-neutral-200/60',
                'hover:bg-white hover:border-neutral-300',
                'active:scale-95',
                'transition-all duration-200',
                'group'
              )}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4 text-neutral-500 group-hover:text-neutral-700 transition-colors" />
            </Button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden px-5 pb-8">
            <MiniCartContent locale={locale} onClose={onClose} />
          </div>

          {/* Safe area padding for devices with home indicator */}
          <div className="h-safe-area-inset-bottom" />
        </div>
      </div>
    </>
  );
}
