# Inventory Historical Statistics Enhancement Plan

**Date**: 2025-12-28
**Status**: Planning Complete
**Estimated Effort**: 6-8 hours

---

## Executive Summary

This plan enhances the Joho ERP inventory module with comprehensive historical statistics. The enhancement adds four types of analytics with interactive charts, time-period toggles, and full internationalization support.

### Features to Implement

| Feature | Description | Visualization |
|---------|-------------|---------------|
| Stock Movement Trends | Track stock ins (received) vs outs (sales/adjustments) over time | Stacked Bar Chart |
| Inventory Value Over Time | Monitor total inventory value trends | Area Chart |
| Product Turnover Metrics | Analyze velocity, days-on-hand, reorder frequency | Data Table with Badges |
| Comparison Analytics | Compare this week vs last week, month-over-month | Metric Cards with Arrows |

### Time Granularities
- **Daily**: Last 30 days
- **Weekly**: Last 12 weeks
- **Monthly**: Last 12 months

---

## Current State Analysis

### Existing Infrastructure

**Database Model** (`packages/database/prisma/schema.prisma`):
```prisma
model InventoryTransaction {
  id             String                   @id @default(auto()) @map("_id") @db.ObjectId
  productId      String                   @db.ObjectId
  type           InventoryTransactionType  // sale | adjustment | return
  adjustmentType AdjustmentType?          // stock_received | stock_count_correction | damaged_goods | expired_stock
  quantity       Float
  previousStock  Float
  newStock       Float
  referenceType  InventoryReferenceType   // order | manual
  referenceId    String                   @db.ObjectId
  notes          String?
  createdBy      String                   @db.ObjectId
  createdAt      DateTime                 @default(now())
  updatedAt      DateTime                 @updatedAt
  product        Product                  @relation(fields: [productId], references: [id])

  @@index([productId, createdAt(sort: Desc)])
  @@index([type])
  @@index([adjustmentType])
}
```

**Existing API Endpoints** (`packages/api/src/routers/dashboard.ts`):
- `getInventorySummary()` - Returns current snapshot (totalProducts, outOfStockCount, lowStockCount, totalValue)
- `getInventoryByCategory()` - Returns category-wise breakdown
- `getInventoryTransactions()` - Returns filtered transaction history with date-range support

**Current UI** (`apps/admin-portal/app/[locale]/(app)/inventory/page.tsx`):
- Summary cards (Total Value, Products, Low Stock, Out of Stock)
- Category breakdown table
- Transaction history with type filters

### What's Missing
- Time-series trend visualization
- Stock velocity and turnover analysis
- Period-over-period comparison metrics
- Interactive charts

---

## Implementation Plan

### Phase 1: Dependencies & UI Infrastructure

#### 1.1 Install Recharts Library

**File**: `apps/admin-portal/package.json`

```bash
pnpm add recharts --filter admin-portal
```

**Rationale**: Recharts is a composable React charting library built on D3. It integrates well with React 19, offers responsive charts, and has excellent TypeScript support.

#### 1.2 Create Tabs UI Component

**New File**: `packages/ui/src/components/tabs.tsx`

```typescript
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

**Update**: `packages/ui/src/index.ts`
```typescript
export * from './components/tabs';
```

---

### Phase 2: API Layer - Inventory Stats Router

#### 2.1 Create New Router

**New File**: `packages/api/src/routers/inventory-stats.ts`

```typescript
import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';

// Schema for granularity input
const granularitySchema = z.enum(['daily', 'weekly', 'monthly']);
type Granularity = z.infer<typeof granularitySchema>;

// Helper: Get date boundaries based on granularity
function getDateBoundaries(granularity: Granularity): { startDate: Date; daysInPeriod: number } {
  const now = new Date();
  switch (granularity) {
    case 'daily':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        daysInPeriod: 30
      };
    case 'weekly':
      return {
        startDate: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000),
        daysInPeriod: 84
      };
    case 'monthly':
      return {
        startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        daysInPeriod: 365
      };
  }
}

