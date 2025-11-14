'use client';

import * as React from 'react';
import { CustomerBottomNav } from './customer-bottom-nav';
import { useIsMobileOrTablet } from '@jimmy-beef/ui';

export function CustomerLayoutWrapper({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const isMobileOrTablet = useIsMobileOrTablet();

  return (
    <>
      <main className={isMobileOrTablet ? 'pb-16' : ''}>
        {children}
      </main>
      {isMobileOrTablet && <CustomerBottomNav locale={locale} />}
    </>
  );
}
