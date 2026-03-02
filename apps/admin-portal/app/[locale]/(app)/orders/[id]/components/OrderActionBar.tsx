'use client';

import { useState } from 'react';
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@joho-erp/ui';
import { useIsMobileOrTablet } from '@joho-erp/ui';
import {
  ChevronRight,
  Mail,
  UserPlus,
  Download,
  RefreshCw,
  CreditCard,
  XCircle,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useHasPermission } from '@/components/permission-provider';
import { DriverAssignmentDialog } from './DriverAssignmentDialog';
import { IssueCreditNoteDialog } from './IssueCreditNoteDialog';

interface CreditNoteEntry {
  creditNoteId: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  items: Array<{ productId: string; quantity: number }>;
  createdAt: Date | string;
  createdBy: string;
}

interface XeroInfo {
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  creditNoteId?: string | null;
  creditNoteNumber?: string | null;
  creditNotes?: CreditNoteEntry[];
  syncedAt?: Date | string | null;
  syncError?: string | null;
  lastSyncJobId?: string | null;
}

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  applyGst?: boolean;
}

interface OrderActionBarProps {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  deliveryAreaId?: string | null;
  currentDriverId?: string | null;
  currentDriverName?: string | null;
  xero: XeroInfo | null;
  orderItems: OrderItem[];
  totalAmount: number;
  onStatusUpdated: () => void;
}

type OrderStatus =
  | 'awaiting_approval'
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled';

const FORWARD_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  awaiting_approval: 'confirmed',
  confirmed: 'packing',
  packing: 'ready_for_delivery',
  ready_for_delivery: 'delivered',
};

const PRIMARY_LABEL_KEY: Partial<Record<OrderStatus, string>> = {
  awaiting_approval: 'moveToConfirmed',
  confirmed: 'moveToPacking',
  packing: 'moveToReadyForDelivery',
  ready_for_delivery: 'moveToDelivered',
};

function ActionButton({
  disabled,
  tooltip,
  children,
  ...buttonProps
}: React.ComponentProps<typeof Button> & { tooltip?: string }) {
  if (disabled && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button {...buttonProps} disabled>
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button {...buttonProps} disabled={disabled}>
      {children}
    </Button>
  );
}

