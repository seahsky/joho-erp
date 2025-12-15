'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Label,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

type ReturnReason =
  | 'customer_unavailable'
  | 'address_not_found'
  | 'refused_delivery'
  | 'damaged_goods'
  | 'other';

interface Delivery {
  id: string;
  orderNumber: string;
  customerName: string;
}

interface ReturnDialogProps {
  delivery: Delivery | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: ReturnReason, notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ReturnDialog({
  delivery,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: ReturnDialogProps) {
  const t = useTranslations('driver.returnDialog');
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [notes, setNotes] = useState('');

  if (!delivery) return null;

  const handleConfirm = async () => {
    if (!reason) return;
    await onConfirm(reason, notes || undefined);
    setReason('');
    setNotes('');
  };

  const reasons: ReturnReason[] = [
    'customer_unavailable',
    'address_not_found',
    'refused_delivery',
    'damaged_goods',
    'other',
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Info */}
          <div className="text-center">
            <p className="font-semibold">{delivery.orderNumber}</p>
            <p className="text-sm text-muted-foreground">{delivery.customerName}</p>
          </div>

          {/* Return Reason */}
          <div className="space-y-2">
            <Label htmlFor="returnReason">{t('reason')}</Label>
            <select
              id="returnReason"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setReason(e.target.value as ReturnReason)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t('selectReason')}</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="returnNotes">{t('notes')}</Label>
            <textarea
              id="returnNotes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              rows={2}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting || !reason}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? t('returning') : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
