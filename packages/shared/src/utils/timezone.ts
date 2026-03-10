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

/**
 * Gets today's date in Melbourne, returns UTC midnight for that date.
 * Consistent with DB convention where dates are stored as UTC midnight
 * (e.g., `new Date("2026-03-11")` → `2026-03-11T00:00:00.000Z`).
 *
 * @example
 * // At 9am AEDT (March 11), which is 10pm UTC (March 10):
 * getTodayAsUTCMidnight()
 * // Returns: 2026-03-11T00:00:00.000Z (UTC midnight for Melbourne's "today")
 */
export function getTodayAsUTCMidnight(): Date {
  const todayStr = formatDateForMelbourne(new Date());
  return new Date(todayStr + 'T00:00:00.000Z');
}

/**
 * Normalizes any Date to UTC midnight of its Melbourne calendar day.
 * Use for comparing dates that may have different time components.
 * Consistent with DB convention (UTC midnight storage).
 *
 * @param date - The date to normalize
 * @returns UTC midnight Date for the Melbourne calendar day
 *
 * @example
 * // Melbourne midnight ISO string (from frontend):
 * toUTCMidnightForMelbourneDay(new Date('2026-03-10T13:00:00.000Z'))
 * // Returns: 2026-03-11T00:00:00.000Z (March 11 in Melbourne)
 */
export function toUTCMidnightForMelbourneDay(date: Date | string): Date {
  const dateStr = formatDateForMelbourne(date);
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Returns UTC midnight start and next-day UTC midnight end (exclusive)
 * for a Melbourne calendar day. Replaces setUTCHours(0,0,0,0) / setUTCHours(23,59,59,999)
 * patterns which break when the input is a Melbourne midnight ISO string.
 *
 * @param date - The date (can be Date object or ISO string)
 * @returns { start, end } where start is inclusive and end is exclusive
 *
 * @example
 * // Frontend sends Melbourne midnight: 2026-03-10T13:00:00.000Z (March 11 AEDT)
 * getUTCDayRangeForMelbourneDay(new Date('2026-03-10T13:00:00.000Z'))
 * // Returns: { start: 2026-03-11T00:00:00.000Z, end: 2026-03-12T00:00:00.000Z }
 */
export function getUTCDayRangeForMelbourneDay(date: Date | string): { start: Date; end: Date } {
  const dateStr = formatDateForMelbourne(date);
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
