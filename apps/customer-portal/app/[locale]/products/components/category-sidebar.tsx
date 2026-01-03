'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { m, AnimatePresence } from 'framer-motion';
import { cn, Button, Badge, useIsMobileOrTablet } from '@joho-erp/ui';
import { LayoutGrid, ChevronRight, X } from 'lucide-react';
import type { ProductCategory } from '@joho-erp/shared';

// Category color mapping for visual distinction
const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Beef: 'bg-red-500',
  Pork: 'bg-pink-500',
  Chicken: 'bg-amber-500',
  Lamb: 'bg-orange-500',
  Processed: 'bg-purple-500',
};

// Get initials for category
function getCategoryInitial(category: ProductCategory): string {
  return category.charAt(0).toUpperCase();
}

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

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductCount,
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

  // Desktop: Full sidebar
  if (!isMobileOrTablet) {
    return (
      <aside className="w-56 flex-shrink-0">
        <div className="sticky top-4">
          <nav className="space-y-1">
            {/* Header */}
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 mb-3">
              {t('products.sidebar.categories')}
            </h3>

            {/* All Products */}
            <button
              onClick={() => handleCategorySelect(undefined)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg',
                !selectedCategory ? 'bg-primary-foreground/20' : 'bg-muted'
              )}>
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">{t('products.sidebar.allProducts')}</span>
              <Badge variant={!selectedCategory ? 'secondary' : 'outline'} className="text-xs">
                {totalProductCount}
              </Badge>
            </button>

            {/* Category List */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm',
                  CATEGORY_COLORS[category.id] || 'bg-gray-500'
                )}>
                  {getCategoryInitial(category.id)}
                </span>
                <span className="flex-1 text-left">{category.name}</span>
                <Badge
                  variant={selectedCategory === category.id ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {category.count}
                </Badge>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    );
  }

  // Mobile: Slim sidebar with expand functionality
  return (
    <>
      {/* Slim Sidebar (Collapsed) */}
      <aside className="w-14 flex-shrink-0">
        <div className="sticky top-4">
          <nav className="space-y-1">
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center justify-center py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label={t('products.sidebar.expandCategories')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* All Products Icon */}
            <button
              onClick={() => handleCategorySelect(undefined)}
              className={cn(
                'w-full flex items-center justify-center py-2.5 rounded-lg transition-all duration-200',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-muted'
              )}
              aria-label={t('products.sidebar.allProducts')}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>

            {/* Category Icons */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={cn(
                  'w-full flex items-center justify-center py-2.5 rounded-lg transition-all duration-200',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted'
                )}
                aria-label={category.name}
              >
                <span className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm',
                  CATEGORY_COLORS[category.id] || 'bg-gray-500'
                )}>
                  {getCategoryInitial(category.id)}
                </span>
              </button>
            ))}
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
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsExpanded(false)}
            />

            {/* Expanded Sidebar */}
            <m.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 shadow-2xl overflow-y-auto"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{t('products.sidebar.categories')}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                    className="rounded-full"
                    aria-label={t('products.sidebar.collapseCategories')}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Category List */}
                <nav className="space-y-1">
                  {/* All Products */}
                  <button
                    onClick={() => handleCategorySelect(undefined)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200',
                      !selectedCategory
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-lg',
                      !selectedCategory ? 'bg-primary-foreground/20' : 'bg-muted'
                    )}>
                      <LayoutGrid className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-left">{t('products.sidebar.allProducts')}</span>
                    <Badge variant={!selectedCategory ? 'secondary' : 'outline'}>
                      {totalProductCount}
                    </Badge>
                  </button>

                  {/* Categories */}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200',
                        selectedCategory === category.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold',
                        CATEGORY_COLORS[category.id] || 'bg-gray-500'
                      )}>
                        {getCategoryInitial(category.id)}
                      </span>
                      <span className="flex-1 text-left">{category.name}</span>
                      <Badge variant={selectedCategory === category.id ? 'secondary' : 'outline'}>
                        {category.count}
                      </Badge>
                    </button>
                  ))}
                </nav>
              </div>
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
