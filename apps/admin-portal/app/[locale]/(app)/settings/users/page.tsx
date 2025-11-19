'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@jimmy-beef/ui';
import { Users, Construction } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function UserManagementSettingsPage() {
  const t = useTranslations('settings.users');

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Construction className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2">Coming Soon</CardTitle>
              <CardDescription>
                User management settings are currently under development.
                <br />
                This page will allow you to manage admin users, roles, and permissions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
