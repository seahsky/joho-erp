/**
 * Format currency in AUD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

/**
 * Format date to Australian format
 */
export function formatDate(date: Date | string, includeTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (includeTime) {
    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Generate order number
 * Format: ORD-YYYY-NNNNNN
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `ORD-${year}-${random}`;
}

/**
 * Validate Australian ABN (11 digits)
 */
export function validateABN(abn: string): boolean {
  const abnNumbers = abn.replace(/\s/g, '');

  if (abnNumbers.length !== 11 || !/^\d+$/.test(abnNumbers)) {
    return false;
  }

  // ABN validation algorithm
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;

  for (let i = 0; i < 11; i++) {
    const digit = parseInt(abnNumbers[i]);
    const weight = weights[i];
    sum += (i === 0 ? digit - 1 : digit) * weight;
  }

  return sum % 89 === 0;
}

/**
 * Validate Australian phone number
 */
export function validateAustralianPhone(phone: string): boolean {
  const phoneNumbers = phone.replace(/\s/g, '').replace(/\+61/, '0');
  return /^0[2-478]\d{8}$/.test(phoneNumbers);
}

/**
 * Check if order cutoff time has passed
 */
export function checkOrderCutoff(
  currentTime: Date,
  cutoffTime: string
): {
  canPlaceForTomorrow: boolean;
  deliveryDate: Date;
  message: string;
} {
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const cutoff = new Date(currentTime);
  cutoff.setHours(hours, minutes, 0, 0);

  const tomorrow = new Date(currentTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (currentTime <= cutoff) {
    return {
      canPlaceForTomorrow: true,
      deliveryDate: tomorrow,
      message: `Order by ${cutoffTime} for next-day delivery`,
    };
  } else {
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return {
      canPlaceForTomorrow: false,
      deliveryDate: dayAfterTomorrow,
      message: `Order cutoff time (${cutoffTime}) has passed. Next available delivery: ${formatDate(dayAfterTomorrow)}`,
    };
  }
}

/**
 * Calculate order totals with tax
 */
export function calculateOrderTotals(
  items: { quantity: number; unitPrice: number }[],
  taxRate: number
): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Determine stock status
 */
export function getStockStatus(
  currentStock: number,
  lowStockThreshold: number
): 'ok' | 'low' | 'out' {
  if (currentStock === 0) return 'out';
  if (currentStock <= lowStockThreshold) return 'low';
  return 'ok';
}

/**
 * Get Google Maps directions URL
 */
export function getGoogleMapsDirectionsUrl(destination: {
  lat: number;
  lng: number;
}): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
}

/**
 * Slugify string for URLs
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Get initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
