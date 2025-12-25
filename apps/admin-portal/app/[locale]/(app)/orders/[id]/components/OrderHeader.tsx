'use client';

import { Button, StatusBadge, type StatusType } from '@joho-erp/ui';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@joho-erp/shared';
import { BackorderStatusBadge, type BackorderStatusType } from '../../components/BackorderStatusBadge';

interface OrderHeaderProps {
  orderNumber: string;
  customerName: string;
  orderedAt: Date | string;
  status: StatusType;
  backorderStatus: BackorderStatusType;
  onBack: () => void;
}

export function OrderHeader({
  orderNumber,
  customerName,
  orderedAt,
  status,
  backorderStatus,
  onBack,
}: OrderHeaderProps) {
  const t = useTranslations('orderDetail');

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
          <BackorderStatusBadge status={backorderStatus} />
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
