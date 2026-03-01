'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

interface TransactionSummary {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productUnit: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes: string | null;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionSummary;
  onSuccess: () => void;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: EditTransactionDialogProps) {
  const t = useTranslations('inventory.editTransaction');
  const { toast } = useToast();
  const utils = api.useUtils();

  const [newQuantity, setNewQuantity] = useState(Math.abs(transaction.quantity).toString());
  const [notes, setNotes] = useState(transaction.notes || '');
  const [editReason, setEditReason] = useState('');

  const editMutation = api.inventory.editTransaction.useMutation({
    onSuccess: () => {
      toast({ title: t('success') });
      void utils.inventory.getWriteOffHistory.invalidate();
      void utils.inventory.getProcessingHistory.invalidate();
      void utils.inventory.getPackingHistory.invalidate();
      void utils.product.getAll.invalidate();
      void utils.dashboard.getInventorySummary.invalidate();
      onSuccess();
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editReason.trim()) {
      toast({ title: t('validation.editReasonRequired'), variant: 'destructive' });
      return;
    }

    const parsedQuantity = parseFloat(newQuantity);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return;
    }

    // If original quantity was negative (deduction), send as negative
    const actualQuantity = transaction.quantity < 0 ? -parsedQuantity : parsedQuantity;

    editMutation.mutate({
      transactionId: transaction.id,
      newQuantity: actualQuantity,
      notes: notes || null,
      editReason: editReason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Read-only current values */}
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">{t('currentValues')}</p>
            <p className="text-sm">
              <span className="text-muted-foreground">{t('product')}:</span>{' '}
              {transaction.productName} ({transaction.productSku})
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">{t('currentQuantity')}:</span>{' '}
              <span className={transaction.quantity > 0 ? 'text-success' : 'text-destructive'}>
                {transaction.quantity > 0 ? '+' : ''}{transaction.quantity.toFixed(1)} {transaction.productUnit}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {transaction.previousStock} → {transaction.newStock}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('fields.newQuantity')} ({transaction.productUnit})</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
            {/* Stock impact preview */}
            {newQuantity !== Math.abs(transaction.quantity).toString() && (
              <p className="text-xs text-muted-foreground">
                {t('stockImpact')}: {transaction.quantity < 0 ? 'Deducting' : 'Adding'} {newQuantity} instead of {Math.abs(transaction.quantity).toFixed(1)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('fields.notes')}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('fields.editReason')} *</Label>
            <Input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={t('placeholders.editReason')}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
