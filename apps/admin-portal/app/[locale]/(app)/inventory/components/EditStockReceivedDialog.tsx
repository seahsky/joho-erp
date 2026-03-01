'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Skeleton,
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { formatAUD, formatCentsForInput, parseToCents } from '@joho-erp/shared';

interface EditStockReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  onSuccess: () => void;
}

export function EditStockReceivedDialog({
  open,
  onOpenChange,
  batchId,
  onSuccess,
}: EditStockReceivedDialogProps) {
  const t = useTranslations('inventory.editBatch');
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: batch, isLoading } = api.inventory.getBatchById.useQuery(
    { batchId },
    { enabled: open && !!batchId }
  );

  // Form state
  const [initialQuantity, setInitialQuantity] = useState('');
  const [quantityRemaining, setQuantityRemaining] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [stockInDate, setStockInDate] = useState('');
  const [mtvNumber, setMtvNumber] = useState('');
  const [vehicleTemperature, setVehicleTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [editReason, setEditReason] = useState('');

  // Populate form when batch data loads
  useEffect(() => {
    if (batch) {
      setInitialQuantity(batch.initialQuantity.toString());
      setQuantityRemaining(batch.quantityRemaining.toString());
      setCostPerUnit(formatCentsForInput(batch.costPerUnit));
      setExpiryDate(batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '');
      setSupplierInvoiceNumber(batch.supplierInvoiceNumber || '');
      setStockInDate(batch.stockInDate ? new Date(batch.stockInDate).toISOString().split('T')[0] : '');
      setMtvNumber(batch.mtvNumber || '');
      setVehicleTemperature(batch.vehicleTemperature?.toString() || '');
      setNotes(batch.notes || '');
      setEditReason('');
    }
  }, [batch]);

  const editMutation = api.inventory.editStockReceivedBatch.useMutation({
    onSuccess: () => {
      toast({ title: t('success') });
      void utils.inventory.getStockReceivedHistory.invalidate();
      void utils.inventory.getBatchById.invalidate();
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

    const parsedCost = parseToCents(costPerUnit);
    if (parsedCost === null) {
      toast({ title: t('error'), description: 'Invalid cost value', variant: 'destructive' });
      return;
    }

    const parsedQtyRemaining = parseFloat(quantityRemaining);
    if (isNaN(parsedQtyRemaining) || parsedQtyRemaining < 0) {
      toast({ title: t('validation.quantityNegative'), variant: 'destructive' });
      return;
    }

    editMutation.mutate({
      batchId,
      initialQuantity: parseFloat(initialQuantity),
      quantityRemaining: parsedQtyRemaining,
      costPerUnit: parsedCost,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      supplierInvoiceNumber: supplierInvoiceNumber || null,
      stockInDate: stockInDate ? new Date(stockInDate) : null,
      mtvNumber: mtvNumber || null,
      vehicleTemperature: vehicleTemperature ? parseFloat(vehicleTemperature) : null,
      notes: notes || null,
      editReason: editReason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : batch ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Product info (read-only) */}
            <div className="rounded-md bg-muted p-3">
              <p className="font-medium">{batch.product.name}</p>
              <p className="text-sm text-muted-foreground">{batch.product.sku} | {batch.batchNumber || 'No batch #'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('fields.initialQuantity')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fields.quantityRemaining')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={quantityRemaining}
                  onChange={(e) => setQuantityRemaining(e.target.value)}
                />
              </div>
            </div>

            {/* Stock impact preview */}
            {batch && quantityRemaining !== batch.quantityRemaining.toString() && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium mb-1">{t('stockImpact')}</p>
                <p className="text-muted-foreground">
                  {t('currentStock')}: {batch.product?.currentStock ?? 0} →{' '}
                  {t('afterEdit')}: {((batch.product?.currentStock ?? 0) + (parseFloat(quantityRemaining) || 0) - batch.quantityRemaining).toFixed(1)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('fields.costPerUnit')}</Label>
              <Input
                type="text"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="0.00"
              />
              {costPerUnit && parseToCents(costPerUnit) !== null && (
                <p className="text-xs text-muted-foreground">{formatAUD(parseToCents(costPerUnit)!)}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('fields.expiryDate')}</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fields.stockInDate')}</Label>
                <Input
                  type="date"
                  value={stockInDate}
                  onChange={(e) => setStockInDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.invoiceNumber')}</Label>
              <Input
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('fields.mtvNumber')}</Label>
                <Input
                  value={mtvNumber}
                  onChange={(e) => setMtvNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('fields.vehicleTemperature')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={vehicleTemperature}
                  onChange={(e) => setVehicleTemperature(e.target.value)}
                />
              </div>
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
