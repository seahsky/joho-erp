'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@joho-erp/ui';

interface Category {
  id: string;
  name: string;
  count: number;
  disabled: boolean;
}

interface MobileCategorySidebarProps {
  categories: Category[];
  selectedCategory: string | undefined;
  onSelectCategory: (categoryId: string | undefined) => void;
  totalProductCount: number;
}

export function MobileCategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductCount,
}: MobileCategorySidebarProps) {
  const t = useTranslations('products');

  return (
    <aside
      className="w-[60px] flex-shrink-0 sticky top-[50px] h-[calc(100vh-50px)] bg-muted/30 border-r border-border overflow-y-auto scrollbar-hide z-30"
      role="listbox"
      aria-label={t('categoryBar.title')}
    >
      <div className="flex flex-col py-2">
        {/* All Products Option */}
        <button
          onClick={() => onSelectCategory(undefined)}
          role="option"
          aria-selected={!selectedCategory}
          className={cn(
            'flex flex-col items-center justify-center px-1 py-3 transition-colors duration-150',
            'text-center min-h-[72px]',
            'active:bg-muted/50',
            !selectedCategory
              ? 'border-l-2 border-primary bg-primary/10 font-medium'
              : 'border-l-2 border-transparent text-foreground'
          )}
        >
          <span
            className={cn(
              'text-xs leading-tight line-clamp-2 break-words w-full px-0.5',
              !selectedCategory && 'font-medium'
            )}
          >
            {t('sidebar.allProducts')}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">
            ({totalProductCount})
          </span>
        </button>

        {/* Category Items */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            role="option"
            aria-selected={selectedCategory === category.id}
            className={cn(
              'flex flex-col items-center justify-center px-1 py-3 transition-colors duration-150',
              'text-center min-h-[72px]',
              'active:bg-muted/50',
              selectedCategory === category.id
                ? 'border-l-2 border-primary bg-primary/10 font-medium'
                : 'border-l-2 border-transparent text-foreground'
            )}
          >
            <span
              className={cn(
                'text-xs leading-tight line-clamp-2 break-words w-full px-0.5',
                selectedCategory === category.id && 'font-medium'
              )}
            >
              {category.name}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              ({category.count})
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
