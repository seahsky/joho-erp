'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Label,
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { formatAUD, createMoney, multiplyMoney, toCents } from '@joho-erp/shared';
import { Loader2, CheckCircle2 } from 'lucide-react';

export interface ConfirmOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  requestedDeliveryDate: Date;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
}

export interface ConfirmOrderDialogProps {
  order: ConfirmOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { orderId: string; notes?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function ConfirmOrderDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: ConfirmOrderDialogProps) {
  const t = useTranslations('orders.confirmDialog');
  const { toast } = useToast();

  const [adminNotes, setAdminNotes] = useState('');

  if (!order) return null;

  const handleSubmit = async () => {
    try {
      await onConfirm({
        orderId: order.id,
        notes: adminNotes || undefined,
      });

      toast({
        title: t('success'),
        description: t('successMessage'),
      });

      // Reset form and close dialog
      setAdminNotes('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('orderDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('orderNumber')}</p>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('customer')}</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('requestedDate')}</p>
                  <p className="font-medium">
                    {new Date(order.requestedDeliveryDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('totalAmount')}</p>
                  <p className="font-medium">{formatAUD(order.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('itemsSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku} • {item.quantity} {item.unit}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatAUD(toCents(multiplyMoney(createMoney(item.unitPrice), item.quantity)))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Message */}
          <Card className="border-success bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t('confirmMessage')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('confirmMessageDescription')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes">{t('adminNotes')}</Label>
            <textarea
              id="adminNotes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t('adminNotesPlaceholder')}
              value={adminNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? t('confirming') : t('confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

ConfirmOrderDialog.displayName = 'ConfirmOrderDialog';
