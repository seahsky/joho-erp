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

interface CategoryChipBarProps {
  categories: Category[];
  selectedCategory: string | undefined;
  onSelectCategory: (categoryId: string | undefined) => void;
  totalProductCount: number;
}

export function CategoryChipBar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductCount,
}: CategoryChipBarProps) {
  const t = useTranslations();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent, categoryId: string | undefined) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectCategory(categoryId);
    }
  };

  // Auto-scroll to selected category
  React.useEffect(() => {
    if (scrollContainerRef.current && selectedCategory) {
      const selectedButton = scrollContainerRef.current.querySelector(
        `[data-category-id="${selectedCategory}"]`
      );
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedCategory]);

  return (
    <div className="sticky top-[60px] md:top-[60px] z-40 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-3">
        {/* Category Chips - Horizontal Scrollable */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
          role="tablist"
          aria-label={t('products.categoryBar.title')}
        >
          {/* All Products Chip */}
          <button
            onClick={() => onSelectCategory(undefined)}
            onKeyDown={(e) => handleKeyDown(e, undefined)}
            role="tab"
            aria-selected={!selectedCategory}
            aria-label={t('products.categoryBar.allProducts')}
            className={cn(
              'flex items-center gap-2 px-4 h-10 rounded-full border-2 transition-all duration-200',
              'font-medium text-sm whitespace-nowrap flex-shrink-0',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              !selectedCategory
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            {t('products.categoryBar.allProducts')}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-md text-xs font-semibold',
                !selectedCategory
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {totalProductCount}
            </span>
          </button>

          {/* Category Chips */}
          {categories.map((category) => (
            <button
              key={category.id}
              data-category-id={category.id}
              onClick={() => !category.disabled && onSelectCategory(category.id)}
              onKeyDown={(e) => !category.disabled && handleKeyDown(e, category.id)}
              disabled={category.disabled}
              role="tab"
              aria-selected={selectedCategory === category.id}
              aria-label={`${category.name} (${category.count})`}
              className={cn(
                'flex items-center gap-2 px-4 h-10 rounded-full border-2 transition-all duration-200',
                'font-medium text-sm whitespace-nowrap flex-shrink-0',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                category.disabled
                  ? 'opacity-40 cursor-not-allowed bg-muted/30 border-border/50'
                  : selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50 active:scale-95'
              )}
            >
              {category.name}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-xs font-semibold',
                  category.disabled
                    ? 'bg-muted text-muted-foreground/50'
                    : selectedCategory === category.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {category.count}
              </span>
            </button>
          ))}
        </div>

        {/* Clear Filter (shown when category selected) */}
        {selectedCategory && (
          <div className="mt-2 flex items-center">
            <button
              onClick={() => onSelectCategory(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {t('products.categoryBar.clearFilter')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
