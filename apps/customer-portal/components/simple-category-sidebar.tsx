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

interface SimpleCategorySidebarProps {
  categories: Category[];
  selectedCategory: string | undefined;
  onSelectCategory: (categoryId: string | undefined) => void;
  totalProductCount: number;
}

export function SimpleCategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductCount,
}: SimpleCategorySidebarProps) {
  const t = useTranslations();

  const handleKeyDown = (
    e: React.KeyboardEvent,
    categoryId: string | undefined
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectCategory(categoryId);
    }
  };

  return (
    <aside className="w-[200px] min-w-[200px] border-r border-border bg-muted/30 h-[calc(100vh-60px)] sticky top-[60px] p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-foreground">
          {t('products.sidebar.categories')}
        </h2>
        <div className="h-0.5 w-10 bg-primary mt-2" />
      </div>

      {/* Category List */}
      <nav role="navigation" aria-label={t('products.sidebar.categories')}>
        <ul className="space-y-1" role="list">
          {/* All Products */}
          <li>
            <button
              onClick={() => onSelectCategory(undefined)}
              onKeyDown={(e) => handleKeyDown(e, undefined)}
              aria-current={!selectedCategory ? 'page' : undefined}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors text-left',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                !selectedCategory
                  ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary -ml-0.5 pl-[calc(0.75rem-2px)]'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="text-sm truncate">
                {t('products.sidebar.allProducts')}
              </span>
              <span className="text-xs tabular-nums ml-2 flex-shrink-0">
                {totalProductCount}
              </span>
            </button>
          </li>

          {/* Categories */}
          {categories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() =>
                  !category.disabled && onSelectCategory(category.id)
                }
                onKeyDown={(e) =>
                  !category.disabled && handleKeyDown(e, category.id)
                }
                disabled={category.disabled}
                aria-current={
                  selectedCategory === category.id ? 'page' : undefined
                }
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors text-left',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  category.disabled && 'opacity-40 cursor-not-allowed',
                  selectedCategory === category.id
                    ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary -ml-0.5 pl-[calc(0.75rem-2px)]'
                    : !category.disabled &&
                        'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="text-sm truncate">{category.name}</span>
                <span className="text-xs tabular-nums ml-2 flex-shrink-0">
                  {category.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
