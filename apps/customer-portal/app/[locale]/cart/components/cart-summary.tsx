'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, CardHeader, H3, Badge } from '@jimmy-beef/ui';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { formatAUD } from '@jimmy-beef/shared';
import { useRouter } from 'next/navigation';

interface CartSummaryProps {
  subtotalCents: number; // in cents
  gstCents: number; // in cents
  totalCents: number; // in cents
  exceedsCredit: boolean;
  creditLimitCents: number; // in cents
  locale: string;
}

export function CartSummary({
  subtotalCents,
  gstCents,
  totalCents,
  exceedsCredit,
  creditLimitCents,
  locale,
}: CartSummaryProps) {
  const t = useTranslations();
  const router = useRouter();

  const handleCheckout = () => {
    // Navigate to checkout page (to be implemented)
    router.push(`/${locale}/checkout`);
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <H3 className="text-xl">{t('cart.orderSummary')}</H3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{t('cart.subtotal')}</span>
          <span className="font-medium">{formatAUD(subtotalCents)}</span>
        </div>

        {/* GST */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{t('cart.tax')}</span>
          <span className="font-medium">{formatAUD(gstCents)}</span>
        </div>

        <div className="border-t pt-4">
          {/* Total */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">{t('cart.orderTotal')}</span>
            <span className="text-2xl font-bold text-primary">{formatAUD(totalCents)}</span>
          </div>

          {/* Credit Limit Info */}
          {creditLimitCents > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('cart.availableCredit')}</span>
                <span className="font-medium">{formatAUD(creditLimitCents)}</span>
              </div>
            </div>
          )}

          {/* Credit Warning */}
          {exceedsCredit && (
            <div className="mb-4">
              <Badge variant="destructive" className="w-full justify-center py-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t('cart.creditLimitWarning')}
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
            {t('cart.buttons.checkout')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
