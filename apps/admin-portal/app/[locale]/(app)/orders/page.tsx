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
  Input,
  ResponsiveTable,
  type TableColumn,
  StatusBadge,
  type StatusType,
  CountUp,
  EmptyState,
  toast,
} from '@joho-erp/ui';
import { Search, ShoppingBag, Loader2, Eye, Package, PackageX, Plus, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/client';
import { formatCurrency } from '@joho-erp/shared';
import { BackorderStatusBadge, type BackorderStatusType } from './components/BackorderStatusBadge';
import { BackorderApprovalDialog, type BackorderOrder } from './components/BackorderApprovalDialog';
import { ConfirmOrderDialog, type ConfirmOrder } from './components/ConfirmOrderDialog';
import { XeroOrderSyncBadge } from '@/components/xero-sync-badge';
import { CheckCircle } from 'lucide-react';

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  orderedAt: Date;
  status: StatusType;
  totalAmount: number;
  requestedDeliveryDate: Date;
  backorderStatus: BackorderStatusType;
  stockShortfall?: Record<
    string,
    {
      requested: number;
      available: number;
      shortfall: number;
    }
  >;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
  deliveryAddress: {
    areaTag: string;
  };
};

export default function OrdersPage() {
  const t = useTranslations('orders');
  const tCommon = useTranslations('common');
  const tAlert = useTranslations('orders.backorderAlert');
  const tMessages = useTranslations('orders.backorderMessages');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [backorderFilter, setBackorderFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<BackorderOrder | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [selectedConfirmOrder, setSelectedConfirmOrder] = useState<ConfirmOrder | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const utils = api.useUtils();

  const { data, isLoading, error } = api.order.getAll.useQuery({
    status: statusFilter || undefined,
    areaTag: areaFilter || undefined,
    limit: 100,
  });

  const approveMutation = api.order.approveBackorder.useMutation({
    onSuccess: () => {
      toast({
        title: tMessages('approveSuccess'),
        variant: 'default',
      });
      setIsApprovalDialogOpen(false);
      setSelectedOrder(null);
      utils.order.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: tMessages('approveError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = api.order.rejectBackorder.useMutation({
    onSuccess: () => {
      toast({
        title: tMessages('rejectSuccess'),
        variant: 'default',
      });
      setIsApprovalDialogOpen(false);
      setSelectedOrder(null);
      utils.order.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: tMessages('rejectError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const tConfirm = useTranslations('orders.confirmDialog');
  const confirmMutation = api.order.confirmOrder.useMutation({
    onSuccess: () => {
      toast({
        title: tConfirm('success'),
        description: tConfirm('successMessage'),
        variant: 'default',
      });
      setIsConfirmDialogOpen(false);
      setSelectedConfirmOrder(null);
      utils.order.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        title: tConfirm('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const orders = (data?.orders ?? []).map((order) => ({
    ...order,
    backorderStatus: (order.backorderStatus as BackorderStatusType) || 'none',
    stockShortfall: order.stockShortfall as
      | Record<string, { requested: number; available: number; shortfall: number }>
      | undefined,
  })) as Order[];

  // Apply client-side filters
  const filteredOrders = orders.filter((order) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Backorder status filter
    if (backorderFilter) {
      if (order.backorderStatus !== backorderFilter) return false;
    }

    return true;
  });

  const totalOrders = filteredOrders.length;
  const awaitingApprovalOrders = filteredOrders.filter((o) => o.status === 'awaiting_approval').length;
  const confirmedOrders = filteredOrders.filter((o) => o.status === 'confirmed').length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'delivered').length;
  const pendingBackorders = orders.filter((o) => o.backorderStatus === 'pending_approval').length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Handler functions
  const handleReviewBackorder = (order: Order) => {
    setSelectedOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      requestedDeliveryDate: order.requestedDeliveryDate,
      items: order.items,
      stockShortfall: order.stockShortfall || {},
    });
    setIsApprovalDialogOpen(true);
  };

  const handleApprove = async (data: {
    orderId: string;
    approvedQuantities?: Record<string, number>;
    estimatedFulfillment?: Date;
    notes?: string;
  }) => {
    await approveMutation.mutateAsync(data);
  };

  const handleReject = async (data: { orderId: string; reason: string }) => {
    await rejectMutation.mutateAsync(data);
  };

  const handleFilterPendingBackorders = () => {
    setBackorderFilter('pending_approval');
  };

  // Handler for confirming an order
  const handleConfirmOrder = (order: Order) => {
    setSelectedConfirmOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      requestedDeliveryDate: order.requestedDeliveryDate,
      items: order.items,
    });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirm = async (data: { orderId: string; notes?: string }) => {
    await confirmMutation.mutateAsync(data);
  };

  const columns: TableColumn<Order>[] = [
    {
      key: 'orderNumber',
      label: t('orderNumber'),
      className: 'font-medium',
    },
    {
      key: 'customerName',
      label: t('customer'),
    },
    {
      key: 'orderedAt',
      label: t('date'),
      render: (order) => new Date(order.orderedAt).toLocaleDateString(),
    },
    {
      key: 'items',
      label: t('items'),
      render: (order) => order.items.length,
    },
    {
      key: 'area',
      label: t('area'),
      render: (order) => order.deliveryAddress.areaTag.toUpperCase(),
    },
    {
      key: 'totalAmount',
      label: t('total'),
      render: (order) => formatCurrency(order.totalAmount), // value is in cents
    },
    {
      key: 'status',
      label: t('status'),
      render: (order) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={order.status} />
          <BackorderStatusBadge status={order.backorderStatus} />
          <XeroOrderSyncBadge orderId={order.id} orderStatus={order.status} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: tCommon('actions'),
      className: 'text-right',
      render: (order) => (
        <div className="flex justify-end gap-2">
          {order.backorderStatus === 'pending_approval' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleReviewBackorder(order)}
            >
              {t('backorder.reviewBackorder')}
            </Button>
          )}
          {/* Confirm button only for awaiting_approval orders (backorders) */}
          {order.status === 'awaiting_approval' && order.backorderStatus !== 'pending_approval' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleConfirmOrder(order)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {t('confirmOrder')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={tCommon('view')}
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCard = (order: Order) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{order.orderNumber}</h3>
          <p className="text-sm text-muted-foreground">{order.customerName}</p>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <StatusBadge status={order.status} />
          <BackorderStatusBadge status={order.backorderStatus} />
          <XeroOrderSyncBadge orderId={order.id} orderStatus={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">{t('date')}</p>
          <p className="font-medium">{new Date(order.orderedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('items')}</p>
          <p className="font-medium">{order.items.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('area')}</p>
          <p className="font-medium">{order.deliveryAddress.areaTag.toUpperCase()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('total')}</p>
          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        {order.backorderStatus === 'pending_approval' ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleReviewBackorder(order)}
            >
              {t('backorder.reviewBackorder')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </>
        ) : order.status === 'awaiting_approval' ? (
          <>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleConfirmOrder(order)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {t('confirmOrder')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/orders/${order.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {t('viewDetails')}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={() => router.push('/orders/create')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('createOrderOnBehalf')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('totalOrders')}</CardDescription>
            <div className="stat-value tabular-nums">
              <CountUp end={totalOrders} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('awaitingApprovalOrders')}</CardDescription>
            <div className="stat-value tabular-nums text-warning">
              <CountUp end={awaitingApprovalOrders} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('confirmedOrders')}</CardDescription>
            <div className="stat-value tabular-nums text-info">
              <CountUp end={confirmedOrders} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-300">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('deliveredOrders')}</CardDescription>
            <div className="stat-value tabular-nums text-success">
              <CountUp end={deliveredOrders} />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Backorders Alert */}
      {pendingBackorders > 0 && (
        <Card className="mb-6 border-warning bg-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">{tAlert('title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm">{tAlert('message', { count: pendingBackorders })}</p>
              <Button variant="outline" size="sm" onClick={handleFilterPendingBackorders}>
                {tAlert('reviewNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="awaiting_approval">{t('awaitingApproval')}</option>
                <option value="confirmed">{t('confirmed')}</option>
                <option value="packing">{t('packing')}</option>
                <option value="ready_for_delivery">{t('readyForDelivery')}</option>
                <option value="delivered">{t('delivered')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </select>
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="">{t('allAreas')}</option>
                <option value="north">{t('north')}</option>
                <option value="south">{t('south')}</option>
                <option value="east">{t('east')}</option>
                <option value="west">{t('west')}</option>
              </select>
              <select
                className="flex h-10 w-full md:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={backorderFilter}
                onChange={(e) => setBackorderFilter(e.target.value)}
              >
                <option value="">{t('allBackorderStatuses')}</option>
                <option value="pending_approval">{t('backorder.pending_approval')}</option>
                <option value="approved">{t('backorder.approved')}</option>
                <option value="rejected">{t('backorder.rejected')}</option>
                <option value="partial_approved">{t('backorder.partial_approved')}</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Revenue Card */}
      <Card className="stat-card mb-6">
        <div className="stat-card-gradient" />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>{t('totalRevenue')}</CardDescription>
              <div className="text-3xl font-bold tabular-nums">
                {formatCurrency(totalRevenue)}
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {t('listTitle')}
            </div>
          </CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {filteredOrders.length > 0 ? (
            <ResponsiveTable
              data={filteredOrders}
              columns={columns}
              mobileCard={mobileCard}
              className="md:border-0"
            />
          ) : (
            <EmptyState
              icon={PackageX}
              title={t('noOrdersFound')}
              description={searchQuery || statusFilter || areaFilter ? t('adjustFilters') : t('ordersWillAppear')}
            />
          )}
        </CardContent>
      </Card>

      {/* Backorder Approval Dialog */}
      <BackorderApprovalDialog
        order={selectedOrder}
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        isSubmitting={approveMutation.isPending || rejectMutation.isPending}
      />

      {/* Confirm Order Dialog */}
      <ConfirmOrderDialog
        order={selectedConfirmOrder}
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={handleConfirm}
        isSubmitting={confirmMutation.isPending}
      />
    </div>
  );
}
