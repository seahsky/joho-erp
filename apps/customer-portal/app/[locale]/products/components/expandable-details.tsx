'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Badge, Muted, H4, Large, cn } from '@joho-erp/ui';
import { ChevronUp } from 'lucide-react';
import { formatAUD, getDiscountPercentage } from '@joho-erp/shared';

interface ExpandableDetailsProps {
  expanded: boolean;
  onCollapse: () => void;
  product: {
    description: string | null;
    basePrice: number; // In cents
    effectivePrice?: number; // In cents (after custom pricing)
    priceWithGst?: number; // In cents (GST-inclusive if applicable)
    hasCustomPricing?: boolean;
    applyGst?: boolean;
    gstRate?: number | null;
    unit: string;
  };
}

export function ExpandableDetails({
  expanded,
  onCollapse,
  product,
}: ExpandableDetailsProps) {
  const t = useTranslations();

  // Calculate discount percentage if custom pricing applies
  const discountPercentage = product.hasCustomPricing && product.effectivePrice
    ? getDiscountPercentage(product.basePrice, product.effectivePrice)
    : null;

  // Determine display price (effective price or base price)
  const displayPrice = product.effectivePrice || product.basePrice;

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      )}
      aria-hidden={!expanded}
    >
      <div className="p-4 md:p-6 bg-muted/30 border-t border-border space-y-4">
        {/* Description */}
        {product.description && (
          <div>
            <H4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              {t('products.details.description')}
            </H4>
            <p className="text-sm text-foreground leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {!product.description && (
          <div>
            <Muted className="text-sm italic">
              {t('products.details.noDescription')}
            </Muted>
          </div>
        )}

        {/* Pricing Breakdown (only if custom pricing or GST applies) */}
        {(product.hasCustomPricing || product.applyGst) && (
          <div>
            <H4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              {t('products.details.pricingBreakdown')}
            </H4>

            <div className="space-y-2">
              {/* Custom Pricing */}
              {product.hasCustomPricing && product.effectivePrice && (
                <>
                  <div className="flex items-center justify-between">
                    <Muted className="text-sm">
                      {t('products.details.basePrice')}
                    </Muted>
                    <Muted className="text-sm line-through">
                      {formatAUD(product.basePrice)} / {product.unit}
                    </Muted>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {t('products.details.yourPrice')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Large className="font-bold text-green-700 dark:text-green-400">
                        {formatAUD(product.effectivePrice)} / {product.unit}
                      </Large>
                      {discountPercentage && (
                        <Badge variant="success" className="text-xs">
                          -{discountPercentage.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-border my-2" />
                </>
              )}

              {/* GST Information */}
              {product.applyGst && product.priceWithGst && (
                <>
                  <div className="flex items-center justify-between">
                    <Muted className="text-sm">
                      {t('products.details.beforeGst')}
                    </Muted>
                    <span className="text-sm font-medium">
                      {formatAUD(displayPrice)} / {product.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Muted className="text-sm">
                      {t('products.details.gstRate')} ({product.gstRate || 10}%)
                    </Muted>
                    <Muted className="text-sm">
                      +{formatAUD(product.priceWithGst - displayPrice)}
                    </Muted>
                  </div>

                  <div className="h-px bg-border my-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {t('products.details.gstIncluded')}
                    </span>
                    <Large className="font-bold">
                      {formatAUD(product.priceWithGst)} / {product.unit}
                    </Large>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Collapse Button */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapse}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            {t('products.details.collapse')}
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
