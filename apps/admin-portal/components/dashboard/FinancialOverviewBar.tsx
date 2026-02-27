'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@joho-erp/ui';
import { formatAUD } from '@joho-erp/shared';
import { TrendingUp, TrendingDown, Minus, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { RevenueSparkline } from './RevenueChart';

export type Period = 'today' | 'week' | 'month';

interface FinancialOverviewBarProps {
  revenue: number; // in cents
  previousRevenue: number;
  percentChange: number;
  pendingPayments: number; // in cents
  pendingPaymentsCount: number;
  period: Period;
  onPeriodChange: (period: Period) => void;
  trendData?: Array<{ date: string; revenue: number }>;
  onTrendClick?: () => void;
  onRevenueClick?: () => void;
  isLoading?: boolean;
}

export function FinancialOverviewBar({
  revenue,
  percentChange,
  pendingPayments,
  pendingPaymentsCount,
  period,
  onPeriodChange,
  trendData,
  onTrendClick,
  onRevenueClick,
  isLoading,
}: FinancialOverviewBarProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');

  const getPeriodLabel = (p: Period) => {
    const labels: Record<Period, string> = {
      today: t('periodSelector.today'),
      week: t('periodSelector.thisWeek'),
      month: t('periodSelector.thisMonth'),
    };
    return labels[p];
  };

  const getComparisonLabel = (p: Period) => {
    const labels: Record<Period, string> = {
      today: t('financialOverview.vsYesterday'),
      week: t('financialOverview.vsLastWeek'),
      month: t('financialOverview.vsLastMonth'),
    };
    return labels[p];
  };

  const TrendIcon = percentChange > 0 ? TrendingUp : percentChange < 0 ? TrendingDown : Minus;
  const trendColor = percentChange > 0 ? 'text-success' : percentChange < 0 ? 'text-destructive' : 'text-muted-foreground';

  if (isLoading) {
    return (
      <div className="financial-overview-bar animate-pulse">
        <div className="financial-metric-card">
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="financial-metric-card">
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="financial-metric-card flex-[1.5]">
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="financial-period-selector">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="financial-overview-bar">
      {/* Revenue Metric */}
      <div
        className="financial-metric-card financial-metric-primary"
        onClick={() => onRevenueClick?.()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRevenueClick?.();
          }
        }}
      >
        <div className="financial-metric-icon">
          <DollarSign className="h-4 w-4" />
        </div>
        <div className="financial-metric-content">
          <div className="financial-metric-value">
            {formatAUD(revenue)}
          </div>
          <div className="financial-metric-label">{getPeriodLabel(period)}</div>
          <div className={`financial-metric-trend ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{percentChange > 0 ? '+' : ''}{percentChange}%</span>
            <span className="text-muted-foreground text-[10px]">{getComparisonLabel(period)}</span>
          </div>
        </div>
      </div>

      {/* Pending Payments */}
      <div
        className="financial-metric-card"
        onClick={() => router.push('/orders?status=delivered')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push('/orders?status=delivered');
          }
        }}
      >
        <div className="financial-metric-icon text-warning">
          <CreditCard className="h-4 w-4" />
        </div>
        <div className="financial-metric-content">
          <div className="financial-metric-value">
            {formatAUD(pendingPayments)}
          </div>
          <div className="financial-metric-label">{t('financialOverview.pendingPayments')}</div>
          {pendingPaymentsCount > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {t('financialOverview.invoiceCount', { count: pendingPaymentsCount })}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Trend Sparkline */}
      <div
        className="financial-metric-card financial-metric-chart"
        onClick={onTrendClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTrendClick?.();
          }
        }}
      >
        <div className="financial-metric-content flex-1">
          <div className="financial-metric-label mb-1">{t('revenueChart.days7')}</div>
          <div className="h-12">
            {trendData && trendData.length > 0 ? (
              <RevenueSparkline data={trendData} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                {t('revenueChart.noData')}
              </div>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{t('revenueChart.clickToExpand')}</div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="financial-period-selector">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <Calendar className="h-3 w-3" />
          <span className="text-[10px] uppercase tracking-wide">{t('periodSelector.label')}</span>
        </div>
        <Select value={period} onValueChange={(value) => onPeriodChange(value as Period)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t('periodSelector.today')}</SelectItem>
            <SelectItem value="week">{t('periodSelector.thisWeek')}</SelectItem>
            <SelectItem value="month">{t('periodSelector.thisMonth')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
