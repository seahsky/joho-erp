'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle2, Package, User } from 'lucide-react';
import React, { useState } from 'react';

interface DeliveryData {
  id: string;
  orderId: string;
  customer: string;
}

interface MarkDeliveredDialogProps {
  delivery: DeliveryData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function MarkDeliveredDialog({
  delivery,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: MarkDeliveredDialogProps) {
  const t = useTranslations('deliveries.markDeliveredDialog');
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    await onConfirm(notes || undefined);
    setNotes(''); // Reset notes after confirm
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNotes(''); // Reset notes when closing
    }
    onOpenChange(isOpen);
  };

  if (!delivery) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Order Details */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">{t('orderNumber')}</div>
                <div className="font-medium">{delivery.orderId}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">{t('customer')}</div>
                <div className="font-medium">{delivery.customer}</div>
              </div>
            </div>
          </div>

          
          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notesLabel')}</Label>
            <textarea
              id="notes"
              placeholder={t('notesPlaceholder')}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? t('completing') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
