'use client';

import Link from 'next/link';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@joho-erp/ui';
import {
  Building2,
  Truck,
  Puzzle,
  Users,
  Bell,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

interface SettingsCategory {
  id: string;
  icon: typeof Building2;
  titleKey: string;
  descriptionKey: string;
  href: string;
  available: boolean;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const params = useParams();
  const locale = params.locale as string;

  const categories: SettingsCategory[] = [
    {
      id: 'company',
      icon: Building2,
      titleKey: 'categories.company',
      descriptionKey: 'categories.companyDescription',
      href: `/${locale}/settings/company`,
      available: true,
    },
    {
      id: 'delivery',
      icon: Truck,
      titleKey: 'categories.delivery',
      descriptionKey: 'categories.deliveryDescription',
      href: `/${locale}/settings/delivery`,
      available: true,
    },
    {
      id: 'integrations',
      icon: Puzzle,
      titleKey: 'categories.integrations',
      descriptionKey: 'categories.integrationsDescription',
      href: `/${locale}/settings/integrations`,
      available: true,
    },
    {
      id: 'users',
      icon: Users,
      titleKey: 'categories.users',
      descriptionKey: 'categories.usersDescription',
      href: `/${locale}/settings/users`,
      available: true,
    },
    {
      id: 'notifications',
      icon: Bell,
      titleKey: 'categories.notifications',
      descriptionKey: 'categories.notificationsDescription',
      href: `/${locale}/settings/notifications`,
      available: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-muted-foreground" />
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Settings Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon;

          return (
            <Link key={category.id} href={category.href}>
              <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary mb-3">
                      <Icon className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {t(category.titleKey)}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t(category.descriptionKey)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
