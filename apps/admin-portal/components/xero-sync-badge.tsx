'use client';

import { api } from '@/trpc/client';
import { Badge, Button, useToast } from '@joho-erp/ui';
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
}

interface XeroCustomerSyncBadgeProps {
  customerId: string;
  creditStatus?: string;
}

/**
 * Badge showing Xero invoice sync status for an order
 */
export function XeroOrderSyncBadge({ orderId, orderStatus }: XeroOrderSyncBadgeProps) {
  const t = useTranslations('xeroSync');
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
      toast({
        title: t('invoiceError'),
        description: error.message,
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

  // Order not delivered yet - no invoice expected
  if (orderStatus !== 'delivered' && orderStatus !== 'cancelled') {
    return (
      <Badge variant="secondary" title={t('awaitingDeliveryHint')}>
        <Clock className="h-3 w-3 mr-1" />
        {t('awaitingDelivery')}
      </Badge>
    );
  }

  // Has sync error
  if (syncStatus.syncError) {
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
      toast({
        title: t('contactError'),
        description: error.message,
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
