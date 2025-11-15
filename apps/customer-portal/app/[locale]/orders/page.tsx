import { getTranslations } from 'next-intl/server';
import { OrderList } from './components/order-list';
import { H2, Muted } from '@jimmy-beef/ui';

export default async function OrdersPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <H2 className="text-2xl md:text-3xl">{t('orders.title')}</H2>
          <Muted className="mt-1">{t('orders.subtitle')}</Muted>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <OrderList />
      </div>
    </div>
  );
}
