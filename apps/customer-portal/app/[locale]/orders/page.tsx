import { getTranslations } from 'next-intl/server';
import { OrderList } from './components/order-list';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <OrderList />
      </div>
    </div>
  );
}
