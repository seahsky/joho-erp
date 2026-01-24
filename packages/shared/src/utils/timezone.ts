/**
 * Timezone Utilities for Melbourne (Australia/Melbourne)
 *
 * These utilities ensure consistent date handling across the application,
 * accounting for AEST/AEDT daylight saving time transitions.
 *
 * All business logic should use these utilities for date operations
 * to avoid timezone-related bugs (Issue #12: off-by-one errors).
 */

import { format } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/** Melbourne timezone identifier (handles AEST/AEDT automatically) */
export const MELBOURNE_TIMEZONE = 'Australia/Melbourne';

/**
 * Formats a date to YYYY-MM-DD string in Melbourne timezone.
 *
 * Use this instead of `date.toISOString().split('T')[0]` which uses UTC
 * and can cause off-by-one errors around midnight Melbourne time.
 *
 * @param date - The date to format (can be Date object or ISO string)
 * @returns Date string in YYYY-MM-DD format (Melbourne time)
 *
 * @example
 * // At 11pm UTC on Jan 1st (which is 10am Jan 2nd in Melbourne during summer)
 * formatDateForMelbourne(new Date('2024-01-01T23:00:00Z'))
 * // Returns: '2024-01-02'
 */
export function formatDateForMelbourne(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, MELBOURNE_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Gets tomorrow's date string in Melbourne timezone.
 *
 * Useful for setting default delivery dates. Accounts for DST transitions.
 *
 * @returns Tomorrow's date in YYYY-MM-DD format (Melbourne time)
 */
export function getTomorrowInMelbourne(): string {
  const now = new Date();
  const melbourneNow = toZonedTime(now, MELBOURNE_TIMEZONE);
  const tomorrow = new Date(melbourneNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return format(tomorrow, 'yyyy-MM-dd');
}

/**
 * Checks if a given date is a Sunday in Melbourne timezone.
 *
 * Used for delivery cutoff logic - Sunday deliveries are not available.
 *
 * @param date - The date to check (can be Date object or YYYY-MM-DD string)
 * @returns true if the date is a Sunday in Melbourne
 *
 * @example
 * isSundayInMelbourne('2024-01-07') // A Sunday
 * // Returns: true
 */
export function isSundayInMelbourne(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const melbourneDate = toZonedTime(d, MELBOURNE_TIMEZONE);
  return melbourneDate.getDay() === 0;
}

/**
 * Gets the current date string in Melbourne timezone.
 *
 * @returns Today's date in YYYY-MM-DD format (Melbourne time)
 */
export function getTodayInMelbourne(): string {
  return formatDateForMelbourne(new Date());
}

/**
 * Converts a YYYY-MM-DD string to a Date object representing
 * the start of that day in Melbourne timezone.
 *
 * Useful for comparing dates or setting delivery date filters.
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object at 00:00:00 Melbourne time
 */
export function parseMelbourneDate(dateString: string): Date {
  // Parse as Melbourne time by appending the timezone
  const melbourneDate = toZonedTime(new Date(dateString), MELBOURNE_TIMEZONE);
  melbourneDate.setHours(0, 0, 0, 0);
  return melbourneDate;
}

/**
 * Formats a date to Australian display format (DD/MM/YYYY) in Melbourne timezone.
 *
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatMelbourneDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, MELBOURNE_TIMEZONE, 'dd/MM/yyyy');
}

/**
 * Formats a date with time in Melbourne timezone.
 *
 * @param date - The date to format
 * @returns Formatted datetime string (DD/MM/YYYY HH:mm)
 */
export function formatMelbourneDateTimeForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, MELBOURNE_TIMEZONE, 'dd/MM/yyyy HH:mm');
}
