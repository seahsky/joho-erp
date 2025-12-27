'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { Input, EmptyState, CountUp, Card, CardHeader, CardDescription, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Badge, useToast } from '@joho-erp/ui';
import { Package, Calendar, Loader2, PlayCircle, PauseCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { ProductSummaryView } from './components/ProductSummaryView';
import { OrderListView } from './components/OrderListView';
import { PackingLayout } from './components/PackingLayout';

export default function PackingPage() {
  const t = useTranslations('packing');
  const { toast } = useToast();

  // Default to today for delivery date (using UTC to avoid timezone issues)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [deliveryDate, setDeliveryDate] = useState<Date>(today);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasShownResumeDialog, setHasShownResumeDialog] = useState(false);

  const { data: session, isLoading, error, refetch } = api.packing.getOptimizedSession.useQuery({
    deliveryDate: deliveryDate.toISOString(),
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
    if (!session?.orders) return 0;
    return session.orders.filter((order) => order.status === 'ready_for_delivery').length;
  }, [session?.orders]);

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

        {/* Stats Bar */}
        {totalOrders > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
            <Card className="stat-card animate-fade-in-up">
              <div className="stat-card-gradient" />
              <CardHeader className="pb-3 relative">
                <CardDescription>{t('totalOrders')}</CardDescription>
                <div className="stat-value tabular-nums">
                  <CountUp end={totalOrders} />
                </div>
              </CardHeader>
            </Card>

            <Card className="stat-card animate-fade-in-up">
              <div className="stat-card-gradient" />
              <CardHeader className="pb-3 relative">
                <CardDescription>{t('uniqueProducts')}</CardDescription>
                <div className="stat-value tabular-nums text-success">
                  <CountUp end={totalProducts} />
                </div>
              </CardHeader>
            </Card>

            <Card className="stat-card animate-fade-in-up">
              <div className="stat-card-gradient" />
              <CardHeader className="pb-3 relative">
                <CardDescription>{t('totalItems')}</CardDescription>
                <div className="stat-value tabular-nums text-info">
                  <CountUp end={totalItems} />
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Main Packing Interface */}
        {totalOrders > 0 ? (
          <PackingLayout
            summaryPanel={<ProductSummaryView productSummary={productSummary} deliveryDate={deliveryDate} />}
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
