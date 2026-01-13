'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, AlertCircle, FileText } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Skeleton, useIsMobile, type StatusType } from '@joho-erp/ui';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui';
import { InvoiceDetailsCard } from './invoice-details-card';
import { CreditNoteBadge } from './credit-note-badge';

interface InvoiceSectionProps {
  orderId: string;
}

export function InvoiceSection({ orderId }: InvoiceSectionProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data: invoice, isLoading, error } = api.order.getOrderInvoice.useQuery({
    orderId,
  });

  const { data: pdfUrl, isLoading: pdfLoading } = api.order.getInvoicePdfUrl.useQuery(
    { orderId },
    { enabled: !!invoice?.invoiceId }
  );

  const handleDownloadPdf = () => {
    if (!pdfUrl) {
      toast({
        title: t('errors.fetchFailed'),
        description: t('errors.tryAgain'),
        variant: 'destructive',
      });
      return;
    }

    // Open PDF in new window for download
    window.open(pdfUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !invoice || !invoice.invoiceId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-lg font-medium">{t('noInvoice')}</p>
          <p className="text-sm text-muted-foreground">{t('noInvoiceDescription')}</p>
        </div>
      </div>
    );
  }

  // Type-safe invoice data - handle both API response types
  const safeInvoice = {
    invoiceId: (invoice as any).invoiceId || '',
    invoiceNumber: (invoice as any).invoiceNumber || 'N/A',
    date: (invoice as any).date || '',
    dueDate: (invoice as any).dueDate || '',
    status: ((invoice as any).status || 'AUTHORISED') as 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'CREDITED' | 'VOIDED',
    subtotal: (invoice as any).subtotal || 0,
    totalTax: (invoice as any).totalTax || 0,
    total: (invoice as any).total || 0,
    amountPaid: (invoice as any).amountPaid,
    amountDue: (invoice as any).amountDue,
    isLive: (invoice as any).isLive || false,
    syncedAt: (invoice as any).syncedAt,
  };

  return (
    <div className="space-y-4">
      {/* Show offline warning if not live data */}
      {!safeInvoice.isLive && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{t('offlineMode')}</p>
              {safeInvoice.syncedAt && (
                <p className="text-xs text-muted-foreground">
                  {t('lastUpdated')}: {new Date(safeInvoice.syncedAt).toLocaleDateString()} {new Date(safeInvoice.syncedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details */}
      <InvoiceDetailsCard invoice={safeInvoice} />

      {/* Credit Note Badge */}
      {(invoice as any).creditNote && <CreditNoteBadge creditNote={(invoice as any).creditNote} />}

      {/* Download Button */}
      <Button
        onClick={handleDownloadPdf}
        disabled={!pdfUrl || pdfLoading || !safeInvoice.isLive}
        className="w-full"
      >
        <Download className="h-4 w-4 mr-2" />
        {t('downloadPdf')}
        {!safeInvoice.isLive && ' (' + tCommon('unavailable') + ')'}
      </Button>
    </div>
  );
}
