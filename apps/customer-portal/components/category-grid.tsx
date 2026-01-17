'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, Grid3X3 } from 'lucide-react';
import { Card, CardContent, cn } from '@joho-erp/ui';
import { api } from '@/trpc/client';

interface CategoryGridProps {
  locale: string;
}

export function CategoryGrid({ locale }: CategoryGridProps) {
  const t = useTranslations('navigation');
  const { data: categories, isLoading } = api.category.getAll.useQuery();

  if (isLoading) {
    return (
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <Grid3X3 className="h-6 w-6 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold">{t('shopByCategory')}</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-neutral-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <Grid3X3 className="h-6 w-6 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold">{t('shopByCategory')}</h2>
        </div>

        {/* Category Cards Grid */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {/* All Products Card */}
          <Link href={`/${locale}/products`}>
            <Card className={cn(
              'h-full transition-all duration-200',
              'hover:shadow-md hover:border-primary/30',
              'active:scale-[0.98]',
              'cursor-pointer'
            )}>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="font-medium text-neutral-900">
                  {t('allProducts')}
                </span>
                <ChevronRight className="h-5 w-5 text-neutral-400" />
              </CardContent>
            </Card>
          </Link>

          {/* Category Cards */}
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${locale}/products?category=${category.id}`}
            >
              <Card className={cn(
                'h-full transition-all duration-200',
                'hover:shadow-md hover:border-primary/30',
                'active:scale-[0.98]',
                'cursor-pointer'
              )}>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium text-neutral-700">
                    {category.name}
                  </span>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
