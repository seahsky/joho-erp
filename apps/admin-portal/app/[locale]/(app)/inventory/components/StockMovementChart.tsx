'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@joho-erp/ui';
import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { api } from '@/trpc/client';
import { TimePeriodSelector } from './TimePeriodSelector';

type Granularity = 'daily' | 'weekly' | 'monthly';

const StockMovementChartInner = dynamic(
  () => import('./StockMovementChartInner').then((mod) => mod.StockMovementChartInner),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded bg-muted" />,
  }
);

export function StockMovementChart() {
  const t = useTranslations('inventory.stats');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const { data, isLoading } = api.inventoryStats.getStockMovementTrends.useQuery({
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
              <TrendingUp className="h-5 w-5" />
              {t('stockMovement.title')}
            </CardTitle>
            <CardDescription>{t('stockMovement.description')}</CardDescription>
          </div>
          <TimePeriodSelector value={granularity} onChange={setGranularity} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data && data.length > 0 ? (
            <StockMovementChartInner
              data={data}
              stockInLabel={t('stockMovement.stockIn')}
              stockOutLabel={t('stockMovement.stockOut')}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t('stockMovement.noData')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
