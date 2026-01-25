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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
} from '@joho-erp/ui';
import { Check, Minus } from 'lucide-react';
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

  // Mark consumed confirmation state
  const [showConsumedConfirm, setShowConsumedConfirm] = useState(false);

  // Adjust quantity dialog state
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [newQuantity, setNewQuantity] = useState(currentQuantity.toString());

  // Mutations
  const markConsumedMutation = api.inventory.markBatchConsumed.useMutation({
    onSuccess: () => {
      toast({
        title: t('markConsumedSuccess'),
      });
      setShowConsumedConfirm(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t('markConsumedError'),
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

  const handleMarkConsumed = () => {
    markConsumedMutation.mutate({ batchId });
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
          onClick={() => setShowConsumedConfirm(true)}
          title={t('markConsumed')}
        >
          <Check className="h-4 w-4" />
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

      {/* Mark Consumed Confirmation */}
      <AlertDialog open={showConsumedConfirm} onOpenChange={setShowConsumedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('markConsumedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('markConsumedDescription', {
                product: productName,
                quantity: currentQuantity.toFixed(1),
                unit,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markConsumedMutation.isPending}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkConsumed}
              disabled={markConsumedMutation.isPending}
            >
              {markConsumedMutation.isPending ? t('processing') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="sm:max-w-[400px]">
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
