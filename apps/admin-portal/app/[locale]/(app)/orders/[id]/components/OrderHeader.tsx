'use client';

import { Button, StatusBadge, type StatusType } from '@joho-erp/ui';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@joho-erp/shared';
import { BackorderStatusBadge } from '../../components/BackorderStatusBadge';

interface OrderHeaderProps {
  orderNumber: string;
  customerName: string;
  orderedAt: Date | string;
  status: StatusType;
  // Fields needed for backorder decision inference
  stockShortfall?: unknown;
  approvedQuantities?: unknown;
  onBack: () => void;
}

export function OrderHeader({
  orderNumber,
  customerName,
  orderedAt,
  status,
  stockShortfall,
  approvedQuantities,
  onBack,
}: OrderHeaderProps) {
  const t = useTranslations('orderDetail');

  // Create order object for BackorderStatusBadge
  const order = { status, stockShortfall, approvedQuantities };

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToOrders')}
        </Button>
        <h1 className="text-3xl font-bold">
          {t('header.orderNumber', { number: orderNumber })}
        </h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <StatusBadge status={status} />
          {status !== 'cancelled' && status !== 'delivered' && (
            <BackorderStatusBadge order={order} />
          )}
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(orderedAt)}
          </span>
        </div>
        <p className="text-muted-foreground mt-1">{customerName}</p>
      </div>
    </div>
  );
}
