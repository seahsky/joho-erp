'use client';

import { UserProfile } from '@clerk/nextjs';
import { User } from 'lucide-react';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

export default function ProfileSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={User}
        titleKey="profile.title"
        descriptionKey="profile.subtitle"
      />

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
