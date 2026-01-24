'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Skeleton,
} from '@joho-erp/ui';
import {
  Package,
  Calendar,
  DollarSign,
  Truck,
  Building2,
  Thermometer,
  FileText,
  Layers,
  TrendingDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface BatchInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string | null;
}

export function BatchInfoDialog({
  open,
  onOpenChange,
  batchId,
}: BatchInfoDialogProps) {
  const t = useTranslations('inventory.batchDetail');
  const tDashboard = useTranslations('dashboard.expiringInventory');

  const { data: batch, isLoading } = api.inventory.getBatchById.useQuery(
    { batchId: batchId! },
    { enabled: !!batchId && open }
  );

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getExpiryBadge = () => {
    if (!batch?.expiryDate || batch.daysUntilExpiry === null) return null;

    if (batch.isExpired) {
      return (
        <Badge variant="destructive">
          {tDashboard('expiredDays', { days: Math.abs(batch.daysUntilExpiry) })}
        </Badge>
      );
    }

    if (batch.daysUntilExpiry <= 7) {
      return (
        <Badge variant="warning">
          {tDashboard('expiresIn', { days: batch.daysUntilExpiry })}
        </Badge>
      );
    }

    return (
      <Badge variant="success">
        {tDashboard('expiresIn', { days: batch.daysUntilExpiry })}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : batch ? (
              batch.product.name
            ) : (
              t('notFound')
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : batch ? (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="space-y-2">
              <p className="font-semibold text-lg">{batch.product.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{batch.product.sku}</span>
                {batch.product.category && (
                  <Badge variant="outline">{batch.product.category}</Badge>
                )}
              </div>
            </div>

            {/* Stock Remaining - Prominent Display */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">{t('quantityRemaining')}</p>
                  <p className="text-3xl font-bold">
                    {batch.quantityRemaining.toFixed(1)}
                    <span className="text-lg font-normal text-muted-foreground ml-1">
                      {batch.product.unit}
                    </span>
                  </p>
                </div>
                <div className="text-center flex-1 border-l pl-4">
                  <p className="text-sm text-muted-foreground">{t('initialQuantity')}</p>
                  <p className="text-xl font-semibold">
                    {batch.initialQuantity.toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {batch.product.unit}
                    </span>
                  </p>
                </div>
              </div>
              {batch.utilizationRate > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      {t('consumed')}
                    </span>
                    <span className="font-medium">{batch.utilizationRate.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${batch.utilizationRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expiry & Value Info */}
            <div className="space-y-3">
              {batch.expiryDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('expiryDate')}:</span>
                    <span className="font-medium">{formatDate(batch.expiryDate)}</span>
                  </div>
                  {getExpiryBadge()}
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('costPerUnit')}:</span>
                <span className="font-medium">{formatAUD(batch.costPerUnit)}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('totalValue')}:</span>
                <span className="font-medium">{formatAUD(batch.totalValue)}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('receivedAt')}:</span>
                <span className="font-medium">{formatDate(batch.receivedAt)}</span>
              </div>
            </div>

            {/* Traceability Info */}
            {(batch.supplier ||
              batch.supplierInvoiceNumber ||
              batch.stockInDate ||
              batch.mtvNumber ||
              batch.vehicleTemperature != null) && (
              <div className="pt-4 border-t space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  {t('traceabilityInfo')}
                </h4>

                {batch.supplier && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('supplier')}:</span>
                    <span className="font-medium">{batch.supplier.businessName}</span>
                  </div>
                )}

                {batch.stockInDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('stockInDate')}:</span>
                    <span className="font-medium">{formatDate(batch.stockInDate)}</span>
                  </div>
                )}

                {batch.supplierInvoiceNumber && (
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('invoiceNumber')}:</span>
                    <span className="font-medium">{batch.supplierInvoiceNumber}</span>
                  </div>
                )}

                {batch.mtvNumber && (
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('mtvNumber')}:</span>
                    <span className="font-medium">{batch.mtvNumber}</span>
                  </div>
                )}

                {batch.vehicleTemperature != null && (
                  <div className="flex items-center gap-3 text-sm">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('vehicleTemperature')}:</span>
                    <span className="font-medium">{batch.vehicleTemperature}°C</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {batch.notes && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{t('notes')}:</span>
                  <span className="font-medium flex-1">{batch.notes}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {t('notFound')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
