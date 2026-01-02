import { getTranslations } from 'next-intl/server';
import { ProductList } from './components/product-list';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

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
        <ProductList />
      </div>
    </div>
  );
}
