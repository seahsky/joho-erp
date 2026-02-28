'use client';

import * as React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Ban } from 'lucide-react';
import { CustomerBottomNav } from './customer-bottom-nav';
import { CustomerDesktopNav } from './customer-desktop-nav';
import { CustomerMobileHeader } from './customer-mobile-header';
import { MotionProvider } from './motion-provider';
import { useIsMobileOrTablet } from '@joho-erp/ui';
import { api } from '@/trpc/client';

export function CustomerLayoutWrapper({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const isMobileOrTablet = useIsMobileOrTablet();
  const { isSignedIn } = useAuth();
  const t = useTranslations('suspension');
  const { data: onboardingStatus } = api.customer.getOnboardingStatus.useQuery(
    undefined,
    { enabled: !!isSignedIn }
  );
  const isSuspended = onboardingStatus?.status === 'suspended';

  return (
    <>
      {isSignedIn && !isMobileOrTablet && <CustomerDesktopNav locale={locale} />}
      {isSignedIn && isMobileOrTablet && <CustomerMobileHeader locale={locale} />}
      {isSignedIn && isSuspended && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2">
          <Ban className="h-4 w-4 flex-shrink-0" />
          {t('banner')}
        </div>
      )}
      <main className={isSignedIn && isMobileOrTablet ? 'pt-14 pb-16' : ''}>
        <MotionProvider>{children}</MotionProvider>
      </main>
      {isSignedIn && isMobileOrTablet && <CustomerBottomNav locale={locale} />}
    </>
  );
}
