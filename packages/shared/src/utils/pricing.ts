/**
 * Pricing Utilities
 * Handles customer-specific pricing logic and calculations
 */

export interface CustomerPricing {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithPricing {
  basePrice: number;
  customPrice?: number;
  effectivePrice: number;
  hasCustomPricing: boolean;
  discount?: number;
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

  // Calculate discount
  const discount = basePrice - customerPricing.customPrice;
  const discountPercentage = ((discount / basePrice) * 100);

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
 */
export function calculatePriceDifference(
  basePrice: number,
  customPrice: number
): { discount: number; discountPercentage: number; markup: number } {
  const difference = basePrice - customPrice;
  const discountPercentage = ((difference / basePrice) * 100);
  const markup = customPrice > basePrice ? ((customPrice - basePrice) / basePrice) * 100 : 0;

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
 */
function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Validate customer pricing input
 */
export function validateCustomerPricing(input: {
  customPrice: number;
  basePrice: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}): { valid: boolean; error?: string } {
  // Price must be positive
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
