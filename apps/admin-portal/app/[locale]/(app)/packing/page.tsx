'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { Input, EmptyState, Card, CardHeader, CardDescription, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Badge, useToast, TableSkeleton } from '@joho-erp/ui';
import { Package, Calendar, PlayCircle, PauseCircle, Loader2, ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { ProductSummaryView } from './components/ProductSummaryView';
import { OrderListView } from './components/OrderListView';
import { AreaLabelFilter } from './components/AreaLabelFilter';
import { StatsBar, FilterBar, OperationsLayout, type StatItem } from '@/components/operations';
import type { ProductCategory } from '@joho-erp/shared';

export default function PackingPage() {
  const t = useTranslations('packing');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();

  // Default to today for delivery date (using local timezone)
  // This ensures the packing page shows today's orders in the user's timezone
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [deliveryDate, setDeliveryDate] = useState<Date>(today);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasShownResumeDialog, setHasShownResumeDialog] = useState(false);
  const [focusedOrderNumber, setFocusedOrderNumber] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('');

  // Handlers for order badge focus functionality
  const handleFocusOrder = (orderNumber: string) => {
    setFocusedOrderNumber(orderNumber);
  };

  const handleClearFocus = () => {
    setFocusedOrderNumber(null);
  };

  const { data: session, isLoading, error, refetch } = api.packing.getOptimizedSession.useQuery({
    deliveryDate: deliveryDate.toISOString(),
    areaId: areaFilter || undefined,
  }, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds to reflect order changes
  });

  const optimizeRouteMutation = api.packing.optimizeRoute.useMutation();

  // Resume order mutation
  const resumeOrderMutation = api.packing.resumeOrder.useMutation({
    onSuccess: () => {
      toast({
        title: t('orderResumed'),
        description: t('orderResumedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: t('errorResumingOrder'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate paused orders for the resume dialog
  const pausedOrders = useMemo(() => {
    if (!session?.orders) return [];
    return session.orders.filter((order) => order.isPaused);
  }, [session?.orders]);

  // Show resume dialog when there are paused orders (only once per page load)
  useEffect(() => {
    if (pausedOrders.length > 0 && !hasShownResumeDialog && !isLoading) {
      setShowResumeDialog(true);
      setHasShownResumeDialog(true);
    }
  }, [pausedOrders.length, hasShownResumeDialog, isLoading]);

  // Reset the dialog flag when date changes
  useEffect(() => {
    setHasShownResumeDialog(false);
  }, [deliveryDate]);

  // Handle resuming an order from the dialog
  const handleResumeOrder = async (orderId: string) => {
    await resumeOrderMutation.mutateAsync({ orderId });
  };

  // Trigger auto-optimization when session data changes
  useEffect(() => {
    const autoOptimize = async () => {
      if (!session) return;
      if (!session.orders || session.orders.length === 0) return;
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
        toast({
          title: tErrors('optimizationFailed'),
          variant: 'destructive',
        });
      } finally {
        setIsOptimizing(false);
      }
    };

    autoOptimize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.deliveryDate]);

  // Calculate packed orders count (orders that are ready_for_delivery)
  const packedOrdersCount = useMemo(() => {
    if (!session?.orders) return 0;
    return session.orders.filter((order) => order.status === 'ready_for_delivery').length;
  }, [session?.orders]);

  // Data from API with fallbacks for loading state
  const orders = useMemo(() => session?.orders ?? [], [session?.orders]);
  const productSummary = useMemo(() => session?.productSummary ?? [], [session?.productSummary]);

  // Extract unique categories from productSummary
  const categories = useMemo(() => {
    const uniqueCategories = new Set<ProductCategory>();
    for (const product of productSummary) {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    }
    return Array.from(uniqueCategories).sort();
  }, [productSummary]);

  // Filter productSummary by category
  const filteredProductSummary = useMemo(() => {
    if (categoryFilter === 'all') return productSummary;
    return productSummary.filter((p) => p.category === categoryFilter);
  }, [productSummary, categoryFilter]);

  // Get productIds in the selected category for filtering orders
  const categoryProductIds = useMemo(() => {
    if (categoryFilter === 'all') return null;
    return new Set(filteredProductSummary.map((p) => p.productId));
  }, [categoryFilter, filteredProductSummary]);

  // Filter orders - show orders that have at least one item from the selected category
  const filteredOrders = useMemo(() => {
    if (categoryFilter === 'all' || !categoryProductIds) return orders;
    // We need to filter orders, but we don't have item-level data at this point
    // Instead, we'll filter by checking which orders appear in the filtered productSummary
    const ordersInCategory = new Set<string>();
    for (const product of filteredProductSummary) {
      for (const order of product.orders) {
        ordersInCategory.add(order.orderNumber);
      }
    }
    return orders.filter((o) => ordersInCategory.has(o.orderNumber));
  }, [orders, categoryFilter, categoryProductIds, filteredProductSummary]);

  // Stats based on filtered data
  const totalOrders = filteredOrders.length;
  const totalProducts = filteredProductSummary.length;
  const totalItems = filteredProductSummary.reduce((sum, p) => sum + p.totalQuantity, 0);

  // Stats for StatsBar component
  const stats = useMemo<StatItem[]>(() => [
    { label: t('totalOrders'), value: totalOrders },
    { label: t('uniqueProducts'), value: totalProducts, variant: 'success' as const },
    { label: t('totalItems'), value: totalItems, variant: 'info' as const },
  ], [totalOrders, totalProducts, totalItems, t]);

  // Category labels for FilterBar
  const categoryLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    categories.forEach((cat) => {
      labels[cat] = t(`categories.${cat.toLowerCase()}`);
    });
    return labels;
  }, [categories, t]);

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

  // Date change handler - creates local midnight
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    setDeliveryDate(newDate);
  };

  // Date input value helper - uses local timezone methods
  const year = deliveryDate.getFullYear();
  const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
  const day = String(deliveryDate.getDate()).padStart(2, '0');
  const dateInputValue = `${year}-${month}-${day}`;

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="space-y-6">
        {/* Standard Header */}
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {t('subtitle')}
          </p>
        </div>

        {/* Date Selector */}
        <Card>
          <CardHeader className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('selectDate')}
                  </label>
                  <Input
                    type="date"
                    value={dateInputValue}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(deliveryDate)}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Category Filter - Area filter moved to OrderListView */}
        <FilterBar
          showCategoryFilter={categories.length > 1}
          category={categoryFilter}
          onCategoryChange={(cat) => setCategoryFilter(cat as ProductCategory | 'all')}
          categories={categories}
          categoryLabels={categoryLabels}
          allCategoriesLabel={t('allCategories')}
          showAreaFilter={false}
          areaId={areaFilter}
          onAreaChange={setAreaFilter}
        />

        {/* Stats Bar */}
        {totalOrders > 0 && (
          <StatsBar stats={stats} />
        )}

        {/* Main Packing Interface */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardDescription>{t('productSummary')}</CardDescription>
              </CardHeader>
              <div className="p-4">
                <TableSkeleton rows={5} columns={3} showMobileCards />
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>{t('orders')}</CardDescription>
              </CardHeader>
              <div className="p-4">
                <TableSkeleton rows={5} columns={3} showMobileCards />
              </div>
            </Card>
          </div>
        ) : orders.length > 0 ? (
          <OperationsLayout
            sidebar={
              <ProductSummaryView
                productSummary={filteredProductSummary}
                onOrderBadgeClick={handleFocusOrder}
              />
            }
            sidebarTitle={t('summaryPanel')}
            sidebarIcon={Package}
            sidebarDescription={`${totalProducts} ${t('uniqueProducts').toLowerCase()}`}
            main={
              <OrderListView
                orders={filteredOrders}
                deliveryDate={deliveryDate}
                onOrderUpdated={refetch}
                focusedOrderNumber={focusedOrderNumber}
                onClearFocus={handleClearFocus}
                areaId={areaFilter}
                onAreaChange={setAreaFilter}
              />
            }
            mainTitle={t('ordersPanel')}
            mainIcon={ClipboardList}
            mainDescription={`${packedOrdersCount}/${totalOrders} ${t('ordersPacked')}`}
            focusKey={focusedOrderNumber}
          />
        ) : (
          <div className="py-12 space-y-4">
            {/* Show area filter if an area is selected so user can clear it */}
            {areaFilter && (
              <AreaLabelFilter
                selectedAreaId={areaFilter}
                onAreaChange={setAreaFilter}
              />
            )}
            <EmptyState
              icon={Package}
              title={areaFilter ? t('noOrdersForArea') : t('noOrders')}
              description={areaFilter ? t('noOrdersForAreaDescription') : t('noOrdersDescription')}
              action={areaFilter ? {
                label: t('showAllAreas'),
                onClick: () => setAreaFilter('')
              } : undefined}
            />
          </div>
        )}
      </div>

      {/* Resume Paused Orders Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-warning" />
              {t('resumePausedOrders')}
            </DialogTitle>
            <DialogDescription>
              {t('resumePausedOrdersDescription', { count: pausedOrders.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {pausedOrders.map((order) => (
              <div
                key={order.orderId}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
              >
                <div>
                  <span className="font-mono font-semibold text-sm">{order.orderNumber}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {order.customerName}
                  </span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {order.packedItemsCount}/{order.totalItemsCount} {t('packed')}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleResumeOrder(order.orderId)}
                  disabled={resumeOrderMutation.isPending}
                >
                  {resumeOrderMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                      {t('resume')}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResumeDialog(false)}>
              {t('startFresh')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
