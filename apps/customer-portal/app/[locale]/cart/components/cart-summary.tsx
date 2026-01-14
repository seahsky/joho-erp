'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  H3,
  Badge,
} from '@joho-erp/ui';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/client';
import { CutoffReminder } from '@/components/cutoff-reminder';

interface CartItem {
  productId: string;
  applyGst: boolean;
  gstRate: number;
  itemGst: number; // in cents
  quantity: number;
}

interface CartSummaryProps {
  subtotalCents: number; // in cents
  gstCents: number; // in cents
  totalCents: number; // in cents
  exceedsCredit: boolean;
  creditLimitCents: number; // in cents
  locale: string;
  items?: CartItem[]; // Optional cart items for GST breakdown
}

export function CartSummary({
  subtotalCents,
  gstCents,
  totalCents,
  exceedsCredit,
  creditLimitCents,
  locale,
  items = [],
}: CartSummaryProps) {
  const t = useTranslations('cart');
  const router = useRouter();

  // Calculate GST breakdown
  const gstAppliedCount = items.filter((item) => item.applyGst).length;
  const gstExemptCount = items.length - gstAppliedCount;
  const hasMultipleGstRates = gstAppliedCount > 0 && gstExemptCount > 0;

  // Fetch cutoff info
  const { data: cutoffInfo } = api.order.getCutoffInfo.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  const handleCheckout = () => {
    // Navigate to checkout page (to be implemented)
    router.push(`/${locale}/checkout`);
  };

  return (
    <Card className="sticky top-24 shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <H3 className="text-xl">{t('orderSummary')}</H3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{t('subtotal')}</span>
          <span className="font-medium">{formatAUD(subtotalCents)}</span>
        </div>

        {/* GST */}
        {gstCents > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground">{t('tax')}</span>
              {/* Show breakdown for mixed GST rates */}
              {hasMultipleGstRates && (
                <span className="text-xs text-muted-foreground">
                  {gstAppliedCount} {t('gstBreakdown.withGst')} · {gstExemptCount}{' '}
                  {t('gstBreakdown.exempt')}
                </span>
              )}
            </div>
            <span className="font-medium">{formatAUD(gstCents)}</span>
          </div>
        )}

        <div className="border-t pt-4">
          {/* Total */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">{t('orderTotal')}</span>
            <span className="text-2xl font-bold text-primary">{formatAUD(totalCents)}</span>
          </div>

          {/* Credit Limit Info */}
          {creditLimitCents > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('availableCredit')}</span>
                <span className="font-medium">{formatAUD(creditLimitCents)}</span>
              </div>
            </div>
          )}

          {/* Cutoff Reminder */}
          {cutoffInfo && (
            <div className="mb-4">
              <CutoffReminder
                cutoffTime={cutoffInfo.cutoffTime}
                isAfterCutoff={cutoffInfo.isAfterCutoff}
                nextAvailableDate={new Date(cutoffInfo.nextAvailableDeliveryDate)}
              />
            </div>
          )}

          {/* Credit Warning */}
          {exceedsCredit && (
            <div className="mb-4">
              <Badge variant="destructive" className="w-full justify-center py-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t('creditLimitWarning')}
              </Badge>
            </div>
          )}

          {/* Checkout Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={exceedsCredit}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {t('buttons.checkout')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
