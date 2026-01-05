'use client';

import * as React from 'react';
import { useAuth } from '@clerk/nextjs';
import { CustomerBottomNav } from './customer-bottom-nav';
import { CustomerDesktopNav } from './customer-desktop-nav';
import { CustomerMobileHeader } from './customer-mobile-header';
import { MotionProvider } from './motion-provider';
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
      {isSignedIn && isMobileOrTablet && <CustomerMobileHeader locale={locale} />}
      <main className={isSignedIn && isMobileOrTablet ? 'pt-14 pb-16' : ''}>
        <MotionProvider>{children}</MotionProvider>
      </main>
      {isSignedIn && isMobileOrTablet && <CustomerBottomNav locale={locale} />}
    </>
  );
}
