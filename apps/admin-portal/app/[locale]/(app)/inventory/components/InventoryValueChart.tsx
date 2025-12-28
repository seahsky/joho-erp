'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@joho-erp/ui';
import { DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import { TimePeriodSelector } from './TimePeriodSelector';

type Granularity = 'daily' | 'weekly' | 'monthly';

export function InventoryValueChart() {
  const t = useTranslations('inventory.stats');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const { data, isLoading } = api.inventoryStats.getInventoryValueHistory.useQuery({
    granularity,
  });

  // Custom tooltip formatter for currency
  const formatTooltipValue = (value: number | undefined) => {
    if (value === undefined) return '';
    return formatAUD(value);
  };

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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatAUD(value)}
                  width={80}
                />
                <Tooltip
                  formatter={formatTooltipValue}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="rgba(59, 130, 246, 0.2)"
                />
              </AreaChart>
            </ResponsiveContainer>
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
