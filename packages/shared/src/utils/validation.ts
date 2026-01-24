import { z } from 'zod';

/**
 * Australian phone number validation
 * Supports formats: 04XX XXX XXX, (0X) XXXX XXXX, +61 X XXXX XXXX
 */
export const australianPhoneRegex = /^(?:\+61|0)[2-478](?:[ -]?\d){8}$/;

export const phoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(australianPhoneRegex, 'Invalid Australian phone format (e.g., 0412 345 678)');

export const optionalPhoneSchema = z
  .string()
  .regex(australianPhoneRegex, 'Invalid Australian phone format (e.g., 0412 345 678)')
  .optional()
  .or(z.literal(''));

/**
 * Australian postcode validation - exactly 4 digits
 */
export const postcodeSchema = z
  .string()
  .regex(/^\d{4}$/, 'Postcode must be 4 digits');

/**
 * Credit limit validation in cents
 * Range: $0 to $100,000 (0 to 10,000,000 cents)
 */
export const creditLimitSchema = z
  .number()
  .int('Credit limit must be a whole number')
  .min(0, 'Credit limit cannot be negative')
  .max(10000000, 'Credit limit cannot exceed $100,000');

/**
 * License expiry date validation - must be in the future
 */
export const futureDateSchema = z.coerce
  .date()
  .refine((date) => date > new Date(), 'Date must be in the future');

export const licenseExpirySchema = z
  .date()
  .or(z.string().transform((str) => new Date(str)))
  .refine((date) => date > new Date(), 'License expiry date must be in the future');

/**
 * Optional license expiry - allows undefined/null but validates if provided
 */
export const optionalLicenseExpirySchema = z
  .date()
  .or(z.string().transform((str) => new Date(str)))
  .refine((date) => date > new Date(), 'License expiry date must be in the future')
  .optional()
  .nullable();
