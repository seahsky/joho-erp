'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  type StatusType,
} from '@joho-erp/ui';
import { ArrowLeft, FileText } from 'lucide-react';

import { OrderHeader } from './components/OrderHeader';
import { OrderItemsTable } from './components/OrderItemsTable';
import { StatusTimeline } from './components/StatusTimeline';
import { DeliveryInfo } from './components/DeliveryInfo';
import { XeroSyncCard } from './components/XeroSyncCard';
import { OrderActions } from './components/OrderActions';
import { type BackorderStatusType } from '../components/BackorderStatusBadge';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const t = useTranslations('orderDetail');
  const router = useRouter();
  const utils = api.useUtils();

  const {
    data: order,
    isLoading,
    error,
  } = api.order.getById.useQuery({ orderId: resolvedParams.id });

  const handleBack = () => {
    router.push(`/${resolvedParams.locale}/orders`);
  };

  const handleStatusUpdated = () => {
    void utils.order.getById.invalidate({ orderId: resolvedParams.id });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive text-lg mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error?.message}</p>
          <Button
            variant="outline"
            onClick={handleBack}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToOrders')}
          </Button>
        </div>
      </div>
    );
  }

  // Type assertions for embedded types
  const items = (order.items || []) as Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;

  const statusHistory = (order.statusHistory || []) as Array<{
    status: string;
    changedAt: Date | string;
    changedBy: string;
    notes?: string | null;
  }>;

  const deliveryAddress = order.deliveryAddress as {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    areaTag: string;
    deliveryInstructions?: string | null;
  };

  const delivery = order.delivery as {
    driverId?: string | null;
    driverName?: string | null;
    assignedAt?: Date | string | null;
    startedAt?: Date | string | null;
    deliveredAt?: Date | string | null;
    proofOfDelivery?: {
      type: string;
      fileUrl: string;
      uploadedAt: Date | string;
    } | null;
    notes?: string | null;
    deliverySequence?: number | null;
    returnReason?: string | null;
    returnNotes?: string | null;
    returnedAt?: Date | string | null;
  } | null;

  const xero = order.xero as {
    invoiceId?: string | null;
    invoiceNumber?: string | null;
    invoiceStatus?: string | null;
    creditNoteId?: string | null;
    creditNoteNumber?: string | null;
    syncedAt?: Date | string | null;
    syncError?: string | null;
    lastSyncJobId?: string | null;
  } | null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <OrderHeader
        orderNumber={order.orderNumber}
        customerName={order.customerName}
        orderedAt={order.orderedAt}
        status={order.status as StatusType}
        backorderStatus={(order.backorderStatus || 'none') as BackorderStatusType}
        onBack={handleBack}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <OrderItemsTable
            items={items}
            subtotal={order.subtotal}
            taxAmount={order.taxAmount}
            totalAmount={order.totalAmount}
          />

          {/* Status Timeline */}
          <StatusTimeline statusHistory={statusHistory} />

          {/* Internal Notes */}
          {order.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('internalNotes.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.internalNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Admin Notes (for orders created on behalf) */}
          {order.adminNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('adminNotes.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.adminNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Order Actions */}
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            onStatusUpdated={handleStatusUpdated}
          />

          {/* Delivery Info */}
          <DeliveryInfo
            deliveryAddress={deliveryAddress}
            requestedDeliveryDate={order.requestedDeliveryDate}
            delivery={delivery}
          />

          {/* Xero Sync Status */}
          <XeroSyncCard xero={xero} orderId={order.id} />
        </div>
      </div>
    </div>
  );
}
