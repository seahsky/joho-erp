'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@jimmy-beef/ui';
import { Building2, Construction } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CompanySettingsPage() {
  const t = useTranslations('settings.company');

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-muted-foreground" />
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
                Company profile settings are currently under development.
                <br />
                This page will allow you to manage your business information, bank details, and company logo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
