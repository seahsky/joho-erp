'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  useToast,
} from '@joho-erp/ui';
import { RefreshCw, CheckCircle, Clock, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface XeroInfo {
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
  creditNoteId?: string | null;
  creditNoteNumber?: string | null;
  syncedAt?: Date | string | null;
  syncError?: string | null;
  lastSyncJobId?: string | null;
}

interface XeroSyncCardProps {
  xero?: XeroInfo | null;
  orderId: string;
}

export function XeroSyncCard({ xero, orderId }: XeroSyncCardProps) {
  const t = useTranslations('orderDetail');
  const { toast } = useToast();
  const utils = api.useUtils();

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

  // Query for invoice PDF URL - only enabled when invoice exists
  const { data: pdfData, isLoading: isPdfLoading, refetch: refetchPdf } = api.xero.getInvoicePdfUrlForOrder.useQuery(
    { orderId },
    { enabled: !!xero?.invoiceId }
  );

  const handleRetry = () => {
    if (xero?.lastSyncJobId) {
      retryMutation.mutate({ jobId: xero.lastSyncJobId });
    }
  };

  const handleDownloadInvoice = () => {
    if (pdfData?.url) {
      window.open(pdfData.url, '_blank');
    } else {
      // Try to refetch if URL not available
      void refetchPdf();
    }
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

        {/* Credit Note */}
        {xero?.creditNoteNumber && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('xero.creditNote')}</span>
            <span className="font-mono text-sm">{xero.creditNoteNumber}</span>
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
            disabled={isPdfLoading}
            className="w-full"
          >
            {isPdfLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('xero.loading')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('xero.downloadInvoice')}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
