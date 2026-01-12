/**
 * Format currency in AUD
 * @param amount - Amount in cents or Money object
 * @deprecated Use formatAUD from money utilities instead
 */
export function formatCurrency(amount: number): string {
  // This function now expects cents (Int) instead of dollars (Float)
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
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
 * Validate Australian Company Number (ACN) - 9 digits
 */
export function validateACN(acn: string): boolean {
  const acnNumbers = acn.replace(/\s/g, '');

  if (acnNumbers.length !== 9 || !/^\d+$/.test(acnNumbers)) {
    return false;
  }

  // ACN validation algorithm (similar to ABN but with different weights)
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += parseInt(acnNumbers[i]) * weights[i];
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(acnNumbers[8]);
}

/**
 * Validate Australian BSB (Bank-State-Branch) - 6 digits
 */
export function validateBSB(bsb: string): boolean {
  const bsbNumbers = bsb.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(bsbNumbers);
}

/**
 * Validate Australian driver license number (state-specific)
 */
export function validateDriverLicense(
  licenseNumber: string,
  state: 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT'
): boolean {
  const cleanLicense = licenseNumber.replace(/\s/g, '').toUpperCase();

  // State-specific validation patterns
  const patterns: Record<string, RegExp> = {
    NSW: /^\d{8}$/, // 8 digits
    VIC: /^\d{7,9}$/, // 7-9 digits
    QLD: /^\d{8}$/, // 8 digits
    SA: /^[A-Z]\d{6}$/, // 1 letter + 6 digits
    WA: /^\d{7}$/, // 7 digits
    TAS: /^\d{8}$/, // 8 digits
    NT: /^\d{6,9}$/, // 6-9 digits
    ACT: /^\d{8}$/, // 8 digits
  };

  const pattern = patterns[state];
  return pattern ? pattern.test(cleanLicense) : false;
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
 * Calculate order totals with tax using dinero.js
 * @param items - Array of items with quantity and unitPrice (in cents)
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10% GST)
 * @returns Object with subtotal, taxAmount, and totalAmount in cents
 */
export function calculateOrderTotals(
  items: { quantity: number; unitPrice: number; applyGst: boolean; gstRate: number | null }[]
): {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
} {
  // Import money utilities at runtime to avoid circular dependencies
  const { createMoney, multiplyMoney, addMoney, toCents } = require('./money');
  const { DEFAULT_GST_RATE } = require('./pricing');

  // Calculate subtotal and GST per item
  let subtotal = createMoney(0);
  let totalGst = createMoney(0);

  for (const item of items) {
    const itemPrice = createMoney(item.unitPrice);
    const itemSubtotal = multiplyMoney(itemPrice, item.quantity);
    subtotal = addMoney(subtotal, itemSubtotal);

    // Only apply GST if the product has GST enabled
    if (item.applyGst) {
      const rate = item.gstRate ?? DEFAULT_GST_RATE;
      const gstMultiplier = { amount: Math.round(rate), scale: 2 };
      const itemGst = multiplyMoney(itemSubtotal, gstMultiplier);
      totalGst = addMoney(totalGst, itemGst);
    }
  }

  // Calculate total
  const totalAmount = addMoney(subtotal, totalGst);

  return {
    subtotal: toCents(subtotal),
    taxAmount: toCents(totalGst),
    totalAmount: toCents(totalAmount),
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
 * Get customer-facing stock status (hides exact counts)
 * @param currentStock - Current stock level
 * @param lowStockThreshold - Product-specific threshold (optional, defaults to 10)
 * @returns StockStatus for customer display
 */
export function getCustomerStockStatus(
  currentStock: number,
  lowStockThreshold?: number | null
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  const threshold = lowStockThreshold ?? 10;
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= threshold) return 'low_stock';
  return 'in_stock';
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

/**
 * Format user name from user object
 * Returns full name if both first and last name are available,
 * otherwise returns first name or fallback
 */
export function formatUserName(
  user: { firstName?: string | null; lastName?: string | null } | null,
  fallback = 'User'
): string {
  if (!user) return fallback;
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.firstName || fallback;
}

/**
 * Pagination result interface
 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Generic pagination utility for MongoDB queries (Mongoose - DEPRECATED)
 * Handles pagination logic and returns standardized result
 * @deprecated Use paginatePrismaQuery instead
 */
export async function paginateQuery<T>(
  model: any, // Mongoose Model
  filter: any,
  options: {
    page: number;
    limit: number;
    sortOptions?: any;
  }
): Promise<PaginationResult<T>> {
  const { page, limit, sortOptions = { createdAt: -1 } } = options;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    model.find(filter).skip(skip).limit(limit).sort(sortOptions),
    model.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Generic pagination utility for Prisma queries
 * Handles pagination logic and returns standardized result
 */
export async function paginatePrismaQuery<T>(
  prismaModel: {
    findMany: (args: any) => Promise<T[]>;
    count: (args: any) => Promise<number>;
  },
  where: any,
  options: {
    page: number;
    limit: number;
    orderBy?: any;
    include?: any;
    select?: any;
  }
): Promise<PaginationResult<T>> {
  const { page, limit, orderBy = { createdAt: 'desc' }, include, select } = options;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prismaModel.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...(include && { include }),
      ...(select && { select }),
    }),
    prismaModel.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Export pricing utilities
 */
export * from './pricing';

/**
 * Export money utilities (dinero.js)
 */
export * from './money';
