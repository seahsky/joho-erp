'use client';

import * as React from 'react';
import { AdminMobileDrawer } from './admin-mobile-drawer';
import { MobileAppBar } from '@jimmy-beef/ui';
import { useIsMobileOrTablet } from '@jimmy-beef/ui';
import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { Button } from '@jimmy-beef/ui';

export function AdminLayoutWrapper({
  children,
  locale,
  title,
}: {
  children: React.ReactNode;
  locale: string;
  title?: string;
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const isMobileOrTablet = useIsMobileOrTablet();

  return (
    <>
      {isMobileOrTablet && (
        <>
          <MobileAppBar
            title={title}
            onMenuClick={() => setDrawerOpen(true)}
            rightActions={
              <>
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                </Button>
                <UserButton />
              </>
            }
          />
          <AdminMobileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            locale={locale}
          />
        </>
      )}
      <main>{children}</main>
    </>
  );
}
