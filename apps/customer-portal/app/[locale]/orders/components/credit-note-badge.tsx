'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, H3, Muted } from '@joho-erp/ui';
import { AlertCircle } from 'lucide-react';

interface CreditNoteInfo {
  creditNoteId: string;
  creditNoteNumber: string;
}

interface CreditNoteBadgeProps {
  creditNote: CreditNoteInfo;
}

export function CreditNoteBadge({ creditNote }: CreditNoteBadgeProps) {
  const t = useTranslations('invoices');

  return (
    <Card className="border-info bg-info/5">
      <CardContent className="p-4 flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <H3 className="text-base mb-1">{t('creditNote')}</H3>
          <Muted className="text-sm">
            {t('creditNoteDescription')}
            <br />
            <span className="font-medium text-foreground">{creditNote.creditNoteNumber}</span>
          </Muted>
        </div>
      </CardContent>
    </Card>
  );
}
