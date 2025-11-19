'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { Input, EmptyState, CountUp } from '@jimmy-beef/ui';
import { Package, Calendar, Loader2, TrendingUp, Boxes, ClipboardCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { ProductSummaryView } from './components/ProductSummaryView';
import { OrderListView } from './components/OrderListView';
import { PackingLayout } from './components/PackingLayout';

export default function PackingPage() {
  const t = useTranslations('packing');

  // Default to tomorrow for delivery date (using UTC to avoid timezone issues)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const [deliveryDate, setDeliveryDate] = useState<Date>(tomorrow);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { data: session, isLoading, error, refetch } = api.packing.getOptimizedSession.useQuery({
    deliveryDate: deliveryDate.toISOString(),
  });

  const optimizeRouteMutation = api.packing.optimizeRoute.useMutation();

  // Trigger auto-optimization when session data changes
  useEffect(() => {
    const autoOptimize = async () => {
      if (!session) return;
      if (isOptimizing) return;
      if (session.routeOptimization && !session.routeOptimization.needsReoptimization) {
        return; // Already optimized
      }

      setIsOptimizing(true);
      try {
        await optimizeRouteMutation.mutateAsync({
          deliveryDate: deliveryDate.toISOString(),
          force: false,
        });
        await refetch(); // Refresh session data
      } catch (error) {
        console.error('Auto-optimization failed:', error);
      } finally {
        setIsOptimizing(false);
      }
    };

    autoOptimize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.deliveryDate]);

  // Calculate packed orders count (orders that are ready_for_delivery)
  const packedOrdersCount = useMemo(() => {
    if (!session) return 0;
    // This would ideally come from the API, but for now we'll default to 0
    // TODO: Track completed orders in API
    return 0;
  }, [session]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">{t('loadingSession')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-destructive/10 border-2 border-destructive/30 rounded-lg p-8">
          <p className="text-destructive text-lg font-bold mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-destructive/80">{error.message}</p>
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
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    setDeliveryDate(newDate);
  };

  const dateInputValue = deliveryDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Clean Professional Header */}
        <div className="bg-primary text-primary-foreground rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight">{t('title')}</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">{t('subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Compact Date Selector */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  {t('selectDate')}
                </label>
                <Input
                  type="date"
                  value={dateInputValue}
                  onChange={handleDateChange}
                  className="font-mono font-bold border border-border focus:border-primary"
                />
              </div>
            </div>
            <div className="text-sm font-medium text-foreground bg-muted px-4 py-2 rounded-md border border-border">
              {formatDate(deliveryDate)}
            </div>
          </div>
        </div>

        {/* Compact Horizontal Stats Bar */}
        {totalOrders > 0 && (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Total Orders */}
              <div className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('totalOrders')}
                    </p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      <CountUp end={totalOrders} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Unique Products */}
              <div className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded">
                    <Boxes className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('uniqueProducts')}
                    </p>
                    <p className="text-2xl font-bold text-success tabular-nums">
                      <CountUp end={totalProducts} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Items */}
              <div className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-info/10 rounded">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('totalItems')}
                    </p>
                    <p className="text-2xl font-bold text-info tabular-nums">
                      <CountUp end={totalItems} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Packing Interface */}
        {totalOrders > 0 ? (
          <PackingLayout
            summaryPanel={<ProductSummaryView productSummary={productSummary} />}
            ordersPanel={
              <OrderListView
                orders={orders}
                deliveryDate={deliveryDate}
                onOrderUpdated={refetch}
              />
            }
            gatheredCount={0} // TODO: Track gathered state
            totalProducts={totalProducts}
            packedCount={packedOrdersCount}
            totalOrders={totalOrders}
          />
        ) : (
          <div className="py-12">
            <EmptyState
              icon={Package}
              title={t('noOrders')}
              description={t('noOrdersDescription')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
