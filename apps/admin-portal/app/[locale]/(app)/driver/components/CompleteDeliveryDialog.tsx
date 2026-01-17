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
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle } from 'lucide-react';

interface Delivery {
  id: string;
  orderNumber: string;
  customerName: string;
  hasProofOfDelivery: boolean;
}

interface CompleteDeliveryDialogProps {
  delivery: Delivery | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CompleteDeliveryDialog({
  delivery,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: CompleteDeliveryDialogProps) {
  const t = useTranslations('driver.completeDialog');
  const tMessages = useTranslations('driver.messages');
  const { toast } = useToast();
  const [notes, setNotes] = useState('');

  if (!delivery) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm(notes || undefined);
      toast({
        title: tMessages('completeSuccess'),
      });
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: tMessages('error'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const hasPOD = delivery.hasProofOfDelivery;

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

          {/* POD Status */}
          {hasPOD ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-success/10 text-success rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{t('podUploaded')}</span>
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-center text-sm">
              {t('podRequired')}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="deliveryNotes">{t('notes')}</Label>
            <textarea
              id="deliveryNotes"
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
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting || !hasPOD}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? t('completing') : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
