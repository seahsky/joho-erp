import { getTranslations } from 'next-intl/server';
import { ProductList } from './components/product-list';

export default async function ProductsPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl md:text-3xl font-bold">{t('products.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('products.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <ProductList />
      </div>
    </div>
  );
}
