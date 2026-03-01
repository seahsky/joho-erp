'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  useToast,
} from '@joho-erp/ui';
import { RefreshCw, CheckCircle, Clock, AlertTriangle, Loader2, Download, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate, formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';
import { IssueCreditNoteDialog } from './IssueCreditNoteDialog';

interface CreditNoteEntry {
  creditNoteId: string;
  creditNoteNumber: string;
  amount: number; // cents
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

interface XeroSyncCardProps {
  xero?: XeroInfo | null;
  orderId: string;
  orderItems?: OrderItem[];
  totalAmount?: number; // cents
}

export function XeroSyncCard({ xero, orderId, orderItems, totalAmount }: XeroSyncCardProps) {
  const t = useTranslations('orderDetail');
  const { toast } = useToast();
  const utils = api.useUtils();
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);

  const retryMutation = api.xero.retryJob.useMutation({
    onSuccess: () => {
      toast({
        title: t('xero.retrySuccess'),
        description: t('xero.retrySuccessMessage'),
      });
      void utils.order.getById.invalidate({ orderId });
    },
    onError: (error) => {
      toast({
        title: t('xero.retryError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRetry = () => {
    if (xero?.lastSyncJobId) {
      retryMutation.mutate({ jobId: xero.lastSyncJobId });
    }
  };

  const handleDownloadInvoice = () => {
    // Open the local PDF proxy endpoint which fetches from Xero
    window.open(`/api/invoices/${orderId}/pdf`, '_blank');
  };

  const getSyncStatus = () => {
    if (!xero) return 'not_synced';
    if (xero.syncError) return 'failed';
    if (xero.invoiceId) return 'synced';
    return 'pending';
  };

  const status = getSyncStatus();

  const statusConfig = {
    synced: {
      icon: CheckCircle,
      label: t('xero.synced'),
      variant: 'default' as const,
      className: 'bg-success text-success-foreground',
    },
    pending: {
      icon: Clock,
      label: t('xero.pending'),
      variant: 'secondary' as const,
      className: '',
    },
    failed: {
      icon: AlertTriangle,
      label: t('xero.failed'),
      variant: 'destructive' as const,
      className: '',
    },
    not_synced: {
      icon: Clock,
      label: t('xero.notSynced'),
      variant: 'outline' as const,
      className: '',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const creditNotes = xero?.creditNotes || [];
  const totalCredits = creditNotes.reduce((sum, cn) => sum + (cn.amount || 0), 0);
  const invoiceStatus = xero?.invoiceStatus;
  const canIssueCreditNote =
    xero?.invoiceId &&
    (invoiceStatus === 'PAID' || invoiceStatus === 'AUTHORISED') &&
    orderItems &&
    totalAmount &&
    totalCredits < totalAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          {t('xero.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('xero.status')}</span>
          <Badge variant={config.variant} className={config.className}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        {/* Invoice Number */}
        {xero?.invoiceNumber && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('xero.invoiceNumber')}</span>
            <span className="font-mono text-sm font-medium">{xero.invoiceNumber}</span>
          </div>
        )}

        {/* Legacy Credit Note (full refund) */}
        {xero?.creditNoteNumber && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('xero.creditNote')}</span>
            <span className="font-mono text-sm">{xero.creditNoteNumber}</span>
          </div>
        )}

        {/* Partial Credit Notes */}
        {creditNotes.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('xero.creditNotes')}</span>
            <div className="space-y-1.5">
              {creditNotes.map((cn) => (
                <div
                  key={cn.creditNoteId}
                  className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2"
                >
                  <div>
                    <span className="font-mono">{cn.creditNoteNumber}</span>
                    <span className="text-muted-foreground ml-2">— {cn.reason}</span>
                  </div>
                  <span className="font-mono font-medium">{formatAUD(cn.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
              <span>{t('xero.totalCredits')}</span>
              <span className="font-mono">{formatAUD(totalCredits)}</span>
            </div>
          </div>
        )}

        {/* Last Synced */}
        {xero?.syncedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('xero.lastSynced')}</span>
            <span className="text-sm">{formatDate(xero.syncedAt)}</span>
          </div>
        )}

        {/* Error Message */}
        {xero?.syncError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{xero.syncError}</p>
          </div>
        )}

        {/* Retry Button */}
        {status === 'failed' && xero?.lastSyncJobId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retryMutation.isPending}
            className="w-full"
          >
            {retryMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('xero.retrying')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('xero.retry')}
              </>
            )}
          </Button>
        )}

        {/* Download Invoice Button */}
        {xero?.invoiceId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadInvoice}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('xero.downloadInvoice')}
          </Button>
        )}

        {/* Issue Credit Note Button */}
        {canIssueCreditNote && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreditNoteDialogOpen(true)}
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {t('xero.issueCreditNote')}
          </Button>
        )}

        {/* Issue Credit Note Dialog */}
        {canIssueCreditNote && (
          <IssueCreditNoteDialog
            orderId={orderId}
            orderItems={orderItems!}
            totalAmount={totalAmount!}
            existingCreditNotes={creditNotes}
            open={creditNoteDialogOpen}
            onOpenChange={setCreditNoteDialogOpen}
          />
        )}
      </CardContent>
    </Card>
  );
}
