'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
} from '@joho-erp/ui';
import { Settings, XCircle, RefreshCw, Loader2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

type OrderStatus =
  | 'awaiting_approval'
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled';

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  onStatusUpdated: () => void;
}

const STATUS_OPTIONS: OrderStatus[] = [
  'awaiting_approval',
  'confirmed',
  'packing',
  'ready_for_delivery',
  'delivered',
  'cancelled',
];

export function OrderActions({ orderId, currentStatus, onStatusUpdated }: OrderActionsProps) {
  const t = useTranslations('orderDetail');
  const tStatus = useTranslations('status');
  const { toast } = useToast();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('actions.statusUpdated'),
        description: t('actions.statusUpdatedMessage'),
      });
      setSelectedStatus('');
      onStatusUpdated();
    },
    onError: (error) => {
      toast({
        title: t('actions.statusError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resendConfirmationMutation = api.order.resendConfirmation.useMutation({
    onSuccess: () => {
      toast({
        title: t('actions.resendSuccess'),
        description: t('actions.resendSuccessMessage'),
      });
    },
    onError: (error) => {
      toast({
        title: t('actions.resendError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleResendConfirmation = () => {
    resendConfirmationMutation.mutate({ orderId });
  };

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;
    updateStatusMutation.mutate({
      orderId,
      newStatus: selectedStatus,
    });
  };

  const handleCancel = () => {
    updateStatusMutation.mutate({
      orderId,
      newStatus: 'cancelled',
    });
    setShowCancelDialog(false);
  };

  // Can only cancel if not already cancelled or delivered
  const canCancel = !['cancelled', 'delivered'].includes(currentStatus);

  // Filter out current status and invalid transitions
  const availableStatuses = STATUS_OPTIONS.filter((status) => {
    if (status === currentStatus) return false;
    // If cancelled, no status changes allowed
    if (currentStatus === 'cancelled') return false;
    // If delivered, only allow cancelled (for refunds)
    if (currentStatus === 'delivered') return status === 'cancelled';
    return true;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('actions.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Update Status */}
          {availableStatuses.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                {t('actions.updateStatus')}
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as OrderStatus | '')}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">{t('actions.selectStatus')}</option>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {tStatus(status)}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Order */}
          {canCancel && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('actions.cancel')}
            </Button>
          )}

          {/* Resend Confirmation (only for confirmed orders) */}
          {currentStatus === 'confirmed' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendConfirmation}
              disabled={resendConfirmationMutation.isPending}
            >
              {resendConfirmationMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {resendConfirmationMutation.isPending
                ? t('actions.resending')
                : t('actions.resendConfirmation')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actions.cancelConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>
              {t('actions.keepOrder')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={updateStatusMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('actions.cancelling')}
                </>
              ) : (
                t('actions.confirmCancel')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
