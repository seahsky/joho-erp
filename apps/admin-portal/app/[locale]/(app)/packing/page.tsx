'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  EmptyState,
  CountUp,
  Input,
} from '@jimmy-beef/ui';
import { Package, Calendar, Loader2, PackageCheck, List, Grid3x3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { ProductSummaryView } from './components/ProductSummaryView';
import { OrderListView } from './components/OrderListView';
import { ProgressIndicator } from './components/ProgressIndicator';

type ViewMode = 'product-summary' | 'order-by-order';

export default function PackingPage() {
  const t = useTranslations('packing');

  // Default to tomorrow for delivery date (using UTC to avoid timezone issues)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const [deliveryDate, setDeliveryDate] = useState<Date>(tomorrow);
  const [viewMode, setViewMode] = useState<ViewMode>('product-summary');

  const { data: session, isLoading, error, refetch } = api.packing.getSession.useQuery({
    deliveryDate: deliveryDate.toISOString(),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('loadingSession')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-destructive text-lg mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const orders = session?.orders ?? [];
  const productSummary = session?.productSummary ?? [];
  const totalOrders = orders.length;
  const totalProducts = productSummary.length;
  const totalItems = productSummary.reduce((sum, p) => sum + p.totalQuantity, 0);

  // Format date for display (using UTC to avoid timezone discrepancy)
  const formatDate = (date: Date) => {
    // Create a date string using UTC components to avoid timezone shifts
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const utcDate = new Date(Date.UTC(year, month, day));

    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(utcDate);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Parse date input as UTC to avoid timezone issues
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    setDeliveryDate(newDate);
  };

  const dateInputValue = deliveryDate.toISOString().split('T')[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('selectDate')}
          </CardTitle>
          <CardDescription>{t('selectDateDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={dateInputValue}
                onChange={handleDateChange}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(deliveryDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {totalOrders > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="stat-card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalOrders')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">
                  <CountUp end={totalOrders} duration={1} />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('uniqueProducts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-success" />
                <span className="text-3xl font-bold">
                  <CountUp end={totalProducts} duration={1} />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalItems')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-5 w-5 text-info" />
                <span className="text-3xl font-bold">
                  <CountUp end={totalItems} duration={1} />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Toggle */}
      {totalOrders > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewMode === 'product-summary' ? 'default' : 'outline'}
              onClick={() => setViewMode('product-summary')}
              className="gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              {t('productSummary')}
            </Button>
            <Button
              variant={viewMode === 'order-by-order' ? 'default' : 'outline'}
              onClick={() => setViewMode('order-by-order')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              {t('orderByOrder')}
            </Button>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator orders={orders} />

          {/* View Content */}
          {viewMode === 'product-summary' ? (
            <ProductSummaryView productSummary={productSummary} />
          ) : (
            <OrderListView
              orders={orders}
              deliveryDate={deliveryDate}
              onOrderUpdated={refetch}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {totalOrders === 0 && (
        <EmptyState
          icon={Package}
          title={t('noOrders')}
          description={t('noOrdersDescription')}
        />
      )}
    </div>
  );
}
