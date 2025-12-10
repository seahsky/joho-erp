'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Badge,
} from '@joho-erp/ui';
import {
  Loader2,
  Package,
  TrendingUp,
  TrendingDown,
  History,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

type AdjustmentType =
  | 'stock_received'
  | 'stock_count_correction'
  | 'damaged_goods'
  | 'expired_stock';

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('stockAdjustment');

  // Form state
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('stock_received');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch stock history
  const { data: historyData, isLoading: historyLoading } = api.product.getStockHistory.useQuery(
    { productId: product?.id || '', limit: 10 },
    { enabled: !!product?.id && open }
  );

  const adjustStockMutation = api.product.adjustStock.useMutation({
    onSuccess: () => {
      toast({
        title: t('messages.success'),
      });
      handleReset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('messages.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate new stock preview
  const newStock = useMemo(() => {
    if (!product) return 0;
    const qty = parseFloat(quantity) || 0;
    return product.currentStock + qty;
  }, [product, quantity]);

  const isNegativeResult = newStock < 0;
  const quantityNum = parseFloat(quantity) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    // Validation
    if (!quantity || quantityNum === 0) {
      toast({
        title: t('validation.quantityRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!notes.trim()) {
      toast({
        title: t('validation.notesRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (isNegativeResult) {
      toast({
        title: t('validation.cannotGoNegative'),
        variant: 'destructive',
      });
      return;
    }

    await adjustStockMutation.mutateAsync({
      productId: product.id,
      adjustmentType,
      quantity: quantityNum,
      notes: notes.trim(),
    });
  };

  const handleReset = () => {
    setAdjustmentType('stock_received');
    setQuantity('');
    setNotes('');
  };

  const getTransactionTypeLabel = (type: string, adjType?: string | null) => {
    if (type === 'sale') return 'Sale';
    if (type === 'return') return 'Return';
    if (type === 'adjustment' && adjType) {
      const typeLabels: Record<string, string> = {
        stock_received: t('types.stock_received'),
        stock_count_correction: t('types.stock_count_correction'),
        damaged_goods: t('types.damaged_goods'),
        expired_stock: t('types.expired_stock'),
      };
      return typeLabels[adjType] || adjType;
    }
    return type;
  };

  const getTransactionTypeBadgeVariant = (
    type: string
  ): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (type) {
      case 'sale':
        return 'destructive';
      case 'return':
        return 'default';
      case 'adjustment':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('dialog.title')}
          </DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>

        {/* Product Info */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-lg">{product.name}</div>
              <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">{t('fields.currentStock')}</div>
              <div className="text-2xl font-bold">
                {product.currentStock} <span className="text-sm font-normal">{product.unit}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type */}
          <div>
            <Label htmlFor="adjustmentType">{t('fields.adjustmentType')}</Label>
            <select
              id="adjustmentType"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              className="w-full px-3 py-2 border rounded-md mt-1"
            >
              <option value="stock_received">{t('types.stock_received')}</option>
              <option value="stock_count_correction">{t('types.stock_count_correction')}</option>
              <option value="damaged_goods">{t('types.damaged_goods')}</option>
              <option value="expired_stock">{t('types.expired_stock')}</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {adjustmentType === 'stock_received' && t('typeDescriptions.stock_received')}
              {adjustmentType === 'stock_count_correction' && t('typeDescriptions.stock_count_correction')}
              {adjustmentType === 'damaged_goods' && t('typeDescriptions.damaged_goods')}
              {adjustmentType === 'expired_stock' && t('typeDescriptions.expired_stock')}
            </p>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">{t('fields.quantity')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="quantity"
                type="number"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
              <span className="text-muted-foreground">{product.unit}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('fields.quantityHint')}</p>
          </div>

          {/* New Stock Preview */}
          {quantity && (
            <div
              className={`p-3 rounded-lg border ${
                isNegativeResult
                  ? 'bg-red-50 border-red-200'
                  : quantityNum > 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {quantityNum > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-orange-600" />
                  )}
                  <span className="text-sm font-medium">{t('fields.newStock')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{product.currentStock}</span>
                  <span>{quantityNum >= 0 ? '+' : ''}</span>
                  <span className={quantityNum >= 0 ? 'text-green-600' : 'text-orange-600'}>
                    {quantityNum}
                  </span>
                  <span>=</span>
                  <span className={`font-bold ${isNegativeResult ? 'text-red-600' : ''}`}>
                    {newStock} {product.unit}
                  </span>
                </div>
              </div>
              {isNegativeResult && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t('validation.cannotGoNegative')}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">{t('fields.notes')} *</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('fields.notesPlaceholder')}
              rows={3}
              className="mt-1 w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={adjustStockMutation.isPending}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={adjustStockMutation.isPending || isNegativeResult || !quantity || !notes.trim()}
            >
              {adjustStockMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('buttons.save')}
            </Button>
          </div>
        </form>

        {/* Stock History */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            <h3 className="font-semibold">{t('history.title')}</h3>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : historyData?.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('history.noTransactions')}
            </p>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">{t('history.date')}</th>
                    <th className="text-left p-2">{t('history.type')}</th>
                    <th className="text-right p-2">{t('history.quantity')}</th>
                    <th className="text-right p-2">{t('history.after')}</th>
                    <th className="text-left p-2">{t('history.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData?.transactions.map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="p-2 text-muted-foreground">
                        {format(new Date(tx.createdAt), 'MMM d, HH:mm')}
                      </td>
                      <td className="p-2">
                        <Badge variant={getTransactionTypeBadgeVariant(tx.type)}>
                          {getTransactionTypeLabel(tx.type, tx.adjustmentType)}
                        </Badge>
                      </td>
                      <td
                        className={`p-2 text-right font-medium ${
                          tx.quantity >= 0 ? 'text-green-600' : 'text-orange-600'
                        }`}
                      >
                        {tx.quantity >= 0 ? '+' : ''}
                        {tx.quantity}
                      </td>
                      <td className="p-2 text-right">{tx.newStock}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-[150px]" title={tx.notes || ''}>
                        {tx.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
