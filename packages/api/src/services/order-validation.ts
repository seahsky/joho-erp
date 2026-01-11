/**
 * Order Validation Service
 *
 * This service handles order validation logic including:
 * - Order cutoff time validation
 * - Delivery date calculation
 * - Credit limit validation
 */

import { prisma } from '@joho-erp/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CutoffValidationResult {
  isAfterCutoff: boolean;
  cutoffTime: string; // Format: "HH:mm"
  cutoffDateTime: Date; // Actual cutoff datetime for the requested delivery date
  nextAvailableDeliveryDate: Date;
  message?: string;
}

export interface CutoffInfo {
  cutoffTime: string; // Format: "HH:mm" (e.g., "14:00")
  isAfterCutoff: boolean;
  currentTime: string; // Format: "HH:mm"
  nextAvailableDeliveryDate: Date;
  timezone: string;
}

interface CutoffByArea {
  [areaName: string]: string; // areaName -> "HH:mm" format
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse time string in "HH:mm" format to hours and minutes
 */
function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours: hours ?? 0, minutes: minutes ?? 0 };
}

/**
 * Get current time in Australia/Sydney timezone
 */
function getCurrentTimeInSydney(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
  );
}

/**
 * Format time as "HH:mm" string
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Australia/Sydney',
  });
}

/**
 * Get tomorrow's date (in Sydney timezone)
 */
function getTomorrowDate(): Date {
  const now = getCurrentTimeInSydney();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get the day after tomorrow's date (in Sydney timezone)
 */
function getDayAfterTomorrowDate(): Date {
  const now = getCurrentTimeInSydney();
  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(0, 0, 0, 0);
  return dayAfterTomorrow;
}

/**
 * Check if a given date is a valid delivery day (not Sunday)
 * @param date - The date to check
 * @returns true if the date is Monday-Saturday, false if Sunday
 */
function isDeliveryDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // Sunday is 0, Monday is 1, ..., Saturday is 6
  return dayOfWeek !== 0;
}

/**
 * Get the next valid delivery day, skipping Sunday if necessary
 * @param date - The candidate delivery date
 * @returns The same date if it's not Sunday, or the next day (Monday) if it is Sunday
 */
