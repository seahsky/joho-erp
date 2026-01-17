'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, Grid3X3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Button,
  cn,
} from '@joho-erp/ui';
import { api } from '@/trpc/client';

interface CategoryDropdownProps {
  locale: string;
  className?: string;
}

export function CategoryDropdown({ locale, className }: CategoryDropdownProps) {
  const t = useTranslations('navigation');
  const router = useRouter();
  const { data: categories } = api.category.getAll.useQuery();

  const handleCategorySelect = (categoryId?: string) => {
    if (categoryId) {
      router.push(`/${locale}/products?category=${categoryId}`);
    } else {
      router.push(`/${locale}/products`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'gap-2 px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100',
            className
          )}
        >
          <Grid3X3 className="h-4 w-4" />
          {t('categories')}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => handleCategorySelect()}
          className="cursor-pointer font-medium"
        >
          {t('allProducts')}
        </DropdownMenuItem>
        {categories && categories.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {categories.map((category) => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className="cursor-pointer"
              >
                {category.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
