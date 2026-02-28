'use client';

import dynamic from 'next/dynamic';

interface TrendDataPoint {
  date: string;
  revenue: number;
  orderCount?: number;
}

interface RevenueSparklineProps {
  data: TrendDataPoint[];
}

interface RevenueChartProps {
  data: TrendDataPoint[];
  showOrderCount?: boolean;
}

const RevenueSparklineInner = dynamic(
  () => import('./RevenueChartInner').then((mod) => mod.RevenueSparklineInner),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded bg-muted" />,
  }
);

const RevenueChartInner = dynamic(
  () => import('./RevenueChartInner').then((mod) => mod.RevenueChartInner),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded bg-muted" />,
  }
);

// Compact sparkline for the financial overview bar
export function RevenueSparkline({ data }: RevenueSparklineProps) {
  return <RevenueSparklineInner data={data} />;
}

// Full chart for the modal
export function RevenueChart({ data, showOrderCount = false }: RevenueChartProps) {
  return <RevenueChartInner data={data} showOrderCount={showOrderCount} />;
}
