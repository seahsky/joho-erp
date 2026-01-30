'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, H3, Label, Muted, StatusBadge, type StatusType } from '@joho-erp/ui';
import { formatAUD } from '@joho-erp/shared';

interface CustomerInvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'CREDITED' | 'VOIDED';
  subtotal?: number;
  totalTax?: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  isLive?: boolean;
  syncedAt?: string;
}

interface InvoiceDetailsCardProps {
  invoice: CustomerInvoiceData;
}

// Map Xero statuses to UI statuses
function mapInvoiceStatus(status: string): StatusType {
  const statusMap: Record<string, StatusType> = {
    DRAFT: 'pending',
    SUBMITTED: 'pending',
    AUTHORISED: 'approved',
    PAID: 'delivered',
    CREDITED: 'cancelled',
    VOIDED: 'cancelled',
  };
  return statusMap[status] || 'pending';
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function InvoiceDetailsCard({ invoice }: InvoiceDetailsCardProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');

  const subtotal = invoice.subtotal ?? invoice.total - (invoice.totalTax || 0);
  const totalTax = invoice.totalTax || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <H3 className="text-lg">{invoice.invoiceNumber}</H3>
            <Muted className="text-sm">{formatDate(invoice.date)}</Muted>
          </div>
          <StatusBadge status={mapInvoiceStatus(invoice.status)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invoice Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t('invoiceDate')}</Label>
            <p className="text-sm font-medium">{formatDate(invoice.date)}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('dueDate')}</Label>
            <p className="text-sm font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t" />

        {/* Amounts */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{tCommon('subtotal')}</span>
            <span className="text-sm font-medium">{formatAUD(subtotal)}</span>
          </div>

          {totalTax > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('gst')}</span>
              <span className="text-sm font-medium">{formatAUD(totalTax)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-base font-semibold">{tCommon('total')}</span>
            <span className="text-base font-bold">{formatAUD(invoice.total)}</span>
          </div>

          {/* Payment Status */}
          {invoice.status !== 'PAID' && invoice.amountDue !== undefined && invoice.amountDue > 0 && (
            <div className="flex justify-between items-center pt-2 text-orange-600">
              <span className="text-sm font-medium">{t('amountDue')}</span>
              <span className="text-sm font-bold">{formatAUD(invoice.amountDue)}</span>
            </div>
          )}

          {invoice.status === 'PAID' && invoice.amountPaid !== undefined && (
            <div className="flex justify-between items-center pt-2 text-green-600">
              <span className="text-sm font-medium">{t('amountPaid')}</span>
              <span className="text-sm font-bold">{formatAUD(invoice.amountPaid)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
