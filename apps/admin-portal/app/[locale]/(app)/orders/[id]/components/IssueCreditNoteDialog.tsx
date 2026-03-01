'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Checkbox,
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number; // cents
  applyGst?: boolean;
}

interface CreditNoteEntry {
  items: Array<{ productId: string; quantity: number }>;
}

interface IssueCreditNoteDialogProps {
  orderId: string;
  orderItems: OrderItem[];
  totalAmount: number; // cents
  existingCreditNotes: CreditNoteEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueCreditNoteDialog({
  orderId,
  orderItems,
  totalAmount,
  existingCreditNotes,
  open,
  onOpenChange,
}: IssueCreditNoteDialogProps) {
  const t = useTranslations('orderDetail.creditNote');
  const { toast } = useToast();
  const utils = api.useUtils();

  const [reason, setReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    Map<string, { checked: boolean; quantity: number }>
  >(new Map());

  // Build map of already credited quantities
  const creditedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cn of existingCreditNotes) {
      for (const item of cn.items) {
        map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
      }
    }
    return map;
  }, [existingCreditNotes]);

  // Calculate existing credits total
  const existingCreditsTotal = useMemo(() => {
    let total = 0;
    for (const cn of existingCreditNotes) {
      // Recalculate from items since amount might not be available
      for (const item of cn.items) {
        const orderItem = orderItems.find((oi) => oi.productId === item.productId);
        if (orderItem) {
          const subtotal = Math.round(orderItem.unitPrice * item.quantity);
          total += subtotal;
          if (orderItem.applyGst) {
            total += Math.round(subtotal * 0.1);
          }
        }
      }
    }
    return total;
  }, [existingCreditNotes, orderItems]);

  const toggleItem = useCallback(
    (productId: string, checked: boolean) => {
      setSelectedItems((prev) => {
        const next = new Map(prev);
        const alreadyCredited = creditedQtyMap.get(productId) || 0;
        const orderItem = orderItems.find((oi) => oi.productId === productId);
        const maxQty = (orderItem?.quantity || 0) - alreadyCredited;
        if (checked) {
          next.set(productId, { checked: true, quantity: maxQty > 0 ? maxQty : 0 });
        } else {
          next.delete(productId);
        }
        return next;
      });
    },
    [creditedQtyMap, orderItems]
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (existing) {
        next.set(productId, { ...existing, quantity });
      }
      return next;
    });
  }, []);

  // Compute totals
  const { subtotalCents, gstCents, totalCreditCents, hasSelectedItems } = useMemo(() => {
    let sub = 0;
    let gst = 0;
    let hasItems = false;
    for (const [productId, selection] of selectedItems) {
      if (!selection.checked || selection.quantity <= 0) continue;
      hasItems = true;
      const orderItem = orderItems.find((oi) => oi.productId === productId);
      if (!orderItem) continue;
      const itemSub = Math.round(orderItem.unitPrice * selection.quantity);
      sub += itemSub;
      if (orderItem.applyGst) {
        gst += Math.round(itemSub * 0.1);
      }
    }
    return {
      subtotalCents: sub,
      gstCents: gst,
      totalCreditCents: sub + gst,
      hasSelectedItems: hasItems,
    };
  }, [selectedItems, orderItems]);

  const remainingCreditable = totalAmount - existingCreditsTotal;
  const exceedsLimit = totalCreditCents > remainingCreditable;
  const nearLimit = totalCreditCents > remainingCreditable * 0.9 && !exceedsLimit;

  const mutation = api.xero.createPartialCreditNote.useMutation({
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('successMessage'),
      });
      void utils.order.getById.invalidate({ orderId });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setReason('');
    setSelectedItems(new Map());
  };

  const handleSubmit = () => {
    if (!reason.trim()) return;
    if (!hasSelectedItems) return;
    if (exceedsLimit) return;

    const items: Array<{ productId: string; quantity: number }> = [];
    for (const [productId, selection] of selectedItems) {
      if (selection.checked && selection.quantity > 0) {
        items.push({ productId, quantity: selection.quantity });
      }
    }

    mutation.mutate({
      orderId,
      reason: reason.trim(),
      items,
    });
  };

  const isDecimalUnit = (unit: string) => {
    return unit === 'kg' || unit === 'g' || unit === 'lb';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="credit-reason">{t('reason')}</Label>
            <textarea
              id="credit-reason"
              placeholder={t('reasonPlaceholder')}
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReason(e.target.value)
              }
              rows={3}
              maxLength={500}
              disabled={mutation.isPending}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {!reason.trim() && hasSelectedItems && (
              <p className="text-sm text-destructive">{t('reasonRequired')}</p>
            )}
          </div>

          {/* Items table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-3 py-2" />
                  <th className="text-left px-3 py-2">{t('product')}</th>
                  <th className="text-center px-3 py-2 whitespace-nowrap">
                    {t('originalQty')}
                  </th>
                  <th className="text-center px-3 py-2 whitespace-nowrap">
                    {t('alreadyCredited')}
                  </th>
                  <th className="text-center px-3 py-2 whitespace-nowrap">
                    {t('creditQty')}
                  </th>
                  <th className="text-right px-3 py-2">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => {
                  const alreadyCredited = creditedQtyMap.get(item.productId) || 0;
                  const maxQty = item.quantity - alreadyCredited;
                  const selection = selectedItems.get(item.productId);
                  const isChecked = selection?.checked || false;
                  const creditQty = selection?.quantity || 0;
                  const lineAmount = isChecked
                    ? Math.round(item.unitPrice * creditQty)
                    : 0;
                  const isFullyCredited = maxQty <= 0;

                  return (
                    <tr
                      key={item.productId}
                      className={`border-b last:border-b-0 ${isFullyCredited ? 'opacity-50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            toggleItem(item.productId, checked)
                          }
                          disabled={isFullyCredited || mutation.isPending}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.sku}
                        </div>
                      </td>
                      <td className="text-center px-3 py-2">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="text-center px-3 py-2">
                        {alreadyCredited > 0 ? (
                          <span className="text-orange-600">
                            {alreadyCredited} {item.unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-center px-3 py-2">
                        {isChecked && !isFullyCredited ? (
                          <input
                            type="number"
                            min={isDecimalUnit(item.unit) ? 0.01 : 1}
                            max={maxQty}
                            step={isDecimalUnit(item.unit) ? 0.01 : 1}
                            value={creditQty}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= maxQty) {
                                updateQuantity(item.productId, val);
                              }
                            }}
                            disabled={mutation.isPending}
                            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="text-right px-3 py-2 font-mono">
                        {isChecked && lineAmount > 0
                          ? formatAUD(lineAmount)
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          {hasSelectedItems && (
            <div className="border rounded-md p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-mono">{formatAUD(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('gst')}</span>
                <span className="font-mono">{formatAUD(gstCents)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>{t('totalCredit')}</span>
                <span className="font-mono">{formatAUD(totalCreditCents)}</span>
              </div>
            </div>
          )}

          {/* Warnings */}
          {nearLimit && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('nearLimitWarning')}
            </div>
          )}
          {exceedsLimit && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t('exceedsLimitError')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              mutation.isPending ||
              !hasSelectedItems ||
              !reason.trim() ||
              exceedsLimit
            }
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
