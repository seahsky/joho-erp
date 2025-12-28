'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@joho-erp/ui';
import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/trpc/client';
import { TimePeriodSelector } from './TimePeriodSelector';

type Granularity = 'daily' | 'weekly' | 'monthly';

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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="stockIn"
                  name={t('stockMovement.stockIn')}
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="stockOut"
                  name={t('stockMovement.stockOut')}
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
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
