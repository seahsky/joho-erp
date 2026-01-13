'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, AlertCircle, FileText } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@joho-erp/ui';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui';
import { InvoiceDetailsCard } from './invoice-details-card';
import { CreditNoteBadge } from './credit-note-badge';

type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'CREDITED' | 'VOIDED';

interface CreditNoteInfo {
  creditNoteId: string;
  creditNoteNumber: string;
}

interface InvoiceData {
  invoiceId?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  subtotal?: number;
  totalTax?: number;
  total?: number;
  amountPaid?: number;
  amountDue?: number;
  isLive?: boolean;
  syncedAt?: string;
  creditNote?: CreditNoteInfo;
}

interface InvoiceSectionProps {
  orderId: string;
}

export function InvoiceSection({ orderId }: InvoiceSectionProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const { toast } = useToast();

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
  const invoiceData = invoice as unknown as InvoiceData;
  const safeInvoice = {
    invoiceId: invoiceData.invoiceId || '',
    invoiceNumber: invoiceData.invoiceNumber || 'N/A',
    date: invoiceData.date || '',
    dueDate: invoiceData.dueDate || '',
    status: (invoiceData.status || 'AUTHORISED') as InvoiceStatus,
    subtotal: invoiceData.subtotal || 0,
    totalTax: invoiceData.totalTax || 0,
    total: invoiceData.total || 0,
    amountPaid: invoiceData.amountPaid,
    amountDue: invoiceData.amountDue,
    isLive: invoiceData.isLive || false,
    syncedAt: invoiceData.syncedAt,
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
      {invoiceData.creditNote && <CreditNoteBadge creditNote={invoiceData.creditNote} />}

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
