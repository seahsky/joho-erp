'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { m, AnimatePresence } from 'framer-motion';
import { cn, Button, useIsMobileOrTablet } from '@joho-erp/ui';
import { LayoutGrid, ChevronRight, X } from 'lucide-react';
import type { ProductCategory } from '@joho-erp/shared';

interface CategoryWithCount {
  id: ProductCategory;
  name: string;
  count: number;
}

interface CategorySidebarProps {
  categories: CategoryWithCount[];
  selectedCategory: ProductCategory | undefined;
  onSelectCategory: (category: ProductCategory | undefined) => void;
  totalProductCount: number;
}

// Get first character(s) for category initial
function getCategoryInitial(name: string): string {
  // For short names, use first char; for longer, use first 2 chars
  return name.length <= 4 ? name.charAt(0).toUpperCase() : name.slice(0, 2);
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductCount: _totalProductCount,
}: CategorySidebarProps) {
  const t = useTranslations();
  const isMobileOrTablet = useIsMobileOrTablet();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCategorySelect = (category: ProductCategory | undefined) => {
    onSelectCategory(category);
    if (isMobileOrTablet) {
      setIsExpanded(false);
    }
  };

  // Desktop: Compact narrow sidebar
  if (!isMobileOrTablet) {
    return (
      <aside className="w-[70px] flex-shrink-0">
        <div className="sticky top-4">
          <nav className="flex flex-col">
            {/* All Products */}
            <button
              onClick={() => handleCategorySelect(undefined)}
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
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={cn(
                    'relative w-full py-3 px-1 text-center transition-all duration-200',
                    'hover:opacity-70 active:scale-[0.98]',
                    isSelected
                      ? 'text-foreground after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-amber-500 after:rounded-full'
                      : 'text-muted-foreground'
                  )}
                  aria-label={category.name}
                  aria-current={isSelected ? 'page' : undefined}
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

  // Mobile: Slim sidebar with expand functionality
  return (
    <>
      {/* Always visible slim sidebar */}
      <aside className="w-14 flex-shrink-0">
        <div className="sticky top-4">
          <nav className="flex flex-col items-center gap-0.5">
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label={t('products.sidebar.expandCategories')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* All Products Icon */}
            <button
              onClick={() => handleCategorySelect(undefined)}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200',
                !selectedCategory
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              aria-label={t('products.sidebar.allProducts')}
              aria-current={!selectedCategory ? 'page' : undefined}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>

            {/* Divider */}
            <div className="w-6 my-1 border-t border-border/50" />

            {/* Category Icons */}
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-200',
                    isSelected
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  aria-label={category.name}
                  aria-current={isSelected ? 'page' : undefined}
                >
                  {getCategoryInitial(category.name)}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Expanded Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setIsExpanded(false)}
            />

            {/* Expanded Sidebar */}
            <m.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="fixed left-0 top-0 bottom-0 w-56 bg-background z-50 shadow-xl overflow-y-auto"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('products.sidebar.categories')}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                    className="h-8 w-8 rounded-full"
                    aria-label={t('products.sidebar.collapseCategories')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Category List */}
                <nav className="flex flex-col gap-1">
                  {/* All Products */}
                  <button
                    onClick={() => handleCategorySelect(undefined)}
                    className={cn(
                      'relative w-full py-2.5 px-3 text-left text-sm font-medium rounded-lg transition-all duration-200',
                      'hover:bg-muted active:scale-[0.99]',
                      !selectedCategory
                        ? 'text-foreground bg-amber-500/10 border-l-2 border-amber-500'
                        : 'text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <LayoutGrid className="h-4 w-4 flex-shrink-0" />
                      <span>{t('products.sidebar.allProducts')}</span>
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-border/50" />

                  {/* Categories */}
                  {categories.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className={cn(
                          'relative w-full py-2.5 px-3 text-left text-sm font-medium rounded-lg transition-all duration-200',
                          'hover:bg-muted active:scale-[0.99]',
                          isSelected
                            ? 'text-foreground bg-amber-500/10 border-l-2 border-amber-500'
                            : 'text-muted-foreground'
                        )}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
