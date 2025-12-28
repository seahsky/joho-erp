'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Skeleton } from '@joho-erp/ui';
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

type ComparisonType = 'week' | 'month';

interface ComparisonCardProps {
  label: string;
  current: number;
  previous: number;
  change: number;
  unit?: string;
}

function ComparisonCard({ label, current, previous, change, unit = '' }: ComparisonCardProps) {
  const getChangeColor = () => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getChangeIcon = () => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const formatChange = () => {
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${change.toFixed(1)}%`;
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">
          {current.toFixed(1)}
          {unit}
        </span>
        <span className={`flex items-center text-sm ${getChangeColor()}`}>
          {getChangeIcon()}
          {formatChange()}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        vs {previous.toFixed(1)}
        {unit} previous
      </p>
    </div>
  );
}

export function ComparisonAnalytics() {
  const t = useTranslations('inventory.stats');
  const [comparisonType, setComparisonType] = useState<ComparisonType>('week');

  const { data, isLoading } = api.inventoryStats.getComparisonMetrics.useQuery({
    comparisonType,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
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
              <GitCompare className="h-5 w-5" />
              {t('comparison.title')}
            </CardTitle>
            <CardDescription>{t('comparison.description')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={comparisonType === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonType('week')}
            >
              {t('comparison.weekOverWeek')}
            </Button>
            <Button
              variant={comparisonType === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonType('month')}
            >
              {t('comparison.monthOverMonth')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ComparisonCard
            label={t('comparison.stockIn')}
            current={data?.current.stockIn || 0}
            previous={data?.previous.stockIn || 0}
            change={data?.changes.stockInChange || 0}
          />
          <ComparisonCard
            label={t('comparison.stockOut')}
            current={data?.current.stockOut || 0}
            previous={data?.previous.stockOut || 0}
            change={data?.changes.stockOutChange || 0}
          />
          <ComparisonCard
            label={t('comparison.transactions')}
            current={data?.current.transactions || 0}
            previous={data?.previous.transactions || 0}
            change={data?.changes.transactionsChange || 0}
          />
          <ComparisonCard
            label={t('comparison.netMovement')}
            current={data?.current.netMovement || 0}
            previous={data?.previous.netMovement || 0}
            change={data?.changes.netMovementChange || 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}
