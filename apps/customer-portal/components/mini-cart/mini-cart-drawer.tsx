'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button, useLockBodyScroll, cn } from '@joho-erp/ui';
import { MiniCartContent } from './mini-cart-content';

interface MiniCartDrawerProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function MiniCartDrawer({ open, onClose, locale }: MiniCartDrawerProps) {
  const t = useTranslations('miniCart');
  const tCommon = useTranslations('common');
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

  return (
    <>
      {/* Backdrop with smooth fade */}
      <div
        className={cn(
          'fixed inset-0 z-40',
          'bg-gradient-to-br from-black/30 via-black/40 to-black/50',
          'backdrop-blur-[2px]',
          'transition-all duration-500 ease-out',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer with slide animation */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'w-[420px] max-w-[92vw]',
          'flex flex-col',
          'transform transition-all duration-500',
          open
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0',
          // Smooth easing
          'ease-[cubic-bezier(0.32,0.72,0,1)]'
        )}
        style={{
          transitionProperty: 'transform, opacity',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
      >
        {/* Premium drawer container */}
        <div className={cn(
          'h-full flex flex-col',
          'bg-gradient-to-b from-white via-white to-neutral-50/80',
          'shadow-[-8px_0_32px_-4px_rgba(0,0,0,0.12)]',
          'border-l border-neutral-200/40'
        )}>
          {/* Decorative top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[hsl(0,67%,40%)] via-[hsl(0,67%,35%)] to-[hsl(0,50%,30%)]" />

          {/* Close button with refined styling */}
          <div className="absolute top-5 right-5 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn(
                'h-9 w-9 rounded-full',
                'bg-neutral-100/80 backdrop-blur-sm',
                'border border-neutral-200/60',
                'hover:bg-white hover:border-neutral-300',
                'hover:shadow-sm',
                'transition-all duration-200',
                'group'
              )}
              aria-label={tCommon('close')}
            >
              <X className="h-4 w-4 text-neutral-500 group-hover:text-neutral-700 transition-colors" />
            </Button>
          </div>

          {/* Content area with refined padding */}
          <div className="flex-1 overflow-hidden p-6 pt-16">
            <MiniCartContent locale={locale} onClose={onClose} />
          </div>

          {/* Subtle bottom shadow for depth */}
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-neutral-100/50 to-transparent" />
        </div>
      </div>
    </>
  );
}
