import { getTranslations } from 'next-intl/server';
import { ProductList } from './components/product-list';
import { H2, Muted } from '@joho-erp/ui';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <H2 className="text-2xl md:text-3xl">{t('products.title')}</H2>
          <Muted className="mt-1">{t('products.subtitle')}</Muted>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <ProductList />
      </div>
    </div>
  );
}
