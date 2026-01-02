'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  DaysOnHandBadge,
} from '@joho-erp/ui';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { TimePeriodSelector } from './TimePeriodSelector';

type Granularity = 'daily' | 'weekly' | 'monthly';

export function ProductTurnoverTable() {
  const t = useTranslations('inventory.stats');
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const { data, isLoading } = api.inventoryStats.getProductTurnoverMetrics.useQuery({
    granularity,
    limit: 10,
  });

  // Days on hand badge uses consolidated DaysOnHandBadge component

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
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
              <RefreshCw className="h-5 w-5" />
              {t('turnover.title')}
            </CardTitle>
            <CardDescription>{t('turnover.description')}</CardDescription>
          </div>
          <TimePeriodSelector value={granularity} onChange={setGranularity} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('turnover.product')}</TableHead>
                <TableHead className="text-right">{t('turnover.currentStock')}</TableHead>
                <TableHead className="text-right">{t('turnover.totalSold')}</TableHead>
                <TableHead className="text-right">{t('turnover.velocity')}</TableHead>
                <TableHead className="text-right">{t('turnover.daysOnHand')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">{item.productSku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.currentStock.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.totalSold.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.velocity.toFixed(2)}/day
                  </TableCell>
                  <TableCell className="text-right"><DaysOnHandBadge days={item.daysOnHand} /></TableCell>
                </TableRow>
              ))}
              {(!data || data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t('turnover.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
