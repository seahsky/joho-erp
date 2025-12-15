'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, MapPin, Package } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';

interface Delivery {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  totalAmount: number;
  itemCount: number;
}

interface StartDeliveryDialogProps {
  delivery: Delivery | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function StartDeliveryDialog({
  delivery,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: StartDeliveryDialogProps) {
  const t = useTranslations('driver.startDialog');

  if (!delivery) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Info */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{delivery.orderNumber}</p>
              <p className="text-sm text-muted-foreground">{delivery.customerName}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatAUD(delivery.totalAmount)}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                <Package className="h-3 w-3" />
                {delivery.itemCount} items
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p>{delivery.address}</p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
