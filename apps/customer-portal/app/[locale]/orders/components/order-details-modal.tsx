'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Card,
  CardContent,
  Skeleton,
  H3,
  Muted,
  StatusBadge,
  Button,
  Label,
  BottomSheet,
  useIsMobile,
  type StatusType,
} from '@joho-erp/ui';
import { MapPin, Package, Info, XCircle, Loader2, Camera, CheckCircle, X } from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCurrency } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { BackorderStatusBadge, type BackorderStatusType } from './BackorderStatusBadge';

interface OrderItem {
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface DeliveryAddress {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  deliveryInstructions?: string | null;
}

interface StatusHistoryItem {
  status: string;
  changedAt: Date | string;
  changedBy: string;
  notes: string | null;
}

interface ProofOfDelivery {
  type: 'photo' | 'signature';
  fileUrl: string;
  uploadedAt: Date | string;
}

interface Delivery {
  driverId?: string;
  driverName?: string;
  deliveredAt?: Date | string;
  proofOfDelivery?: ProofOfDelivery;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsModal({ orderId, open, onOpenChange }: OrderDetailsModalProps) {
  const t = useTranslations('orderDetails');
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const utils = api.useUtils();
  const isMobile = useIsMobile();

  // Cancel order state
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');

  // POD image preview state
  const [showPodPreview, setShowPodPreview] = React.useState(false);

  // Cancel order mutation
  const cancelMutation = api.order.cancelMyOrder.useMutation({
    onSuccess: () => {
      toast({
        title: tOrders('cancel.success'),
        description: tOrders('cancel.successMessage'),
        variant: 'default',
      });
      utils.order.getMyOrders.invalidate();
      utils.order.getById.invalidate({ orderId: orderId! });
      setShowCancelDialog(false);
      setCancelReason('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: tOrders('cancel.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCancelOrder = () => {
    if (!orderId) return;
    cancelMutation.mutate({
      orderId,
      reason: cancelReason || undefined,
    });
  };

  // Helper function to get backorder info message based on status
  const getBackorderInfoMessage = (status: BackorderStatusType) => {
    switch (status) {
      case 'pending_approval':
        return t('backorderInfo.pendingApproval');
      case 'approved':
        return t('backorderInfo.approved');
      case 'rejected':
        return t('backorderInfo.rejected');
      case 'partial_approved':
        return t('backorderInfo.partialApproval');
      default:
        return null;
    }
  };

  const { data: order, isLoading, error } = api.order.getById.useQuery(
    { orderId: orderId! },
    { enabled: !!orderId && open }
  );

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Shared content for both Dialog and BottomSheet
  const renderContent = () => (
    <>
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-8">
          <Package className="h-16 w-16 text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      )}

      {order && (
        <div className="space-y-4">
            {/* Order Header */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <H3 className="text-xl">#{order.orderNumber}</H3>
                    <Muted>{formatDate(order.orderedAt)}</Muted>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <StatusBadge status={order.status as StatusType} />
                    <BackorderStatusBadge
                      status={(order.backorderStatus as BackorderStatusType) || 'none'}
                    />
                  </div>
                </div>

                {order.requestedDeliveryDate && (
                  <div>
                    <Muted className="text-sm">{t('requestedDelivery')}</Muted>
                    <p className="text-base">{formatDate(order.requestedDeliveryDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Backorder Information */}
            {order.backorderStatus && order.backorderStatus !== 'none' && (
              <Card className="border-info bg-info/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
                    <div>
                      <H3 className="text-base mb-1">{t('backorderStatus')}</H3>
                      <p className="text-sm text-muted-foreground">
                        {getBackorderInfoMessage((order.backorderStatus as BackorderStatusType) || 'none')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardContent className="p-4">
                <H3 className="text-lg mb-3">{t('items')}</H3>
                <div className="space-y-3">
                  {(order.items as OrderItem[]).map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <Muted className="text-sm">
                          SKU: {item.sku} | {item.unit}
                        </Muted>
                        <Muted className="text-sm">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </Muted>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <Muted>{tCommon('subtotal')}</Muted>
                  <p className="font-medium">{formatCurrency(order.subtotal)}</p>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <Muted>{tCommon('tax')}</Muted>
                    <p className="font-medium">{formatCurrency(order.taxAmount)}</p>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <p className="text-lg font-semibold">{tCommon('total')}</p>
                  <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <H3 className="text-lg mb-2">{t('deliveryAddress')}</H3>
                    <p className="text-base">
                      {(order.deliveryAddress as DeliveryAddress).street}
                      <br />
                      {(order.deliveryAddress as DeliveryAddress).suburb} {(order.deliveryAddress as DeliveryAddress).state}{' '}
                      {(order.deliveryAddress as DeliveryAddress).postcode}
                    </p>
                    {(order.deliveryAddress as DeliveryAddress).deliveryInstructions && (
                      <Muted className="mt-2">
                        {t('instructions')}: {(order.deliveryAddress as DeliveryAddress).deliveryInstructions}
                      </Muted>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proof of Delivery - Only for delivered orders */}
            {order.status === 'delivered' && (order.delivery as Delivery)?.proofOfDelivery && (
              <Card className="border-success bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <H3 className="text-base mb-2">{t('proofOfDelivery.title')}</H3>
                      <div className="flex items-center gap-3">
                        {/* POD Thumbnail */}
                        <button
                          onClick={() => setShowPodPreview(true)}
                          className="relative w-20 h-20 rounded-md overflow-hidden border-2 border-border hover:border-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <Image
                            src={(order.delivery as Delivery).proofOfDelivery!.fileUrl}
                            alt={t('proofOfDelivery.imageAlt')}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        </button>
                        <div>
                          <p className="text-sm font-medium">
                            {(order.delivery as Delivery).proofOfDelivery!.type === 'signature'
                              ? t('proofOfDelivery.signature')
                              : t('proofOfDelivery.photo')}
                          </p>
                          <Muted className="text-xs">
                            {t('proofOfDelivery.uploadedAt')}: {formatDate((order.delivery as Delivery).proofOfDelivery!.uploadedAt)}
                          </Muted>
                          {(order.delivery as Delivery).deliveredAt && (
                            <Muted className="text-xs">
                              {t('proofOfDelivery.deliveredAt')}: {formatDate((order.delivery as Delivery).deliveredAt!)}
                            </Muted>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowPodPreview(true)}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {t('proofOfDelivery.viewFull')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            {order.statusHistory && (order.statusHistory as StatusHistoryItem[]).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <H3 className="text-lg mb-3">{t('statusHistory')}</H3>
                  <div className="space-y-2">
                    {(order.statusHistory as StatusHistoryItem[]).map((history, index) => (
                      <div key={index} className="flex justify-between items-start text-sm">
                        <div>
                          <StatusBadge status={history.status as StatusType} />
                          {history.notes && <Muted className="ml-2">{history.notes}</Muted>}
                        </div>
                        <Muted>{formatDate(history.changedAt)}</Muted>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancel Order Button - Available before packing starts */}
            {(order.status === 'confirmed' || order.status === 'awaiting_approval') && (
              <div className="mt-4">
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {tOrders('cancel.title')}
                </Button>
              </div>
            )}
          </div>
        )}
    </>
  );

  return (
    <>
      {/* Mobile: BottomSheet */}
      {isMobile ? (
        <BottomSheet
          open={open}
          onClose={() => onOpenChange(false)}
          snapPoints={[0.9]}
          defaultSnap={0}
        >
          <div className="px-4 pb-4">
            <H3 className="text-lg font-semibold mb-4">{t('title')}</H3>
            {renderContent()}
          </div>
        </BottomSheet>
      ) : (
        /* Desktop: Dialog */
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
            </DialogHeader>
            {renderContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tOrders('cancel.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tOrders('cancel.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancelReason">{tOrders('cancel.reason')}</Label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
              placeholder={tOrders('cancel.reasonPlaceholder')}
              className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              {tOrders('cancel.keepOrder')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tOrders('cancel.cancelling')}
                </>
              ) : (
                tOrders('cancel.confirmCancel')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* POD Full Preview Modal */}
      {order && (order.delivery as Delivery)?.proofOfDelivery && showPodPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setShowPodPreview(false)}
        >
          <button
            onClick={() => setShowPodPreview(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={tCommon('close')}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={(order.delivery as Delivery).proofOfDelivery!.fileUrl}
              alt={t('proofOfDelivery.imageAlt')}
              width={1200}
              height={1200}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
              <p className="text-white text-sm font-medium">
                {(order.delivery as Delivery).proofOfDelivery!.type === 'signature'
                  ? t('proofOfDelivery.signature')
                  : t('proofOfDelivery.photo')}
              </p>
              <p className="text-white/80 text-xs">
                {t('proofOfDelivery.uploadedAt')}: {formatDate((order.delivery as Delivery).proofOfDelivery!.uploadedAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
