/**
 * Pricing Utilities
 * Handles customer-specific pricing logic and calculations
 * All prices are in cents (Int) for precision
 */

import { createMoney, subtractMoney, toCents, getDiscountPercentage } from './money';

export interface CustomerPricing {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number; // In cents
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithPricing {
  basePrice: number; // In cents
  customPrice?: number; // In cents
  effectivePrice: number; // In cents
  hasCustomPricing: boolean;
  discount?: number; // In cents
  discountPercentage?: number;
  // GST fields for customer-facing price display
  applyGst?: boolean;
  gstRate?: number | null; // GST rate as percentage (e.g., 10 for 10%)
  priceWithGst?: number; // Final price in cents including GST (if applicable)
}

/**
 * Default Australian GST rate (10%)
 */
export const DEFAULT_GST_RATE = 10;

/**
 * Calculate price with GST included
 * @param effectivePrice - The effective price in cents (before GST)
 * @param applyGst - Whether GST should be applied
 * @param gstRate - GST rate as percentage (e.g., 10 for 10%), defaults to 10%
 * @returns Price in cents including GST (if applicable)
 */
export function calculatePriceWithGst(
  effectivePrice: number,
  applyGst: boolean,
  gstRate?: number | null
): number {
  if (!applyGst) {
    return effectivePrice;
  }
  const rate = gstRate ?? DEFAULT_GST_RATE;
  // Calculate GST: price * rate / 100, then add to price
  const gstAmount = Math.round((effectivePrice * rate) / 100);
  return effectivePrice + gstAmount;
}

/**
 * Check if a customer-specific price is currently valid based on effective dates
 */
export function isCustomPriceValid(pricing: CustomerPricing): boolean {
  const now = new Date();

  // Check effectiveFrom date
  const effectiveFromDate = new Date(pricing.effectiveFrom);
  if (effectiveFromDate > now) {
    return false; // Not yet effective
  }

  // Check effectiveTo date (null means no expiration)
  if (pricing.effectiveTo) {
    const effectiveToDate = new Date(pricing.effectiveTo);
    if (effectiveToDate < now) {
      return false; // Expired
    }
  }

  return true;
}

/**
 * Get the effective price for a product considering customer-specific pricing
 * @param basePrice - Base price in cents
 * @param customerPricing - Customer-specific pricing (if any)
 * @param gstOptions - Optional GST configuration from product
 * @returns Product with pricing information (all amounts in cents)
 */
export function getEffectivePrice(
  basePrice: number,
  customerPricing?: CustomerPricing | null,
  gstOptions?: { applyGst?: boolean; gstRate?: number | null }
): ProductWithPricing {
  const applyGst = gstOptions?.applyGst ?? false;
  const gstRate = gstOptions?.gstRate ?? null;

  // If no custom pricing or invalid dates, use base price
  if (!customerPricing || !isCustomPriceValid(customerPricing)) {
    const effectivePrice = basePrice;
    return {
      basePrice,
      effectivePrice,
      hasCustomPricing: false,
      applyGst,
      gstRate,
      priceWithGst: calculatePriceWithGst(effectivePrice, applyGst, gstRate),
    };
  }

  // Calculate discount using dinero.js for precision
  const baseMoney = createMoney(basePrice);
  const customMoney = createMoney(customerPricing.customPrice);
  const discountMoney = subtractMoney(baseMoney, customMoney);
  const discount = toCents(discountMoney);

  // Calculate discount percentage
  const discountPercentage = getDiscountPercentage(baseMoney, customMoney);

  const effectivePrice = customerPricing.customPrice;

  return {
    basePrice,
    customPrice: customerPricing.customPrice,
    effectivePrice,
    hasCustomPricing: true,
    discount,
    discountPercentage,
    applyGst,
    gstRate,
    priceWithGst: calculatePriceWithGst(effectivePrice, applyGst, gstRate),
  };
}

/**
 * Calculate the price difference between base and custom price
 * @param basePrice - Base price in cents
 * @param customPrice - Custom price in cents
 * @returns Discount/markup information (discount in cents, percentages as numbers)
 */
export function calculatePriceDifference(
  basePrice: number,
  customPrice: number
): { discount: number; discountPercentage: number; markup: number } {
  const baseMoney = createMoney(basePrice);
  const customMoney = createMoney(customPrice);

  // Calculate difference
  const difference = basePrice - customPrice;

  // Calculate discount percentage
  const discountPercentage = difference > 0 ? getDiscountPercentage(baseMoney, customMoney) : 0;

  // Calculate markup percentage (if custom price is higher than base)
  const markup =
    customPrice > basePrice ? ((customPrice - basePrice) / basePrice) * 100 : 0;

  return {
    discount: difference,
    discountPercentage,
    markup,
  };
}

/**
 * Price comparison result with translation key and params
 */
export interface PriceComparisonResult {
  /** Translation key to use with t() */
  key: string;
  /** Parameters for interpolation */
  params?: Record<string, string | number>;
  /** Raw values for custom formatting */
  values: {
    discount: number;
    discountPercentage: number;
    formattedDiscount: string;
    formattedCustomPrice: string;
  };
}

/**
 * Get price comparison data for display (returns translation key + params)
 * Use with: t(result.key, result.params)
 */
export function getPriceComparison(
  basePrice: number,
  customPrice: number,
  currency: string = 'AUD'
): PriceComparisonResult {
  const { discount, discountPercentage } = calculatePriceDifference(basePrice, customPrice);
  const formattedDiscount = formatCurrency(discount, currency);
  const formattedCustomPrice = formatCurrency(customPrice, currency);

  if (discount > 0) {
    return {
      key: 'pricing.comparison.save',
      params: {
        amount: formattedDiscount,
        percentage: discountPercentage.toFixed(1),
      },
      values: { discount, discountPercentage, formattedDiscount, formattedCustomPrice },
    };
  } else if (discount < 0) {
    return {
      key: 'pricing.comparison.premium',
      params: { price: formattedCustomPrice },
      values: { discount, discountPercentage, formattedDiscount, formattedCustomPrice },
    };
  }

  return {
    key: 'pricing.comparison.same',
    values: { discount: 0, discountPercentage: 0, formattedDiscount, formattedCustomPrice },
  };
}

/**
 * @deprecated Use getPriceComparison() with translation keys instead
 * Format a price comparison string for display
 */
export function formatPriceComparison(
  basePrice: number,
  customPrice: number,
  currency: string = 'AUD'
): string {
  const { discount, discountPercentage } = calculatePriceDifference(basePrice, customPrice);

  if (discount > 0) {
    return `Save ${formatCurrency(discount, currency)} (${discountPercentage.toFixed(1)}% off)`;
  } else if (discount < 0) {
    return `Premium price: ${formatCurrency(customPrice, currency)}`;
  }

  return `Same as standard price`;
}

/**
 * Format currency value (helper function)
 * @param amount - Amount in cents
 * @param currency - Currency code (default: AUD)
 */
function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100); // Convert cents to dollars
}

