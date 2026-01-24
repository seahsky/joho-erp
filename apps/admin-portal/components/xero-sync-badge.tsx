'use client';

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
} from '@joho-erp/ui';
import {
  XCircle,
  Clock,
  Loader2,
  RefreshCcw,
  FileText,
  User,
  AlertTriangle,
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

    // Just has invoice
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
      <Badge
        variant="success"
        title={`${t('invoice')}: ${syncStatus.invoiceNumber}\n${t('status')}: ${syncStatus.invoiceStatus}`}
      >
        <FileText className="h-3 w-3 mr-1" />
        {syncStatus.invoiceNumber || t('invoiced')}
      </Badge>
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

  const {
    data: syncStatus,
    isLoading,
    refetch,
  } = api.xero.getCustomerSyncStatus.useQuery({ customerId });

  const syncContactMutation = api.xero.syncContact.useMutation({
    onSuccess: () => {
      toast({
        title: t('contactQueued'),
        description: t('contactQueuedDescription'),
      });
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

  // Customer synced to Xero
  if (syncStatus.synced && syncStatus.contactId) {
    return (
      <Badge
        variant="success"
        title={`${t('xeroContact')}: ${syncStatus.contactId.slice(-8)}`}
      >
        <User className="h-3 w-3 mr-1" />
        {t('synced')}
      </Badge>
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
        onClick={() => syncContactMutation.mutate({ customerId })}
        disabled={syncContactMutation.isPending}
      >
        {syncContactMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <User className="h-4 w-4 mr-1" />
        )}
        {t('syncContact')}
      </Button>
    </div>
  );
}
