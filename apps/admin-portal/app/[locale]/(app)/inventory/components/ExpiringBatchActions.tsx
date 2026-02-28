'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from '@joho-erp/ui';
import { Trash2, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

interface ExpiringBatchActionsProps {
  batchId: string;
  productName: string;
  currentQuantity: number;
  unit: string;
  onSuccess: () => void;
}

export function ExpiringBatchActions({
  batchId,
  productName,
  currentQuantity,
  unit,
  onSuccess,
}: ExpiringBatchActionsProps) {
  const t = useTranslations('inventory.expiringList.actions');
  const { toast } = useToast();

  // Write off dialog state
  const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState('');

  // Adjust quantity dialog state
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [newQuantity, setNewQuantity] = useState(currentQuantity.toString());

  // Mutations
  const markConsumedMutation = api.inventory.markBatchConsumed.useMutation({
    onSuccess: () => {
      toast({
        title: t('writeOffSuccess'),
      });
      setShowWriteOffDialog(false);
      setWriteOffReason('');
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t('writeOffError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateQuantityMutation = api.inventory.updateBatchQuantity.useMutation({
    onSuccess: () => {
      toast({
        title: t('adjustSuccess'),
      });
      setShowAdjustDialog(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t('adjustError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleWriteOff = () => {
    markConsumedMutation.mutate({ batchId, reason: writeOffReason || undefined });
  };

  const handleAdjustQuantity = () => {
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: t('invalidQuantity'),
        variant: 'destructive',
      });
      return;
    }
    updateQuantityMutation.mutate({ batchId, newQuantity: qty });
  };

  return (
    <>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowWriteOffDialog(true)}
          title={t('writeOff')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setNewQuantity(currentQuantity.toString());
            setShowAdjustDialog(true);
          }}
          title={t('adjust')}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Write Off Dialog */}
      <Dialog
        open={showWriteOffDialog}
        onOpenChange={(open) => {
          setShowWriteOffDialog(open);
          if (!open) setWriteOffReason('');
        }}
      >
        <DialogContent
          className="sm:max-w-[400px]"
          onClick={(e) => e.stopPropagation()}
          onPointerDownOutside={(e) => e.stopPropagation()}
          onInteractOutside={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t('writeOffTitle')}</DialogTitle>
            <DialogDescription>
              {t('writeOffDescription', {
                product: productName,
                quantity: currentQuantity.toFixed(1),
                unit,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="writeOffReason">{t('writeOffReason')}</Label>
              <Input
                id="writeOffReason"
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder={t('writeOffReasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWriteOffDialog(false);
                setWriteOffReason('');
              }}
              disabled={markConsumedMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleWriteOff}
              disabled={markConsumedMutation.isPending}
            >
              {markConsumedMutation.isPending ? t('processing') : t('writeOff')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent
          className="sm:max-w-[400px]"
          onClick={(e) => e.stopPropagation()}
          onPointerDownOutside={(e) => e.stopPropagation()}
          onInteractOutside={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t('adjustTitle')}</DialogTitle>
            <DialogDescription>
              {t('adjustDescription', { product: productName })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="currentQuantity">{t('currentQuantity')}</Label>
              <Input
                id="currentQuantity"
                value={`${currentQuantity.toFixed(1)} ${unit}`}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newQuantity">{t('newQuantity')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="newQuantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="0.0"
                />
                <span className="text-sm text-muted-foreground">{unit}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdjustDialog(false)}
              disabled={updateQuantityMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleAdjustQuantity}
              disabled={updateQuantityMutation.isPending}
            >
              {updateQuantityMutation.isPending ? t('processing') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