function getNextDeliveryDay(date: Date): Date {
  if (isDeliveryDay(date)) {
    return date;
  }
  
  // If it's Sunday, advance to Monday
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get company's order cutoff time settings
 */
export async function getCompanyCutoffSettings(): Promise<{
  orderCutoffTime: string;
  cutoffByArea: CutoffByArea | null;
  timezone: string;
}> {
  const company = await prisma.company.findFirst({
    select: {
      deliverySettings: true,
    },
  });

  const defaultCutoff = '14:00';
  const timezone = 'Australia/Sydney';

  if (!company?.deliverySettings) {
    return {
      orderCutoffTime: defaultCutoff,
      cutoffByArea: null,
      timezone,
    };
  }

  return {
    orderCutoffTime: company.deliverySettings.orderCutoffTime ?? defaultCutoff,
    cutoffByArea: company.deliverySettings.cutoffByArea as CutoffByArea | null,
    timezone,
  };
}

/**
 * Get the cutoff time for a specific area (or default if not area-specific)
 */
export async function getCutoffTimeForArea(
  areaName?: string
): Promise<string> {
  const { orderCutoffTime, cutoffByArea } = await getCompanyCutoffSettings();

  // Check for area-specific cutoff time
  if (areaName && cutoffByArea && cutoffByArea[areaName]) {
    return cutoffByArea[areaName];
  }

  return orderCutoffTime;
}

/**
 * Validate if an order can be placed for next-day delivery based on cutoff time
 *
 * @param requestedDeliveryDate - The date customer wants the order delivered
 * @param areaName - Optional area name for area-specific cutoff times
 * @returns CutoffValidationResult with validation status and next available date
 */
export async function validateOrderCutoffTime(
  requestedDeliveryDate: Date,
  areaName?: string
): Promise<CutoffValidationResult> {
  // Check if requested delivery date is Sunday
  if (!isDeliveryDay(requestedDeliveryDate)) {
    const nextAvailableDeliveryDate = await getMinDeliveryDate(areaName);
    return {
      isAfterCutoff: true,
      cutoffTime: await getCutoffTimeForArea(areaName),
      cutoffDateTime: requestedDeliveryDate,
      nextAvailableDeliveryDate,
      message: 'Sunday deliveries are not available. Please select a weekday (Monday-Saturday).',
    };
  }

  const now = getCurrentTimeInSydney();
  const cutoffTime = await getCutoffTimeForArea(areaName);
  const { hours: cutoffHours, minutes: cutoffMinutes } = parseTime(cutoffTime);

  // Calculate cutoff datetime for the day before requested delivery
  const dayBeforeDelivery = new Date(requestedDeliveryDate);
  dayBeforeDelivery.setDate(dayBeforeDelivery.getDate() - 1);
  dayBeforeDelivery.setHours(cutoffHours, cutoffMinutes, 0, 0);

  const isAfterCutoff = now > dayBeforeDelivery;

  // Calculate next available delivery date
  const candidateDate = isAfterCutoff ? getDayAfterTomorrowDate() : getTomorrowDate();
  // Skip Sunday if the candidate date falls on Sunday
  const nextAvailableDeliveryDate = getNextDeliveryDay(candidateDate);

  // Build message
  let message: string | undefined;
  if (isAfterCutoff) {
    message = `Order cutoff time (${cutoffTime}) has passed for the requested delivery date. Your order will be delivered on ${nextAvailableDeliveryDate.toLocaleDateString('en-AU')}.`;
  }

  return {
    isAfterCutoff,
    cutoffTime,
    cutoffDateTime: dayBeforeDelivery,
    nextAvailableDeliveryDate,
    message,
  };
}

/**
 * Get current cutoff information for display in the UI
 * This is used by customers to see if they're before/after cutoff
 */
export async function getCutoffInfo(areaName?: string): Promise<CutoffInfo> {
  const now = getCurrentTimeInSydney();
  const cutoffTime = await getCutoffTimeForArea(areaName);
  const { hours: cutoffHours, minutes: cutoffMinutes } = parseTime(cutoffTime);

  // Create cutoff datetime for today
  const todayCutoff = new Date(now);
  todayCutoff.setHours(cutoffHours, cutoffMinutes, 0, 0);

  const isAfterCutoff = now > todayCutoff;

  // Calculate next available delivery date
  const candidateDate = isAfterCutoff
    ? getDayAfterTomorrowDate()
    : getTomorrowDate();
  
  // Skip Sunday if the candidate date falls on Sunday
  const nextAvailableDeliveryDate = getNextDeliveryDay(candidateDate);

  return {
    cutoffTime,
    isAfterCutoff,
    currentTime: formatTime(now),
    nextAvailableDeliveryDate,
    timezone: 'Australia/Sydney',
  };
}

/**
 * Get the minimum allowed delivery date for a new order
 * This is always tomorrow (or day after if after cutoff)
 */
export async function getMinDeliveryDate(areaName?: string): Promise<Date> {
  const { isAfterCutoff } = await getCutoffInfo(areaName);

  const candidateDate = isAfterCutoff ? getDayAfterTomorrowDate() : getTomorrowDate();
  // Skip Sunday if the candidate date falls on Sunday
  return getNextDeliveryDay(candidateDate);
}

/**
 * Check if a specific delivery date is valid
 * A date is valid if it's at or after the minimum delivery date
 */
export async function isValidDeliveryDate(
  requestedDate: Date,
  areaName?: string
): Promise<boolean> {
  // Check if requested date is Sunday
  if (!isDeliveryDay(requestedDate)) {
    return false;
  }

  const minDate = await getMinDeliveryDate(areaName);

  // Reset time component for comparison
  const requestedDateOnly = new Date(requestedDate);
  requestedDateOnly.setHours(0, 0, 0, 0);

  const minDateOnly = new Date(minDate);
  minDateOnly.setHours(0, 0, 0, 0);

  return requestedDateOnly >= minDateOnly;
}
