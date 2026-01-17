'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Grid3X3 } from 'lucide-react';
import { BottomSheet, cn } from '@joho-erp/ui';
import { api } from '@/trpc/client';

interface CategorySheetProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function CategorySheet({ open, onClose, locale }: CategorySheetProps) {
  const t = useTranslations('navigation');
  const router = useRouter();
  const { data: categories } = api.category.getAll.useQuery();

  const handleCategorySelect = (categoryId?: string) => {
    onClose();
    if (categoryId) {
      router.push(`/${locale}/products?category=${categoryId}`);
    } else {
      router.push(`/${locale}/products`);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.6, 0.9]}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('browseByCategory')}</h2>
        </div>

        {/* Category List */}
        <div className="space-y-1">
          {/* All Products Option */}
          <button
            onClick={() => handleCategorySelect()}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg',
              'text-left font-medium text-neutral-900',
              'hover:bg-neutral-100 active:bg-neutral-200 transition-colors'
            )}
          >
            <span>{t('allProducts')}</span>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </button>

          {/* Separator */}
          <div className="h-px bg-border mx-4" />

          {/* Category Items */}
          {categories?.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-lg',
                'text-left text-neutral-700',
                'hover:bg-neutral-100 active:bg-neutral-200 transition-colors'
              )}
            >
              <span>{category.name}</span>
              <ChevronRight className="h-5 w-5 text-neutral-400" />
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
