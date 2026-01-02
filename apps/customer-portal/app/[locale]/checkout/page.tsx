'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { OrderSummary } from './components/order-summary';
import { PageHeader } from '@/components/page-header';

export default function CheckoutPage() {
  const t = useTranslations('checkout');

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <OrderSummary />
      </div>
    </div>
  );
}
