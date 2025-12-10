'use client';

import * as React from 'react';
import { CustomerBottomNav } from './customer-bottom-nav';
import { CustomerDesktopNav } from './customer-desktop-nav';
import { useIsMobileOrTablet } from '@joho-erp/ui';

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
      {!isMobileOrTablet && <CustomerDesktopNav locale={locale} />}
      <main className={isMobileOrTablet ? 'pb-16' : ''}>
        {children}
      </main>
      {isMobileOrTablet && <CustomerBottomNav locale={locale} />}
    </>
  );
}
