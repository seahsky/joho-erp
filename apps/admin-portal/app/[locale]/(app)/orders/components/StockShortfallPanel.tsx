'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

export interface StockShortfallItem {
  productId: string;
  productName: string;
  sku: string;
  requested: number;
  available: number;
  shortfall: number;
  unit: string;
}

export interface StockShortfallPanelProps {
  items: StockShortfallItem[];
}

export function StockShortfallPanel({ items }: StockShortfallPanelProps) {
  const t = useTranslations('orders.backorderDialog');

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {t('stockAvailability')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => {
            const availabilityPercent = item.requested > 0
              ? Math.round((item.available / item.requested) * 100)
              : 0;

            return (
              <div key={item.productId} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">{item.sku}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('requestedQty')}</p>
                    <p className="font-medium">
                      {item.requested} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('availableQty')}</p>
                    <p className="font-medium text-info">
                      {item.available} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('shortfall')}</p>
                    <p className="font-medium text-destructive">
                      {item.shortfall} {item.unit}
                    </p>
                  </div>
                </div>

                {/* Progress bar showing stock coverage */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{availabilityPercent}% available</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        availabilityPercent >= 75
                          ? 'bg-success'
                          : availabilityPercent >= 50
                          ? 'bg-info'
                          : availabilityPercent >= 25
                          ? 'bg-warning'
                          : 'bg-destructive'
                      }`}
                      style={{ width: `${availabilityPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

StockShortfallPanel.displayName = 'StockShortfallPanel';
