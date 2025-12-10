'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { H1, Muted } from '@joho-erp/ui';
import { OrderSummary } from './components/order-summary';

export default function CheckoutPage() {
  const t = useTranslations('checkout');

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <H1 className="text-2xl md:text-3xl">{t('title')}</H1>
        <Muted>{t('subtitle')}</Muted>
      </div>

      <OrderSummary />
    </div>
  );
}
