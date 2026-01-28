/**
 * Money Utilities using dinero.js v2
 *
 * This module provides type-safe, currency-aware money operations for the Joho Foods ERP system.
 * All monetary values are stored as integers (cents) to avoid floating-point precision errors.
 *
 * @example
 * ```typescript
 * // Create money from cents
 * const price = createMoney(2550); // $25.50
 *
 * // Create money from dollars
 * const price = toAUD(25.50); // $25.50
 *
 * // Perform calculations
 * const total = addMoney(price1, price2);
 * const gst = calculateGST(subtotal);
 *
 * // Format for display
 * const formatted = formatAUD(price); // "$25.50"
 *
 * // Extract values
 * const cents = toCents(price); // 2550
 * const dollars = toDollars(price); // 25.50
 * ```
 */

import { dinero, add, subtract, multiply, allocate, toDecimal, greaterThan, lessThan, isZero } from 'dinero.js';
import { AUD } from '@dinero.js/currencies';
import type { Dinero } from 'dinero.js';

/**
 * Type alias for Money in AUD
 */
export type Money = Dinero<number>;

/**
 * Create a Money object from cents (integer)
 * @param amountInCents - Amount in cents (e.g., 2550 for $25.50)
 * @returns Money object representing AUD currency
 *
 * @example
 * ```typescript
 * const price = createMoney(2550); // $25.50
 * const zero = createMoney(0); // $0.00
 * ```
 */
export function createMoney(amountInCents: number): Money {
  return dinero({ amount: Math.round(amountInCents), currency: AUD });
}

/**
 * Create a Money object from dollars (decimal)
 * Converts dollars to cents automatically
 * @param amountInDollars - Amount in dollars (e.g., 25.50)
 * @returns Money object representing AUD currency
 *
 * @example
 * ```typescript
 * const price = toAUD(25.50); // $25.50 (stored as 2550 cents)
 * const price = toAUD(25.5); // $25.50 (stored as 2550 cents)
 * ```
 */
export function toAUD(amountInDollars: number): Money {
  const cents = Math.round(amountInDollars * 100);
  return createMoney(cents);
}

/**
 * Extract cents (integer) from Money object
 * @param money - Money object
 * @returns Amount in cents as integer
 *
 * @example
 * ```typescript
 * const price = toAUD(25.50);
 * const cents = toCents(price); // 2550
 * ```
 */
export function toCents(money: Money): number {
  // Use toDecimal to properly handle scale normalization
  // (dinero.js v2 multiply operations can change scale, e.g., scale 2 + 2 = 4)
  const dollars = parseFloat(toDecimal(money));
  return Math.round(dollars * 100);
}

/**
 * Convert Money object to dollars (decimal)
 * @param money - Money object
 * @returns Amount in dollars as number with 2 decimal places
 *
 * @example
 * ```typescript
 * const price = createMoney(2550);
 * const dollars = toDollars(price); // 25.50
 * ```
 */
export function toDollars(money: Money): number {
  return parseFloat(toDecimal(money));
}

/**
 * Format Money object as AUD currency string
 * @param money - Money object or amount in cents
 * @param options - Intl.NumberFormatOptions for customization
 * @returns Formatted string (e.g., "$25.50")
 *
 * @example
 * ```typescript
 * const price = createMoney(2550);
 * formatAUD(price); // "$25.50"
 * formatAUD(2550); // "$25.50"
 * formatAUD(price, { minimumFractionDigits: 2 }); // "$25.50"
 * ```
 */
export function formatAUD(money: Money | number, options?: Intl.NumberFormatOptions): string {
  const dollars = typeof money === 'number' ? money / 100 : toDollars(money);

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(dollars);
}

/**
 * Add two Money objects
 * @param money1 - First money amount
 * @param money2 - Second money amount
 * @returns Sum of both amounts
 *
 * @example
 * ```typescript
 * const total = addMoney(toAUD(10.50), toAUD(15.25)); // $25.75
 * ```
 */
export function addMoney(money1: Money, money2: Money): Money {
  return add(money1, money2);
}

/**
 * Subtract one Money object from another
 * @param money1 - Amount to subtract from
 * @param money2 - Amount to subtract
 * @returns Difference between amounts
 *
 * @example
 * ```typescript
 * const discount = subtractMoney(toAUD(100), toAUD(15)); // $85.00
 * ```
 */
export function subtractMoney(money1: Money, money2: Money): Money {
  return subtract(money1, money2);
}

/**
 * Multiply Money by a quantity or factor
 * @param money - Money amount
 * @param multiplier - Number to multiply by (can be decimal or object with amount/scale)
 * @returns Product of money and multiplier
 *
 * @example
 * ```typescript
 * const total = multiplyMoney(toAUD(10.50), 3); // $31.50
 * const halfPrice = multiplyMoney(toAUD(10), { amount: 5, scale: 1 }); // $5.00 (10 * 0.5)
 * ```
 */
export function multiplyMoney(money: Money, multiplier: number | { amount: number; scale: number }): Money {
  if (typeof multiplier === 'number') {
    // For whole numbers, use amount directly
    return multiply(money, { amount: Math.round(multiplier * 100), scale: 2 });
  }
  return multiply(money, multiplier);
}

/**
 * Calculate 10% GST (Goods and Services Tax) for Australian invoices
 * @param subtotal - Subtotal amount (before tax)
 * @returns GST amount (10% of subtotal)
 *
 * @example
 * ```typescript
 * const subtotal = toAUD(100);
 * const gst = calculateGST(subtotal); // $10.00
 * ```
 */
