'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@joho-erp/ui';
import { DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { api } from '@/trpc/client';
import { TimePeriodSelector } from './TimePeriodSelector';

type Granularity = 'daily' | 'weekly' | 'monthly';

const InventoryValueChartInner = dynamic(
  () => import('./InventoryValueChartInner').then((mod) => mod.InventoryValueChartInner),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded bg-muted" />,
  }
);

export function InventoryValueChart() {
  const t = useTranslations('inventory.stats');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const { data, isLoading } = api.inventoryStats.getInventoryValueHistory.useQuery({
    granularity,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('inventoryValue.title')}
            </CardTitle>
            <CardDescription>{t('inventoryValue.description')}</CardDescription>
          </div>
          <TimePeriodSelector value={granularity} onChange={setGranularity} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data && data.length > 0 ? (
            <InventoryValueChartInner data={data} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t('inventoryValue.noData')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