/**
 * Validation result with translation key
 */
export interface ValidationResult {
  valid: boolean;
  /** Translation key for error message - use with t(errorKey) */
  errorKey?: string;
  /** @deprecated Use errorKey with translations instead */
  error?: string;
}

/**
 * Validate customer pricing input
 * @param input - Pricing input (prices in cents)
 * @returns ValidationResult with translation key for error messages
 */
export function validateCustomerPricing(input: {
  customPrice: number;
  basePrice: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}): ValidationResult {
  // Price must be positive (cents must be > 0)
  if (input.customPrice <= 0) {
    return {
      valid: false,
      errorKey: 'pricing.validation.pricePositive',
      error: 'Custom price must be greater than 0',
    };
  }

  // Validate date range if both dates provided
  if (input.effectiveFrom && input.effectiveTo) {
    const fromDate = new Date(input.effectiveFrom);
    const toDate = new Date(input.effectiveTo);

    if (fromDate >= toDate) {
      return {
        valid: false,
        errorKey: 'pricing.validation.dateOrder',
        error: 'Effective From date must be before Effective To date',
      };
    }
  }

  return { valid: true };
}

/**
 * Pricing status result with translation key
 */
export interface PricingStatusResult {
  status: 'active' | 'pending' | 'expired';
  /** Translation key - use with t(textKey, params) */
  textKey: string;
  /** Parameters for interpolation */
  params?: Record<string, string>;
  /** @deprecated Use textKey with translations instead */
  text: string;
}

/**
 * Get pricing status for UI display (returns translation key + params)
 * Use with: t(result.textKey, result.params)
 */
export function getPricingStatus(pricing: CustomerPricing): PricingStatusResult {
  const now = new Date();
  const effectiveFromDate = new Date(pricing.effectiveFrom);

  // Check if pending (future)
  if (effectiveFromDate > now) {
    const dateStr = effectiveFromDate.toLocaleDateString();
    return {
      status: 'pending',
      textKey: 'pricing.status.starts',
      params: { date: dateStr },
      text: `Starts ${dateStr}`,
    };
  }

  // Check if expired
  if (pricing.effectiveTo) {
    const effectiveToDate = new Date(pricing.effectiveTo);
    if (effectiveToDate < now) {
      const dateStr = effectiveToDate.toLocaleDateString();
      return {
        status: 'expired',
        textKey: 'pricing.status.expired',
        params: { date: dateStr },
        text: `Expired ${dateStr}`,
      };
    }
  }

  // Active with expiration
  if (pricing.effectiveTo) {
    const dateStr = new Date(pricing.effectiveTo).toLocaleDateString();
    return {
      status: 'active',
      textKey: 'pricing.status.until',
      params: { date: dateStr },
      text: `Until ${dateStr}`,
    };
  }

  // Active without expiration
  return {
    status: 'active',
    textKey: 'pricing.status.noExpiration',
    text: 'No expiration',
  };
}

/**
 * Sort pricing records by priority (active first, then pending, then expired)
 */
export function sortPricingByPriority(pricings: CustomerPricing[]): CustomerPricing[] {
  return [...pricings].sort((a, b) => {
    const statusA = getPricingStatus(a).status;
    const statusB = getPricingStatus(b).status;

    const priority = { active: 0, pending: 1, expired: 2 };

    return priority[statusA] - priority[statusB];
  });
}