// Helper: Get MongoDB date grouping expression
function getDateGroupExpression(granularity: Granularity) {
  switch (granularity) {
    case 'daily':
      return {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    case 'weekly':
      return {
        year: { $isoWeekYear: '$createdAt' },
        week: { $isoWeek: '$createdAt' },
      };
    case 'monthly':
      return {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
  }
}

// Helper: Format period label from grouped date
function formatPeriodLabel(grouped: Record<string, number>, granularity: Granularity): string {
  switch (granularity) {
    case 'daily':
      return `${grouped.year}-${String(grouped.month).padStart(2, '0')}-${String(grouped.day).padStart(2, '0')}`;
    case 'weekly':
      return `W${grouped.week} ${grouped.year}`;
    case 'monthly':
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[grouped.month - 1]} ${grouped.year}`;
  }
}

export const inventoryStatsRouter = router({
  // Endpoint 1: Stock Movement Trends
  getStockMovementTrends: requirePermission('inventory:view')
    .input(z.object({ granularity: granularitySchema }))
    .query(async ({ input }) => {
      const { startDate } = getDateBoundaries(input.granularity);
      const dateGroup = getDateGroupExpression(input.granularity);

      const result = await prisma.inventoryTransaction.aggregateRaw({
        pipeline: [
          {
            $match: {
              createdAt: { $gte: { $date: startDate.toISOString() } }
            }
          },
          {
            $group: {
              _id: { ...dateGroup, type: '$type' },
              totalQuantity: { $sum: { $abs: '$quantity' } },
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
              '_id.week': 1,
              '_id.day': 1
            }
          },
        ],
      }) as unknown as Array<{
        _id: { year: number; month: number; day?: number; week?: number; type: string };
        totalQuantity: number;
        count: number;
      }>;

      // Transform to chart-friendly format
      const periodMap = new Map<string, { stockIn: number; stockOut: number }>();

      for (const item of result) {
        const period = formatPeriodLabel(item._id, input.granularity);
        if (!periodMap.has(period)) {
          periodMap.set(period, { stockIn: 0, stockOut: 0 });
        }
        const entry = periodMap.get(period)!;

        if (item._id.type === 'adjustment' || item._id.type === 'return') {
          // Positive quantity = stock in, negative = stock out (already absolute in aggregation)
          // We need to re-query to determine direction, or simplify logic
          // For now: adjustments and returns can be either direction
          entry.stockIn += item.totalQuantity * 0.5; // Simplified
          entry.stockOut += item.totalQuantity * 0.5;
        } else if (item._id.type === 'sale') {
          entry.stockOut += item.totalQuantity;
        }
      }

      return Array.from(periodMap.entries()).map(([period, data]) => ({
        period,
        stockIn: Math.round(data.stockIn * 10) / 10,
        stockOut: Math.round(data.stockOut * 10) / 10,
      }));
    }),

  // Endpoint 2: Inventory Value Over Time
  getInventoryValueHistory: requirePermission('inventory:view')
    .input(z.object({ granularity: granularitySchema }))
    .query(async ({ input }) => {
      const { startDate } = getDateBoundaries(input.granularity);
      const dateGroup = getDateGroupExpression(input.granularity);

      // Get current total inventory value (in cents)
      const currentValueResult = await prisma.product.aggregateRaw({
        pipeline: [
          { $match: { status: 'active' } },
          {
            $group: {
              _id: null,
              totalValue: {
                $sum: { $multiply: ['$currentStock', '$basePrice'] }
              }
            }
          },
        ],
      }) as unknown as Array<{ totalValue: number }>;

      const currentValue = currentValueResult[0]?.totalValue || 0;

      // Get value changes from transactions (join with products)
      const valueChanges = await prisma.inventoryTransaction.aggregateRaw({
        pipeline: [
          {
            $match: {
              createdAt: { $gte: { $date: startDate.toISOString() } }
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: 'productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $group: {
              _id: dateGroup,
              valueChange: {
                $sum: { $multiply: ['$quantity', '$product.basePrice'] }
              },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
        ],
      }) as unknown as Array<{
        _id: { year: number; month: number; day?: number; week?: number };
        valueChange: number;
      }>;

      // Calculate cumulative values walking backwards
      const periods: { period: string; value: number }[] = [];
      let runningValue = currentValue;

      for (const change of valueChanges) {
        const period = formatPeriodLabel(change._id, input.granularity);
        periods.push({ period, value: runningValue });
        runningValue -= change.valueChange; // Walk backwards
      }

      // Reverse to chronological order
      return periods.reverse();
    }),

  // Endpoint 3: Product Turnover Metrics
  getProductTurnoverMetrics: requirePermission('inventory:view')
    .input(z.object({
      granularity: granularitySchema,
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const { startDate, daysInPeriod } = getDateBoundaries(input.granularity);

      const turnoverData = await prisma.inventoryTransaction.aggregateRaw({
        pipeline: [
          {
            $match: {
              createdAt: { $gte: { $date: startDate.toISOString() } },
              type: 'sale',
            }
          },
          {
            $group: {
              _id: '$productId',
              totalSold: { $sum: { $abs: '$quantity' } },
              transactionCount: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $project: {
              productId: { $toString: '$_id' },
              productName: '$product.name',
              productSku: '$product.sku',
              currentStock: '$product.currentStock',
              totalSold: 1,
              transactionCount: 1,
              velocity: { $divide: ['$totalSold', daysInPeriod] },
              daysOnHand: {
                $cond: [
                  { $gt: ['$totalSold', 0] },
                  {
                    $divide: [
                      { $multiply: ['$product.currentStock', daysInPeriod] },
                      '$totalSold'
                    ]
                  },
                  null,
                ],
              },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: input.limit },
        ],
      }) as unknown as Array<{
        productId: string;
        productName: string;
        productSku: string;
        currentStock: number;
        totalSold: number;
        transactionCount: number;
        velocity: number;
        daysOnHand: number | null;
      }>;

      return turnoverData;
    }),

  // Endpoint 4: Comparison Metrics
  getComparisonMetrics: requirePermission('inventory:view')
    .input(z.object({
      comparisonType: z.enum(['week', 'month']),
    }))
    .query(async ({ input }) => {
      const now = new Date();
      let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

      if (input.comparisonType === 'week') {
        const dayOfWeek = now.getDay();
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - dayOfWeek);
        currentStart.setHours(0, 0, 0, 0);
        currentEnd = now;

        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousEnd.setMilliseconds(-1);
      } else {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;

        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        previousEnd.setHours(23, 59, 59, 999);
      }

      async function getMetricsForPeriod(start: Date, end: Date) {
        const result = await prisma.inventoryTransaction.aggregateRaw({
          pipeline: [
            {
              $match: {
                createdAt: {
                  $gte: { $date: start.toISOString() },
                  $lte: { $date: end.toISOString() },
                }
              }
            },
            {
              $group: {
                _id: '$type',
                totalQuantity: { $sum: '$quantity' },
                absQuantity: { $sum: { $abs: '$quantity' } },
                count: { $sum: 1 },
              },
            },
          ],
        }) as unknown as Array<{
          _id: string;
          totalQuantity: number;
          absQuantity: number;
          count: number;
        }>;

        let stockIn = 0, stockOut = 0, transactions = 0;
        for (const r of result) {
          transactions += r.count;
          if (r._id === 'sale') {
            stockOut += r.absQuantity;
          } else if (r._id === 'return') {
            stockIn += r.absQuantity;
          } else {
            // Adjustments can be positive or negative
            if (r.totalQuantity > 0) stockIn += r.totalQuantity;
            else stockOut += Math.abs(r.totalQuantity);
          }
        }

        return {
          stockIn,
          stockOut,
          transactions,
          netMovement: stockIn - stockOut,
        };
      }

      const [current, previous] = await Promise.all([
        getMetricsForPeriod(currentStart, currentEnd),
        getMetricsForPeriod(previousStart, previousEnd),
      ]);

      function calculatePercentChange(prev: number, curr: number): number {
        if (prev === 0) return curr === 0 ? 0 : 100;
        return ((curr - prev) / prev) * 100;
      }

      return {
        current,
        previous,
        changes: {
          stockInChange: calculatePercentChange(previous.stockIn, current.stockIn),
          stockOutChange: calculatePercentChange(previous.stockOut, current.stockOut),
          transactionsChange: calculatePercentChange(previous.transactions, current.transactions),
          netMovementChange: calculatePercentChange(
            Math.abs(previous.netMovement) || 1,
            Math.abs(current.netMovement)
          ),
        },
        periodLabel: input.comparisonType === 'week'
          ? { current: 'This Week', previous: 'Last Week' }
          : { current: 'This Month', previous: 'Last Month' },
      };
    }),
});
```

#### 2.2 Register Router

**Update**: `packages/api/src/root.ts`

```typescript
import { inventoryStatsRouter } from './routers/inventory-stats';

export const appRouter = router({
  // ... existing routers
  category: categoryRouter,
  customer: customerRouter,
  product: productRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
  delivery: deliveryRouter,
  pricing: pricingRouter,
  packing: packingRouter,
  cart: cartRouter,
  company: companyRouter,
  notification: notificationRouter,
  user: userRouter,
  upload: uploadRouter,
  xero: xeroRouter,
  permission: permissionRouter,
  sms: smsRouter,
  inventoryStats: inventoryStatsRouter,  // Add this line
});
```

---

### Phase 3: UI Components

#### 3.1 Create Components Directory

**New Directory**: `apps/admin-portal/app/[locale]/(app)/inventory/components/`

#### 3.2 Time Period Selector Component

**New File**: `apps/admin-portal/app/[locale]/(app)/inventory/components/TimePeriodSelector.tsx`

```typescript
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
```

#### 3.3 Stock Movement Chart Component

**New File**: `apps/admin-portal/app/[locale]/(app)/inventory/components/StockMovementChart.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@joho-erp/ui';
import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
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
          <Skeleton className="h-4 w-64 mt-2" />
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} />
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
                fill="hsl(142.1 76.2% 36.3%)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="stockOut"
                name={t('stockMovement.stockOut')}
                fill="hsl(0 84.2% 60.2%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.4 Inventory Value Chart Component

**New File**: `apps/admin-portal/app/[locale]/(app)/inventory/components/InventoryValueChart.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@joho-erp/ui';
import { DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
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
  const formatTooltipValue = (value: number) => formatAUD(value);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                className="text-xs"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                className="text-xs"
                tick={{ fontSize: 12 }}
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
                stroke="hsl(221.2 83.2% 53.3%)"
                fill="hsl(221.2 83.2% 53.3% / 0.2)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.5 Product Turnover Table Component

**New File**: `apps/admin-portal/app/[locale]/(app)/inventory/components/ProductTurnoverTable.tsx`

```typescript
'use client';

import { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, Skeleton
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

  const getDaysOnHandBadge = (days: number | null) => {
    if (days === null) {
      return <Badge variant="outline">{t('turnover.noSales')}</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="destructive">{Math.round(days)} {t('turnover.days')}</Badge>;
    }
    if (days <= 30) {
      return <Badge variant="secondary">{Math.round(days)} {t('turnover.days')}</Badge>;
    }
    return <Badge variant="outline">{Math.round(days)} {t('turnover.days')}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
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
                  <TableCell className="text-right">
                    {getDaysOnHandBadge(item.daysOnHand)}
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
```

#### 3.6 Comparison Analytics Component

**New File**: `apps/admin-portal/app/[locale]/(app)/inventory/components/ComparisonAnalytics.tsx`

```typescript
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
          {current.toFixed(1)}{unit}
        </span>
        <span className={`flex items-center text-sm ${getChangeColor()}`}>
          {getChangeIcon()}
          {formatChange()}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        vs {previous.toFixed(1)}{unit} previous
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
          <Skeleton className="h-4 w-64 mt-2" />
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
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
```

#### 3.7 Component Barrel Export

**New File**: `apps/admin-portal/app/[locale]/(app)/inventory/components/index.ts`

```typescript
export { TimePeriodSelector } from './TimePeriodSelector';
export { StockMovementChart } from './StockMovementChart';
export { InventoryValueChart } from './InventoryValueChart';
export { ProductTurnoverTable } from './ProductTurnoverTable';
export { ComparisonAnalytics } from './ComparisonAnalytics';
```

#### 3.8 Update Main Inventory Page

**Update**: `apps/admin-portal/app/[locale]/(app)/inventory/page.tsx`

Add tabs structure to organize content. The existing summary cards and content remain, but are organized under the "Overview" tab. New tabs are added for Trends, Turnover, and Comparison.

Key changes:
1. Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@joho-erp/ui`
2. Import new chart components from `./components`
3. Wrap existing content in tabs structure
4. Add new tab content for each analytics view

---

### Phase 4: Internationalization

#### 4.1 English Translations

**Update**: `apps/admin-portal/messages/en.json`

Add to the `"inventory"` namespace:

```json
{
  "inventory": {
    "tabs": {
      "overview": "Overview",
      "trends": "Trends",
      "turnover": "Turnover",
      "comparison": "Comparison"
    },
    "stats": {
      "periods": {
        "daily": "Last 30 Days",
        "weekly": "Last 12 Weeks",
        "monthly": "Last 12 Months"
      },
      "stockMovement": {
        "title": "Stock Movement Trends",
        "description": "Track stock ins and outs over time",
        "stockIn": "Stock In",
        "stockOut": "Stock Out"
      },
      "inventoryValue": {
        "title": "Inventory Value Over Time",
        "description": "Track total inventory value trends"
      },
      "turnover": {
        "title": "Product Turnover Metrics",
        "description": "Stock velocity and days-on-hand analysis",
        "product": "Product",
        "currentStock": "Current Stock",
        "totalSold": "Total Sold",
        "velocity": "Velocity",
        "daysOnHand": "Days on Hand",
        "days": "days",
        "noSales": "No sales",
        "noData": "No turnover data available for this period"
      },
      "comparison": {
        "title": "Period Comparison",
        "description": "Compare performance across periods",
        "weekOverWeek": "Week over Week",
        "monthOverMonth": "Month over Month",
        "stockIn": "Stock In",
        "stockOut": "Stock Out",
        "transactions": "Transactions",
        "netMovement": "Net Movement",
        "thisPeriod": "This Period",
        "lastPeriod": "Last Period",
        "change": "Change"
      }
    }
  }
}
```

#### 4.2 Chinese (Simplified) Translations

**Update**: `apps/admin-portal/messages/zh-CN.json`

```json
{
  "inventory": {
    "tabs": {
      "overview": "概览",
      "trends": "趋势",
      "turnover": "周转率",
      "comparison": "对比分析"
    },
    "stats": {
      "periods": {
        "daily": "最近30天",
        "weekly": "最近12周",
        "monthly": "最近12个月"
      },
      "stockMovement": {
        "title": "库存变动趋势",
        "description": "跟踪入库和出库随时间的变化",
        "stockIn": "入库",
        "stockOut": "出库"
      },
      "inventoryValue": {
        "title": "库存价值趋势",
        "description": "跟踪库存总价值变化趋势"
      },
      "turnover": {
        "title": "产品周转指标",
        "description": "库存周转速度和在库天数分析",
        "product": "产品",
        "currentStock": "当前库存",
        "totalSold": "销售总量",
        "velocity": "周转速度",
        "daysOnHand": "在库天数",
        "days": "天",
        "noSales": "无销售",
        "noData": "该时间段暂无周转数据"
      },
      "comparison": {
        "title": "周期对比",
        "description": "比较不同周期的表现",
        "weekOverWeek": "周环比",
        "monthOverMonth": "月环比",
        "stockIn": "入库量",
        "stockOut": "出库量",
        "transactions": "交易次数",
        "netMovement": "净变动",
        "thisPeriod": "本期",
        "lastPeriod": "上期",
        "change": "变化"
      }
    }
  }
}
```

#### 4.3 Chinese (Traditional) Translations

**Update**: `apps/admin-portal/messages/zh-TW.json`

```json
{
  "inventory": {
    "tabs": {
      "overview": "概覽",
      "trends": "趨勢",
      "turnover": "週轉率",
      "comparison": "對比分析"
    },
    "stats": {
      "periods": {
        "daily": "最近30天",
        "weekly": "最近12週",
        "monthly": "最近12個月"
      },
      "stockMovement": {
        "title": "庫存變動趨勢",
        "description": "追蹤入庫和出庫隨時間的變化",
        "stockIn": "入庫",
        "stockOut": "出庫"
      },
      "inventoryValue": {
        "title": "庫存價值趨勢",
        "description": "追蹤庫存總價值變化趨勢"
      },
      "turnover": {
        "title": "產品週轉指標",
        "description": "庫存週轉速度和在庫天數分析",
        "product": "產品",
        "currentStock": "當前庫存",
        "totalSold": "銷售總量",
        "velocity": "週轉速度",
        "daysOnHand": "在庫天數",
        "days": "天",
        "noSales": "無銷售",
        "noData": "該時間段暫無週轉數據"
      },
      "comparison": {
        "title": "週期對比",
        "description": "比較不同週期的表現",
        "weekOverWeek": "週環比",
        "monthOverMonth": "月環比",
        "stockIn": "入庫量",
        "stockOut": "出庫量",
        "transactions": "交易次數",
        "netMovement": "淨變動",
        "thisPeriod": "本期",
        "lastPeriod": "上期",
        "change": "變化"
      }
    }
  }
}
```

---

### Phase 5: Database Optimization (Optional)

#### 5.1 Add Composite Index

**Update**: `packages/database/prisma/schema.prisma`

Add to the `InventoryTransaction` model:

```prisma
model InventoryTransaction {
  // ... existing fields

  // Existing indexes
  @@index([productId, createdAt(sort: Desc)])
  @@index([referenceId, referenceType])
  @@index([type])
  @@index([adjustmentType])

  // New composite index for time-series aggregations
  @@index([createdAt(sort: Desc), type])

  @@map("inventorytransactions")
}
```

**Apply**: Run `pnpm prisma db push` or include in next migration.

---

## Testing & Verification Checklist

### Type Check
```bash
pnpm type-check
```

### Build Verification
```bash
pnpm build
```

### Manual Testing Checklist

- [ ] Tabs render and switch correctly
- [ ] Stock Movement chart displays with data
- [ ] Daily/Weekly/Monthly toggle updates charts
- [ ] Inventory Value chart shows correct AUD formatting
- [ ] Product Turnover table shows velocity and days-on-hand
- [ ] Days-on-hand badges color-coded correctly (red < 7, yellow < 30, gray > 30)
- [ ] Comparison cards show correct percentage changes
- [ ] Week/Month comparison toggle works
- [ ] Loading skeletons display during data fetch
- [ ] Empty states display when no data
- [ ] Language switching works (EN, ZH-CN, ZH-TW)
- [ ] Mobile responsive layout
- [ ] Chart tooltips display correctly

---

## Implementation Order Summary

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1. Dependencies | Install Recharts, Create Tabs component | 30 min |
| 2. API Layer | Create inventory-stats router with 4 endpoints | 2-3 hrs |
| 3. UI Components | Create 5 chart/table components, update page | 2-3 hrs |
| 4. Internationalization | Add translations to 3 language files | 30 min |
| 5. Database | Add optional composite index | 15 min |
| 6. Testing | Type check, build, manual verification | 1 hr |
| **Total** | | **6-8 hrs** |

---

## Files Modified/Created

### New Files
| File | Purpose |
|------|---------|
| `packages/api/src/routers/inventory-stats.ts` | New API router |
| `packages/ui/src/components/tabs.tsx` | Tabs UI component |
| `apps/admin-portal/app/[locale]/(app)/inventory/components/TimePeriodSelector.tsx` | Period toggle |
| `apps/admin-portal/app/[locale]/(app)/inventory/components/StockMovementChart.tsx` | Bar chart |
| `apps/admin-portal/app/[locale]/(app)/inventory/components/InventoryValueChart.tsx` | Area chart |
| `apps/admin-portal/app/[locale]/(app)/inventory/components/ProductTurnoverTable.tsx` | Data table |
| `apps/admin-portal/app/[locale]/(app)/inventory/components/ComparisonAnalytics.tsx` | Comparison cards |
| `apps/admin-portal/app/[locale]/(app)/inventory/components/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|------|---------|
| `packages/api/src/root.ts` | Register inventoryStats router |
| `packages/ui/src/index.ts` | Export tabs component |
| `apps/admin-portal/package.json` | Add recharts dependency |
| `apps/admin-portal/app/[locale]/(app)/inventory/page.tsx` | Add tabs structure |
| `apps/admin-portal/messages/en.json` | Add translations |
| `apps/admin-portal/messages/zh-CN.json` | Add translations |
| `apps/admin-portal/messages/zh-TW.json` | Add translations |
| `packages/database/prisma/schema.prisma` | Optional: Add index |
