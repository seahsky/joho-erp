'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { BottomSheet, Button, Badge } from '@joho-erp/ui';
import { Filter, X, Check } from 'lucide-react';
import { cn } from '@joho-erp/ui';
import type { ProductCategory } from '@joho-erp/shared';

interface CategoryFilterProps {
  categories: ProductCategory[];
  selectedCategory: ProductCategory | undefined;
  onSelectCategory: (category: ProductCategory | undefined) => void;
  productCount: number;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  productCount,
}: CategoryFilterProps) {
  const t = useTranslations();
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleCategorySelect = (category: ProductCategory | undefined) => {
    onSelectCategory(category);
    setMobileFilterOpen(false);
  };

  const getCategoryTranslation = (category: ProductCategory) => {
    const categoryKey = category.toLowerCase();
    return t(`categories.${categoryKey}`);
  };

  return (
    <>
      {/* Desktop: Horizontal Chip Bar */}
      <div className="hidden md:block space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('products.filterByCategory')}
          </h3>
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectCategory(undefined)}
              className="h-11 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t('products.clearFilters')}
            </Button>
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* All Products Chip */}
          <button
            onClick={() => onSelectCategory(undefined)}
            className={cn(
              'px-4 min-h-11 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
              'border-2 hover:scale-105 active:scale-95',
              !selectedCategory
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-background text-foreground border-border hover:border-primary/50'
            )}
          >
            {t('products.allProducts')}
            <span className="ml-2 text-xs opacity-75">({productCount})</span>
          </button>

          {/* Category Chips */}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={cn(
                'px-4 min-h-11 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                'border-2 hover:scale-105 active:scale-95',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              )}
            >
              {getCategoryTranslation(category)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Filter Button + Bottom Sheet */}
      <div className="md:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileFilterOpen(true)}
          className="w-full justify-between h-12 rounded-xl border-2"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">
              {selectedCategory ? getCategoryTranslation(selectedCategory) : t('products.allProducts')}
            </span>
          </span>
          {selectedCategory && (
            <Badge variant="secondary" className="ml-2">
              1
            </Badge>
          )}
        </Button>

        <BottomSheet
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          snapPoints={[0.5, 0.75]}
          defaultSnap={0}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-xl font-bold">{t('products.filterByCategory')}</h3>
              {selectedCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCategorySelect(undefined)}
                  className="h-11 text-sm"
                >
                  {t('products.clearFilters')}
                </Button>
              )}
            </div>

            {/* Category List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {/* All Products Option */}
              <button
                onClick={() => handleCategorySelect(undefined)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200',
                  'border-2 text-left',
                  !selectedCategory
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-background hover:bg-muted border-border'
                )}
              >
                <span className="font-medium">{t('products.allProducts')}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm opacity-75">({productCount})</span>
                  {!selectedCategory && <Check className="h-5 w-5" />}
                </div>
              </button>

              {/* Category Options */}
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200',
                    'border-2 text-left',
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-background hover:bg-muted border-border'
                  )}
                >
                  <span className="font-medium">{getCategoryTranslation(category)}</span>
                  {selectedCategory === category && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      </div>
    </>
  );
}
