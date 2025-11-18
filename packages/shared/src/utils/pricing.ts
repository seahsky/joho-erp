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
 * @returns Product with pricing information (all amounts in cents)
 */
export function getEffectivePrice(
  basePrice: number,
  customerPricing?: CustomerPricing | null
): ProductWithPricing {
  // If no custom pricing or invalid dates, use base price
  if (!customerPricing || !isCustomPriceValid(customerPricing)) {
    return {
      basePrice,
      effectivePrice: basePrice,
      hasCustomPricing: false,
    };
  }

  // Calculate discount using dinero.js for precision
  const baseMoney = createMoney(basePrice);
  const customMoney = createMoney(customerPricing.customPrice);
  const discountMoney = subtractMoney(baseMoney, customMoney);
  const discount = toCents(discountMoney);

  // Calculate discount percentage
  const discountPercentage = getDiscountPercentage(baseMoney, customMoney);

  return {
    basePrice,
    customPrice: customerPricing.customPrice,
    effectivePrice: customerPricing.customPrice,
    hasCustomPricing: true,
    discount,
    discountPercentage,
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
 * Validate customer pricing input
 * @param input - Pricing input (prices in cents)
 */
export function validateCustomerPricing(input: {
  customPrice: number;
  basePrice: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}): { valid: boolean; error?: string } {
  // Price must be positive (cents must be > 0)
  if (input.customPrice <= 0) {
    return { valid: false, error: 'Custom price must be greater than 0' };
  }

  // Validate date range if both dates provided
  if (input.effectiveFrom && input.effectiveTo) {
    const fromDate = new Date(input.effectiveFrom);
    const toDate = new Date(input.effectiveTo);

    if (fromDate >= toDate) {
      return { valid: false, error: 'Effective From date must be before Effective To date' };
    }
  }

  return { valid: true };
}

/**
 * Get pricing status text for UI display
 */
export function getPricingStatus(pricing: CustomerPricing): {
  status: 'active' | 'pending' | 'expired';
  text: string;
} {
  const now = new Date();
  const effectiveFromDate = new Date(pricing.effectiveFrom);

  // Check if pending (future)
  if (effectiveFromDate > now) {
    return {
      status: 'pending',
      text: `Starts ${effectiveFromDate.toLocaleDateString()}`,
    };
  }

  // Check if expired
  if (pricing.effectiveTo) {
    const effectiveToDate = new Date(pricing.effectiveTo);
    if (effectiveToDate < now) {
      return {
        status: 'expired',
        text: `Expired ${effectiveToDate.toLocaleDateString()}`,
      };
    }
  }

  // Active
  return {
    status: 'active',
    text: pricing.effectiveTo
      ? `Until ${new Date(pricing.effectiveTo).toLocaleDateString()}`
      : 'No expiration',
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
