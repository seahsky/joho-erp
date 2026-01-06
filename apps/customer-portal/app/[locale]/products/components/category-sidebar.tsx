'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn, useIsMobileOrTablet } from '@joho-erp/ui';
import { LayoutGrid } from 'lucide-react';
import type { ProductCategory } from '@joho-erp/shared';

interface CategoryWithCount {
  id: ProductCategory;
  name: string;
  count: number;
  disabled?: boolean;
}

interface CategorySidebarProps {
  categories: CategoryWithCount[];
  selectedCategory: ProductCategory | undefined;
  onSelectCategory: (category: ProductCategory | undefined) => void;
  totalProductCount: number;
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductCount: _totalProductCount,
}: CategorySidebarProps) {
  const t = useTranslations();
  const isMobileOrTablet = useIsMobileOrTablet();

  // Desktop: Compact narrow sidebar
  if (!isMobileOrTablet) {
    return (
      <aside className="w-[70px] flex-shrink-0">
        <div className="sticky top-4">
          <nav className="flex flex-col">
            {/* All Products */}
            <button
              onClick={() => onSelectCategory(undefined)}
              className={cn(
                'relative w-full py-3 px-1 text-center transition-all duration-200',
                'hover:opacity-70 active:scale-[0.98]',
                !selectedCategory
                  ? 'text-foreground after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-amber-500 after:rounded-full'
                  : 'text-muted-foreground'
              )}
              aria-label={t('products.sidebar.allProducts')}
              aria-current={!selectedCategory ? 'page' : undefined}
            >
              <LayoutGrid className="h-4 w-4 mx-auto mb-1" />
              <span className="block text-[10px] font-medium leading-tight">
                {t('products.sidebar.allProducts').split(' ')[0]}
              </span>
            </button>

            {/* Divider */}
            <div className="mx-3 my-2 border-t border-border/50" />

            {/* Category List */}
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;
              const isDisabled = category.disabled;
              return (
                <button
                  key={category.id}
                  onClick={() => !isDisabled && onSelectCategory(category.id)}
                  disabled={isDisabled}
                  className={cn(
                    'relative w-full py-3 px-1 text-center transition-all duration-200',
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:opacity-70 active:scale-[0.98]',
                    isSelected && !isDisabled
                      ? 'text-foreground after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-amber-500 after:rounded-full'
                      : 'text-muted-foreground'
                  )}
                  aria-label={category.name}
                  aria-current={isSelected ? 'page' : undefined}
                  aria-disabled={isDisabled}
                >
                  <span className="block text-xs font-medium leading-tight break-words">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    );
  }

  // Mobile: Compact sidebar with always-visible categories
  return (
    <aside className="w-[70px] flex-shrink-0">
      <div className="sticky top-4">
        <nav className="flex flex-col">
          {/* All Products */}
          <button
            onClick={() => onSelectCategory(undefined)}
            className={cn(
              'relative w-full py-3 px-1 text-center transition-all duration-200',
              'hover:opacity-70 active:scale-[0.98]',
              !selectedCategory
                ? 'text-foreground after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-amber-500 after:rounded-full'
                : 'text-muted-foreground'
            )}
            aria-label={t('products.sidebar.allProducts')}
            aria-current={!selectedCategory ? 'page' : undefined}
          >
            <LayoutGrid className="h-4 w-4 mx-auto mb-1" />
            <span className="block text-[10px] font-medium leading-tight">
              {t('products.sidebar.allProducts').split(' ')[0]}
            </span>
          </button>

          {/* Divider */}
          <div className="mx-3 my-2 border-t border-border/50" />

          {/* Category List */}
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            const isDisabled = category.disabled;
            return (
              <button
                key={category.id}
                onClick={() => !isDisabled && onSelectCategory(category.id)}
                disabled={isDisabled}
                className={cn(
                  'relative w-full py-3 px-1 text-center transition-all duration-200',
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:opacity-70 active:scale-[0.98]',
                  isSelected && !isDisabled
                    ? 'text-foreground after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-amber-500 after:rounded-full'
                    : 'text-muted-foreground'
                )}
                aria-label={category.name}
                aria-current={isSelected ? 'page' : undefined}
                aria-disabled={isDisabled}
              >
                <span className="block text-xs font-medium leading-tight break-words">
                  {category.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