export function calculateGST(subtotal: Money): Money {
  // GST is 10% = 0.10 = 10/100 = 1/10
  // Using multiply with { amount: 1, scale: 1 } represents 0.1
  return multiply(subtotal, { amount: 1, scale: 1 });
}

/**
 * Calculate total including 10% GST
 * @param subtotal - Subtotal amount (before tax)
 * @returns Object with subtotal, gst, and total
 *
 * @example
 * ```typescript
 * const result = calculateTotalWithGST(toAUD(100));
 * // { subtotal: $100.00, gst: $10.00, total: $110.00 }
 * ```
 */
export function calculateTotalWithGST(subtotal: Money): {
  subtotal: Money;
  gst: Money;
  total: Money;
} {
  const gst = calculateGST(subtotal);
  const total = add(subtotal, gst);

  return {
    subtotal,
    gst,
    total,
  };
}

/**
 * Allocate money into parts (useful for splitting invoices, discounts, etc.)
 * @param money - Money amount to allocate
 * @param ratios - Array of ratios for allocation
 * @returns Array of allocated money amounts
 *
 * @example
 * ```typescript
 * // Split $100 into 50%, 30%, 20%
 * const parts = allocateMoney(toAUD(100), [50, 30, 20]);
 * // [$50.00, $30.00, $20.00]
 * ```
 */
export function allocateMoney(money: Money, ratios: number[]): Money[] {
  return allocate(money, ratios);
}

/**
 * Compare if first money is greater than second
 * @param money1 - First money amount
 * @param money2 - Second money amount
 * @returns true if money1 > money2
 *
 * @example
 * ```typescript
 * isGreaterThan(toAUD(100), toAUD(50)); // true
 * isGreaterThan(toAUD(50), toAUD(100)); // false
 * ```
 */
export function isGreaterThan(money1: Money, money2: Money): boolean {
  return greaterThan(money1, money2);
}

/**
 * Compare if first money is less than second
 * @param money1 - First money amount
 * @param money2 - Second money amount
 * @returns true if money1 < money2
 *
 * @example
 * ```typescript
 * isLessThan(toAUD(50), toAUD(100)); // true
 * isLessThan(toAUD(100), toAUD(50)); // false
 * ```
 */
export function isLessThan(money1: Money, money2: Money): boolean {
  return lessThan(money1, money2);
}

/**
 * Check if money amount is zero
 * @param money - Money amount
 * @returns true if amount is zero
 *
 * @example
 * ```typescript
 * isZeroMoney(createMoney(0)); // true
 * isZeroMoney(toAUD(0)); // true
 * isZeroMoney(toAUD(10)); // false
 * ```
 */
export function isZeroMoney(money: Money): boolean {
  return isZero(money);
}

/**
 * Calculate discount percentage between two prices
 * @param basePrice - Original price
 * @param discountedPrice - Discounted price
 * @returns Discount percentage as number
 *
 * @example
 * ```typescript
 * const discount = getDiscountPercentage(toAUD(100), toAUD(80)); // 20
 * ```
 */
export function getDiscountPercentage(basePrice: Money, discountedPrice: Money): number {
  const baseCents = toCents(basePrice);
  const discountedCents = toCents(discountedPrice);

  if (baseCents === 0) return 0;

  const difference = baseCents - discountedCents;
  return (difference / baseCents) * 100;
}

/**
 * Zero money constant ($0.00 in AUD)
 */
export const ZERO_AUD = createMoney(0);

/**
 * Helper to sum an array of Money objects
 * @param amounts - Array of Money objects to sum
 * @returns Total sum
 *
 * @example
 * ```typescript
 * const total = sumMoney([toAUD(10), toAUD(20), toAUD(30)]); // $60.00
 * ```
 */
export function sumMoney(amounts: Money[]): Money {
  return amounts.reduce((sum, amount) => add(sum, amount), ZERO_AUD);
}

/**
 * Type guard to check if a value is a valid cent amount
 * @param value - Value to check
 * @returns true if value is a valid integer representing cents
 */
export function isValidCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Parse user input (string or number) to cents
 * Handles dollar amounts and converts to cents
 * @param input - User input (e.g., "25.50", 25.5, 25)
 * @returns Amount in cents, or null if invalid
 *
 * @example
 * ```typescript
 * parseToCents("25.50"); // 2550
 * parseToCents(25.5); // 2550
 * parseToCents("invalid"); // null
 * ```
 */
export function parseToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const numericValue = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return null;
  }

  // Negative amounts not allowed for prices
  if (numericValue < 0) {
    return null;
  }

  return Math.round(numericValue * 100);
}

/**
 * Format cents as dollar string for input fields
 * @param cents - Amount in cents
 * @returns Dollar amount as string (e.g., "25.50")
 *
 * @example
 * ```typescript
 * formatCentsForInput(2550); // "25.50"
 * formatCentsForInput(2500); // "25.00"
 * formatCentsForInput(0); // "0.00"
 * ```
 */
export function formatCentsForInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '';
  }

  return (cents / 100).toFixed(2);
}

/**
 * Format cents as whole dollars for input fields (no decimals).
 * Use for fields where cents aren't relevant (e.g., credit limits).
 * @param cents - Amount in cents
 * @returns Whole dollar string (e.g., 500000 → "5000")
 */
export function formatCentsForWholeInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '';
  }
  return Math.round(cents / 100).toString();
}
