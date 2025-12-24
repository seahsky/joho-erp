'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  H1,
  Muted,
  Small,
  CountUp,
  EmptyState,
  Badge,
  Button,
} from '@joho-erp/ui';
import {
  Package,
  AlertTriangle,
  PackageX,
  DollarSign,
  ArrowDownUp,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';

type TransactionType = 'sale' | 'adjustment' | 'return' | undefined;

export default function InventoryPage() {
  const t = useTranslations();

  // Filters for transaction history
  const [transactionType, setTransactionType] = useState<TransactionType>(undefined);

  // API calls
  const { data: summary, isLoading: summaryLoading } = api.dashboard.getInventorySummary.useQuery();
  const { data: categoryData, isLoading: categoryLoading } = api.dashboard.getInventoryByCategory.useQuery();
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } =
    api.dashboard.getInventoryTransactions.useQuery({
      type: transactionType,
      limit: 20,
    });

  const isLoading = summaryLoading || categoryLoading || transactionsLoading;

  // Get type badge variant
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'sale':
        return <Badge variant="default">{t('inventory.types.sale')}</Badge>;
      case 'adjustment':
        return <Badge variant="secondary">{t('inventory.types.adjustment')}</Badge>;
      case 'return':
        return <Badge variant="outline">{t('inventory.types.return')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Get adjustment type label
  const getAdjustmentTypeLabel = (type: string | null) => {
    if (!type) return '';
    switch (type) {
      case 'stock_received':
        return t('inventory.adjustmentTypes.stock_received');
      case 'stock_count_correction':
        return t('inventory.adjustmentTypes.stock_count_correction');
      case 'damaged_goods':
        return t('inventory.adjustmentTypes.damaged_goods');
      case 'expired_stock':
        return t('inventory.adjustmentTypes.expired_stock');
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Header Skeleton */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Category Breakdown & Transactions Skeleton */}
        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between pb-3 border-b last:border-0">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between pb-3 border-b last:border-0">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <H1>{t('inventory.title')}</H1>
          <Muted className="mt-2">{t('inventory.subtitle')}</Muted>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('inventory.totalValue')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums text-2xl font-bold">
              {formatAUD(summary?.totalValue || 0)}
            </div>
            <Small className="text-muted-foreground mt-1">{t('inventory.basedOnCost')}</Small>
          </CardContent>
        </Card>

        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('inventory.totalProducts')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={summary?.totalProducts || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">{t('inventory.activeProducts')}</Small>
          </CardContent>
        </Card>

        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('inventory.lowStockItems')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={summary?.lowStockCount || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">{t('inventory.belowThreshold')}</Small>
          </CardContent>
        </Card>

        <Card className="stat-card animate-fade-in-up delay-300">
          <div className="stat-card-gradient" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">{t('inventory.outOfStock')}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <PackageX className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 relative">
            <div className="stat-value tabular-nums">
              <CountUp end={summary?.outOfStockCount || 0} />
            </div>
            <Small className="text-muted-foreground mt-1">{t('inventory.zeroStock')}</Small>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown & Transaction History */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Category Breakdown */}
        <Card className="lg:col-span-3 animate-fade-in-up delay-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t('inventory.byCategory')}
            </CardTitle>
            <CardDescription>{t('inventory.categoryBreakdownDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {categoryData && categoryData.length > 0 ? (
              <div className="space-y-4">
                {categoryData.map((category) => (
                  <div
                    key={category.category}
                    className="flex items-center justify-between pb-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.productCount} {t('inventory.products')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">{formatAUD(category.totalValue)}</p>
                      <div className="flex gap-2 justify-end">
                        <Small className="text-muted-foreground">
                          {category.totalStock} {t('inventory.units')}
                        </Small>
                        {category.lowStockCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {category.lowStockCount} {t('inventory.lowStock')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Package} title={t('inventory.noCategories')} />
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="lg:col-span-4 animate-fade-in-up delay-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownUp className="h-5 w-5" />
                  {t('inventory.transactionHistory')}
                </CardTitle>
                <CardDescription>{t('inventory.recentTransactions')}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchTransactions()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={transactionType === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType(undefined)}
              >
                {t('inventory.filters.allTypes')}
              </Button>
              <Button
                variant={transactionType === 'sale' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType('sale')}
              >
                {t('inventory.types.sale')}
              </Button>
              <Button
                variant={transactionType === 'adjustment' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType('adjustment')}
              >
                {t('inventory.types.adjustment')}
              </Button>
              <Button
                variant={transactionType === 'return' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionType('return')}
              >
                {t('inventory.types.return')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {transactionsData && transactionsData.transactions.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {transactionsData.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between pb-3 border-b last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{tx.productName}</p>
                      <p className="text-sm text-muted-foreground">{tx.productSku}</p>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(tx.type)}
                        {tx.adjustmentType && (
                          <span className="text-xs text-muted-foreground">
                            ({getAdjustmentTypeLabel(tx.adjustmentType)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium tabular-nums ${
                          tx.quantity > 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {tx.quantity > 0 ? '+' : ''}
                        {tx.quantity} {tx.productUnit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.previousStock} → {tx.newStock}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ArrowDownUp} title={t('inventory.noTransactions')} />
            )}

            {transactionsData && transactionsData.hasMore && (
              <div className="mt-4 text-center">
                <Small className="text-muted-foreground">
                  {t('inventory.showingOf', {
                    shown: transactionsData.transactions.length,
                    total: transactionsData.totalCount,
                  })}
                </Small>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
