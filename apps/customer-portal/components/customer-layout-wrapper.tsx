'use client';

import * as React from 'react';
import { useAuth } from '@clerk/nextjs';
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
  const { isSignedIn } = useAuth();

  return (
    <>
      {isSignedIn && !isMobileOrTablet && <CustomerDesktopNav locale={locale} />}
      <main className={isSignedIn && isMobileOrTablet ? 'pb-16' : ''}>
        {children}
      </main>
      {isSignedIn && isMobileOrTablet && <CustomerBottomNav locale={locale} />}
    </>
  );
}
