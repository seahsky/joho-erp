import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { ProductList } from './components/product-list';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@joho-erp/ui';

export const dynamic = 'force-dynamic';

// Loading fallback for the product list
function ProductListFallback() {
  return (
    <div className="space-y-0 border border-border rounded-xl overflow-hidden divide-y divide-border">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-background">
          <Skeleton className="h-16 w-16 md:h-20 md:w-20 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      ))}
    </div>
  );
}

export default async function ProductsPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Suspense fallback={<ProductListFallback />}>
          <ProductList />
        </Suspense>
      </div>
    </div>
  );
}
