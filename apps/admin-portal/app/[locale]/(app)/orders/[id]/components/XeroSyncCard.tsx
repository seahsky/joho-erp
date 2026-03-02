'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@joho-erp/ui';
import { RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate, formatAUD } from '@joho-erp/shared';

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

interface XeroSyncCardProps {
  xero?: XeroInfo | null;
}

export function XeroSyncCard({ xero }: XeroSyncCardProps) {
  const t = useTranslations('orderDetail');

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
      </CardContent>
    </Card>
  );
}
