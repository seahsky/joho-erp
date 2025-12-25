'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';

interface ProgressIndicatorProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
    status?: string;
  }>;
  completedCount: number;
}

export function ProgressIndicator({ orders, completedCount }: ProgressIndicatorProps) {
  const t = useTranslations('packing');

  const totalOrders = orders.length;
  const completedOrders = completedCount;
  const progressPercentage = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          {t('progress')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('ordersPacked')}</span>
            <span className="font-medium">
              {completedOrders} / {totalOrders}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {progressPercentage.toFixed(0)}% {t('complete')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
