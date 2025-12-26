'use client';

import { UserProfile } from '@clerk/nextjs';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ProfileSettingsPage() {
  const t = useTranslations('settings.profile');

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <User className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Clerk UserProfile Component */}
      <div className="flex justify-center">
        <UserProfile
          appearance={{
            elements: {
              rootBox: 'w-full max-w-4xl',
              card: 'shadow-none border border-border rounded-lg',
              navbar: 'hidden md:flex',
              navbarMobileMenuButton: 'md:hidden',
              pageScrollBox: 'p-0',
            },
          }}
        />
      </div>
    </div>
  );
}
