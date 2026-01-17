'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface SettingsPageHeaderProps {
  /** Page icon from lucide-react */
  icon: LucideIcon;
  /** Translation key for title (relative to namespace) */
  titleKey: string;
  /** Translation key for description (relative to namespace) */
  descriptionKey: string;
  /** Translation namespace (defaults to 'settings') */
  namespace?: string;
  /** Right-side slot for inline actions */
  children?: ReactNode;
}

export function SettingsPageHeader({
  icon: Icon,
  titleKey,
  descriptionKey,
  namespace = 'settings',
  children,
}: SettingsPageHeaderProps) {
  const t = useTranslations(namespace);
  const tSettings = useTranslations('settings');
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="mb-6 md:mb-8">
      {/* Back Link */}
      <Link
        href={`/${locale}/settings`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {tSettings('common.backToSettings')}
      </Link>

      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-2xl md:text-4xl font-bold">{t(titleKey)}</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {t(descriptionKey)}
          </p>
        </div>

        {/* Right-side actions */}
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
