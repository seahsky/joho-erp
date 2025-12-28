'use client';

import { Button } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';

type Granularity = 'daily' | 'weekly' | 'monthly';

interface TimePeriodSelectorProps {
  value: Granularity;
  onChange: (value: Granularity) => void;
}

export function TimePeriodSelector({ value, onChange }: TimePeriodSelectorProps) {
  const t = useTranslations('inventory.stats');

  return (
    <div className="flex gap-2">
      <Button
        variant={value === 'daily' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('daily')}
      >
        {t('periods.daily')}
      </Button>
      <Button
        variant={value === 'weekly' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('weekly')}
      >
        {t('periods.weekly')}
      </Button>
      <Button
        variant={value === 'monthly' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('monthly')}
      >
        {t('periods.monthly')}
      </Button>
    </div>
  );
}
