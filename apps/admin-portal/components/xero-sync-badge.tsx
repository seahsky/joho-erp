'use client';

import { useState } from 'react';
import { api } from '@/trpc/client';
import {
  Badge,
  Button,
  useToast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@joho-erp/ui';
import {
  XCircle,
  Clock,
  Loader2,
  RefreshCcw,
  FileText,
  User,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface XeroOrderSyncBadgeProps {
  orderId: string;
  orderStatus: string;
  compact?: boolean;
}

interface XeroCustomerSyncBadgeProps {
  customerId: string;
  creditStatus?: string;
}

const variantBackgroundClasses: Record<string, string> = {
  secondary: 'bg-secondary text-secondary-foreground',
  warning: 'bg-warning text-warning-foreground',
  success: 'bg-success text-success-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

function CompactIcon({
  icon: Icon,
  variant,
  tooltipContent,
  animated = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  variant: 'secondary' | 'success' | 'warning' | 'destructive';
  tooltipContent: React.ReactNode;
  animated?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-center h-6 w-6 rounded-full cursor-help',
              variantBackgroundClasses[variant]
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', animated && 'animate-spin')} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Badge showing Xero invoice sync status for an order
 */
export function XeroOrderSyncBadge({
  orderId,
  orderStatus,
  compact = false,
}: XeroOrderSyncBadgeProps) {
  const t = useTranslations('xeroSync');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();

  const {
    data: syncStatus,
    isLoading,
    refetch,
  } = api.xero.getOrderSyncStatus.useQuery({ orderId });

  const createInvoiceMutation = api.xero.createInvoice.useMutation({
    onSuccess: () => {
      toast({
        title: t('invoiceQueued'),
        description: t('invoiceQueuedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      console.error('Invoice creation error:', error.message);
      toast({
        title: t('invoiceError'),
        description: tErrors('syncFailed'),
        variant: 'destructive',
      });
    },
  });

  const resyncInvoiceMutation = api.xero.resyncInvoice.useMutation({
    onSuccess: () => {
      toast({
        title: t('resyncQueued'),
        description: t('resyncQueuedMessage'),
      });
      refetch();
    },
    onError: (error) => {
      console.error('Invoice resync error:', error.message);
      toast({
        title: t('resyncError'),
        description: tErrors('syncFailed'),
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    if (compact) {
      return (
        <CompactIcon
          icon={Loader2}
          variant="secondary"
          tooltipContent={<span>{t('label')}: {t('loading')}</span>}
          animated
        />
      );
    }
    return (
      <Badge variant="secondary">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        {t('loading')}
      </Badge>
    );
  }

  if (!syncStatus) {
    return null;
  }

  // Hide badge if Xero integration is disabled
  if (!syncStatus.integrationEnabled) {
    return null;
  }

  // Order not delivered yet - no invoice expected
  if (orderStatus !== 'delivered' && orderStatus !== 'cancelled') {
    if (compact) {
      return (
        <CompactIcon
          icon={Clock}
          variant="secondary"
          tooltipContent={<span>{t('label')}: {t('awaitingDelivery')}</span>}
        />
      );
    }
    return (
      <Badge variant="secondary" title={t('awaitingDeliveryHint')}>
        <Clock className="h-3 w-3 mr-1" />
        {t('awaitingDelivery')}
      </Badge>
    );
  }

  // Has sync error
  if (syncStatus.syncError) {
    if (compact) {
      return (
        <CompactIcon
          icon={XCircle}
          variant="destructive"
          tooltipContent={
            <div className="text-sm">
              <p className="font-medium">{t('label')}: {t('syncFailed')}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {syncStatus.syncError}
              </p>
            </div>
          }
        />
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" title={syncStatus.syncError}>
          <XCircle className="h-3 w-3 mr-1" />
          {t('syncFailed')}
        </Badge>
        {orderStatus === 'delivered' && !syncStatus.invoiceId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => createInvoiceMutation.mutate({ orderId })}
            disabled={createInvoiceMutation.isPending}
          >
            {createInvoiceMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  }

  // Has invoice
  if (syncStatus.invoiceId) {
    // Also has credit note (cancelled order)
    if (syncStatus.creditNoteId) {
      if (compact) {
        return (
          <CompactIcon
            icon={AlertTriangle}
            variant="warning"
            tooltipContent={
              <div className="text-sm">
                <p className="font-medium">{t('label')}: {t('credited')}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {t('invoice')}: {syncStatus.invoiceNumber}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('creditNote')}: {syncStatus.creditNoteNumber}
                </p>
              </div>
            }
          />
        );
      }
      return (
        <Badge
          variant="secondary"
          className="bg-warning/10 text-warning"
          title={`${t('invoice')}: ${syncStatus.invoiceNumber}\n${t('creditNote')}: ${syncStatus.creditNoteNumber}`}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t('credited')}
        </Badge>
      );
    }

    // Just has invoice - show resync button if not PAID/VOIDED/DELETED
    const canResync =
      syncStatus.invoiceStatus?.toUpperCase() !== 'PAID' &&
      syncStatus.invoiceStatus?.toUpperCase() !== 'VOIDED' &&
      syncStatus.invoiceStatus?.toUpperCase() !== 'DELETED';

    if (compact) {
      return (
        <CompactIcon
          icon={FileText}
          variant="success"
          tooltipContent={
            <div className="text-sm">
              <p className="font-medium">
                {t('label')}: {syncStatus.invoiceNumber || t('invoiced')}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {t('status')}: {syncStatus.invoiceStatus}
              </p>
            </div>
          }
        />
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="success"
          title={`${t('invoice')}: ${syncStatus.invoiceNumber}\n${t('status')}: ${syncStatus.invoiceStatus}`}
        >
          <FileText className="h-3 w-3 mr-1" />
          {syncStatus.invoiceNumber || t('invoiced')}
        </Badge>
        {canResync && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={resyncInvoiceMutation.isPending}
              >
                {resyncInvoiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('resyncConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('resyncConfirmMessage')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel') || 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resyncInvoiceMutation.mutate({ orderId })}
                >
                  {t('resyncConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Delivered but no invoice yet - allow manual creation
  if (orderStatus === 'delivered') {
    if (compact) {
      return (
        <CompactIcon
          icon={Clock}
          variant="secondary"
          tooltipContent={<span>{t('label')}: {t('notSynced')}</span>}
        />
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          {t('notSynced')}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => createInvoiceMutation.mutate({ orderId })}
          disabled={createInvoiceMutation.isPending}
        >
          {createInvoiceMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <FileText className="h-4 w-4 mr-1" />
          )}
          {t('createInvoice')}
        </Button>
      </div>
    );
  }

  return null;
}

/**
 * Badge showing Xero contact sync status for a customer
 */
export function XeroCustomerSyncBadge({
  customerId,
  creditStatus,
}: XeroCustomerSyncBadgeProps) {
  const t = useTranslations('xeroSync');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isResync, setIsResync] = useState(false);

  const {
    data: syncStatus,
    isLoading,
    refetch,
  } = api.xero.getCustomerSyncStatus.useQuery({ customerId });

  const {
    data: previewData,
    isLoading: isPreviewLoading,
  } = api.xero.previewContactSync.useQuery(
    { customerId },
    { enabled: isPreviewDialogOpen }
  );

  const syncContactMutation = api.xero.syncContact.useMutation({
    onSuccess: () => {
      toast({
        title: t('contactQueued'),
        description: t('contactQueuedDescription'),
      });
      setIsPreviewDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      console.error('Contact sync error:', error.message);
      toast({
        title: t('contactError'),
        description: tErrors('syncFailed'),
        variant: 'destructive',
      });
    },
  });

  const resyncContactMutation = api.xero.resyncContact.useMutation({
    onSuccess: () => {
      toast({
        title: t('resyncQueued'),
        description: t('resyncQueuedMessage'),
      });
      setIsPreviewDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      console.error('Contact resync error:', error.message);
      toast({
        title: t('resyncError'),
        description: error.message || tErrors('syncFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleOpenPreview = (resync: boolean) => {
    setIsResync(resync);
    setIsPreviewDialogOpen(true);
  };

  const handleConfirmSync = () => {
    if (isResync) {
      resyncContactMutation.mutate({ customerId });
    } else {
      syncContactMutation.mutate({ customerId });
    }
  };

  const isSyncing = syncContactMutation.isPending || resyncContactMutation.isPending;

  if (isLoading) {
    return (
      <Badge variant="secondary">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        {t('loading')}
      </Badge>
    );
  }

  if (!syncStatus) {
    return null;
  }

  // Customer not approved - no sync expected
  if (creditStatus !== 'approved') {
    return (
      <Badge variant="secondary" title={t('awaitingApprovalHint')}>
        <Clock className="h-3 w-3 mr-1" />
        {t('awaitingApproval')}
      </Badge>
    );
  }

  const formatAddress = (address: { street: string; suburb: string; state: string; postcode: string } | null) => {
    if (!address) return null;
    return [address.street, address.suburb, address.state, address.postcode]
      .filter(Boolean)
      .join(', ');
  };

  const previewDialog = (
    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isResync ? t('resyncPreview.title') : t('syncPreview.title')}
          </DialogTitle>
          <DialogDescription>
            {isResync ? t('resyncPreview.description') : t('syncPreview.description')}
          </DialogDescription>
        </DialogHeader>

        {isPreviewLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              {t('syncPreview.loading')}
            </span>
          </div>
        ) : previewData ? (
          <div className="space-y-4">
            {/* Xero Match Status */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-sm font-medium">{t('syncPreview.xeroMatchStatus')}</h4>
              {previewData.existingXeroContact ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="font-medium">{t('syncPreview.existingContactFound')}</p>
                    <p className="text-muted-foreground">
                      {previewData.existingXeroContact.name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4 text-blue-500" />
                  <p>{t('syncPreview.newContactWillBeCreated')}</p>
                </div>
              )}
              {isResync && (
                <p className="text-xs text-amber-600 mt-1">
                  {t('syncPreview.resyncWarning')}
                </p>
              )}
            </div>

            {/* Customer Data Summary */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-sm font-medium">{t('syncPreview.customerDataSummary')}</h4>
              <div className="grid gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('syncPreview.fields.businessName')}</span>
                  <span className="font-medium text-right">{previewData.customerData.businessName}</span>
                </div>
                {previewData.customerData.tradingName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('syncPreview.fields.tradingName')}</span>
                    <span className="font-medium text-right">{previewData.customerData.tradingName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('syncPreview.fields.contact')}</span>
                  <span className="font-medium text-right">{previewData.customerData.contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('syncPreview.fields.email')}</span>
                  <span className="font-medium text-right">{previewData.customerData.email}</span>
                </div>
                {previewData.customerData.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('syncPreview.fields.phone')}</span>
                    <span className="font-medium text-right">{previewData.customerData.phone}</span>
                  </div>
                )}
                {previewData.customerData.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('syncPreview.fields.address')}</span>
                    <span className="font-medium text-right text-xs max-w-[200px]">
                      {formatAddress(previewData.customerData.deliveryAddress)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsPreviewDialogOpen(false)}
            disabled={isSyncing}
          >
            {t('cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirmSync}
            disabled={isSyncing || isPreviewLoading}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                {t('syncPreview.syncing')}
              </>
            ) : isResync ? (
              t('resyncConfirm')
            ) : (
              t('syncContact')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Customer synced to Xero
  if (syncStatus.synced && syncStatus.contactId) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="success"
          title={`${t('xeroContact')}: ${syncStatus.contactId.slice(-8)}`}
        >
          <User className="h-3 w-3 mr-1" />
          {t('synced')}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          disabled={resyncContactMutation.isPending}
          onClick={() => handleOpenPreview(true)}
        >
          {resyncContactMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
        {previewDialog}
      </div>
    );
  }

  // Approved but not synced - allow manual sync
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        {t('notSynced')}
      </Badge>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenPreview(false)}
        disabled={syncContactMutation.isPending}
      >
        {syncContactMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <User className="h-4 w-4 mr-1" />
        )}
        {t('syncContact')}
      </Button>
      {previewDialog}
    </div>
  );
}