export function OrderActionBar({
  orderId,
  orderNumber,
  currentStatus,
  deliveryAreaId,
  currentDriverId,
  currentDriverName,
  xero,
  orderItems,
  totalAmount,
  onStatusUpdated,
}: OrderActionBarProps) {
  const t = useTranslations('orderDetail');
  const { toast } = useToast();
  const isMobileOrTablet = useIsMobileOrTablet();
  const canManageDeliveries = useHasPermission('deliveries:manage');

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);

  // --- Mutations ---
  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('actions.statusUpdated'),
        description: t('actions.statusUpdatedMessage'),
      });
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

  const retryMutation = api.xero.retryJob.useMutation({
    onSuccess: () => {
      toast({
        title: t('xero.retrySuccess'),
        description: t('xero.retrySuccessMessage'),
      });
      onStatusUpdated();
    },
    onError: (error) => {
      toast({
        title: t('xero.retryError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // --- Derived state ---
  const isCancelled = currentStatus === 'cancelled';
  const status = currentStatus as OrderStatus;
  const nextStatus = FORWARD_STEP[status];
  const primaryLabelKey = PRIMARY_LABEL_KEY[status];

  // Primary: can move forward?
  const canMoveForward = !!nextStatus && !isCancelled;
  const primaryDisabledTooltip = isCancelled
    ? t('actionBar.orderCancelled')
    : t('actionBar.noTransitionsAvailable');

  // Resend confirmation
  const canResend = currentStatus === 'confirmed';
  const resendTooltip = isCancelled
    ? t('actionBar.orderCancelled')
    : t('actionBar.resendDisabled');

  // Assign driver
  const canAssignDriverByStatus = ['ready_for_delivery', 'out_for_delivery'].includes(currentStatus);
  const canAssignDriver = canAssignDriverByStatus && canManageDeliveries && !isCancelled;
  const assignDriverTooltip = isCancelled
    ? t('actionBar.orderCancelled')
    : !canAssignDriverByStatus
      ? t('actionBar.assignDriverDisabled')
      : t('actionBar.assignDriverNoPermission');

  // Download invoice
  const canDownloadInvoice = !!xero?.invoiceId && !isCancelled;
  const downloadInvoiceTooltip = isCancelled
    ? t('actionBar.orderCancelled')
    : t('actionBar.downloadInvoiceDisabled');

  // Retry sync
  const canRetrySync = xero?.syncError && !!xero?.lastSyncJobId && !isCancelled;

  // Issue credit note
  const creditNotes = xero?.creditNotes || [];
  const totalCredits = creditNotes.reduce((sum, cn) => sum + (cn.amount || 0), 0);
  const invoiceStatus = xero?.invoiceStatus;
  const hasInvoice = !!xero?.invoiceId;
  const isPaidOrAuthorised = invoiceStatus === 'PAID' || invoiceStatus === 'AUTHORISED';
  const canIssueCreditNote = hasInvoice && isPaidOrAuthorised && totalCredits < totalAmount && !isCancelled;

  // Cancel
  const canCancel = !isCancelled;

  // --- Handlers ---
  const handlePrimaryAction = () => {
    if (!nextStatus) return;
    updateStatusMutation.mutate({ orderId, newStatus: nextStatus });
  };

  const handleResend = () => {
    resendConfirmationMutation.mutate({ orderId });
  };

  const handleDownloadInvoice = () => {
    window.open(`/api/invoices/${orderId}/pdf`, '_blank');
  };

  const handleRetrySync = () => {
    if (xero?.lastSyncJobId) {
      retryMutation.mutate({ jobId: xero.lastSyncJobId });
    }
  };

  const handleCancel = () => {
    updateStatusMutation.mutate({ orderId, newStatus: 'cancelled' });
    setShowCancelDialog(false);
  };

  // --- Render helpers ---
  const primaryButton = (
    <ActionButton
      variant="default"
      disabled={!canMoveForward || updateStatusMutation.isPending}
      tooltip={!canMoveForward ? primaryDisabledTooltip : undefined}
      onClick={handlePrimaryAction}
    >
      {updateStatusMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <ChevronRight className="h-4 w-4 mr-2" />
      )}
      {primaryLabelKey ? t(`actionBar.${primaryLabelKey}`) : t('actionBar.noTransitionsAvailable')}
    </ActionButton>
  );

  const resendButton = (
    <ActionButton
      variant="outline"
      disabled={!canResend || resendConfirmationMutation.isPending}
      tooltip={!canResend ? resendTooltip : undefined}
      onClick={handleResend}
    >
      {resendConfirmationMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      {t('actionBar.resendConfirmation')}
    </ActionButton>
  );

  const assignDriverButton = (
    <ActionButton
      variant="outline"
      disabled={!canAssignDriver}
      tooltip={!canAssignDriver ? assignDriverTooltip : undefined}
      onClick={() => setIsDriverDialogOpen(true)}
    >
      <UserPlus className="h-4 w-4 mr-2" />
      {currentDriverName ? t('actionBar.changeDriver') : t('actionBar.assignDriver')}
    </ActionButton>
  );

  const downloadInvoiceButton = (
    <ActionButton
      variant="outline"
      disabled={!canDownloadInvoice}
      tooltip={!canDownloadInvoice ? downloadInvoiceTooltip : undefined}
      onClick={handleDownloadInvoice}
    >
      <Download className="h-4 w-4 mr-2" />
      {t('actionBar.downloadInvoice')}
    </ActionButton>
  );

  const cancelButton = (
    <ActionButton
      variant="destructive"
      disabled={!canCancel || updateStatusMutation.isPending}
      tooltip={!canCancel ? t('actionBar.orderCancelled') : undefined}
      onClick={() => setShowCancelDialog(true)}
    >
      <XCircle className="h-4 w-4 mr-2" />
      {t('actionBar.cancelOrder')}
    </ActionButton>
  );

  // More dropdown items (retry sync, issue credit note)
  const moreDropdownItems = (
    <>
      <DropdownMenuItem
        disabled={!canRetrySync || retryMutation.isPending}
        onClick={handleRetrySync}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {t('actionBar.retrySyncButton')}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!canIssueCreditNote}
        onClick={() => setCreditNoteDialogOpen(true)}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {t('actionBar.issueCreditNote')}
      </DropdownMenuItem>
    </>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-16 z-40 bg-background border-b mb-6 -mx-4 px-4 py-3">
        {isMobileOrTablet ? (
          // Mobile: primary + cancel visible, rest in dropdown
          <div className="flex items-center gap-2">
            {primaryButton}
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!canResend || resendConfirmationMutation.isPending}
                    onClick={handleResend}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t('actionBar.resendConfirmation')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canAssignDriver}
                    onClick={() => setIsDriverDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {currentDriverName ? t('actionBar.changeDriver') : t('actionBar.assignDriver')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canDownloadInvoice}
                    onClick={handleDownloadInvoice}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('actionBar.downloadInvoice')}
                  </DropdownMenuItem>
                  {moreDropdownItems}
                </DropdownMenuContent>
              </DropdownMenu>
              {cancelButton}
            </div>
          </div>
        ) : (
          // Desktop: all buttons inline
          <div className="flex flex-wrap items-center gap-2">
            {primaryButton}
            {resendButton}
            {assignDriverButton}
            {downloadInvoiceButton}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {t('actionBar.moreActions')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {moreDropdownItems}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="ml-auto">
              {cancelButton}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentStatus === 'delivered'
                ? t('actions.cancelDeliveredConfirm')
                : t('actions.cancelConfirm')}
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

      {/* Driver Assignment Dialog */}
      <DriverAssignmentDialog
        orderId={orderId}
        orderNumber={orderNumber}
        areaId={deliveryAreaId}
        currentDriverId={currentDriverId}
        currentDriverName={currentDriverName}
        open={isDriverDialogOpen}
        onOpenChange={setIsDriverDialogOpen}
        onAssigned={() => onStatusUpdated()}
      />

      {/* Issue Credit Note Dialog */}
      <IssueCreditNoteDialog
        orderId={orderId}
        orderItems={orderItems}
        totalAmount={totalAmount}
        existingCreditNotes={creditNotes}
        open={creditNoteDialogOpen}
        onOpenChange={setCreditNoteDialogOpen}
      />
    </TooltipProvider>
  );
}
