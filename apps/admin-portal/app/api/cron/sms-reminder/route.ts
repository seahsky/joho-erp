/**
 * Cron Endpoint: SMS Order Reminder Handler
 *
 * This endpoint is called by Vercel Cron (hourly) to:
 * 1. Check if SMS reminders are globally enabled
 * 2. Check if current time matches the configured send time
 * 3. Query customers who have SMS reminders enabled for today's day of week
 * 4. Send SMS reminders to each customer
 *
 * Vercel Cron Configuration (add to vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/sms-reminder",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@joho-erp/database";
import { sendOrderReminderSms, isSmsConfigured } from "@joho-erp/api";
import { DEFAULT_SMS_TEMPLATE, DEFAULT_SMS_SEND_TIME } from "@joho-erp/shared";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

function getCurrentDayOfWeek(timezone: string = "Australia/Sydney"): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    weekday: "long",
  };
  const dayName = new Intl.DateTimeFormat("en-US", options).format(now);
  return dayName.toLowerCase();
}

function getCurrentHourMinute(timezone: string = "Australia/Sydney"): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return new Intl.DateTimeFormat("en-US", options).format(now);
}

function getTodayStartAEST(): Date {
  const now = new Date();
  // Get current date in AEST
  const aestDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Create date at midnight AEST (parsed as UTC, then we use it for comparison)
  return new Date(aestDateStr + "T00:00:00+11:00");
}

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Checking SMS reminder conditions...");

    // Check if SMS is configured via environment variables
    if (!isSmsConfigured()) {
      console.log("[Cron] SMS service not configured, skipping");
      return NextResponse.json({
        success: true,
        message: "SMS service not configured",
        skipped: true,
      });
    }

    // Get company SMS settings
    const company = await prisma.company.findFirst({
      select: {
        businessName: true,
        smsSettings: true,
      },
    });

    if (!company) {
      console.log("[Cron] Company not found");
      return NextResponse.json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if SMS is globally enabled
    if (!company.smsSettings?.enabled) {
      console.log("[Cron] SMS reminders globally disabled");
      return NextResponse.json({
        success: true,
        message: "SMS reminders globally disabled",
        skipped: true,
      });
    }

    // Get configured send time (default 09:00 AEST)
    const configuredSendTime = company.smsSettings.sendTime || DEFAULT_SMS_SEND_TIME;
    const currentTime = getCurrentHourMinute();

    // Only proceed if current hour matches the configured send time hour
    // (Cron runs hourly, so we check if the hour matches)
    const configuredHour = configuredSendTime.split(":")[0];
    const currentHour = currentTime.split(":")[0];

    if (configuredHour !== currentHour) {
      console.log(
        `[Cron] Not send time yet (current: ${currentTime}, configured: ${configuredSendTime})`
      );
      return NextResponse.json({
        success: true,
        message: `Not send time yet (current: ${currentTime}, configured: ${configuredSendTime})`,
        skipped: true,
      });
    }

    // Get current day of week in AEST
    const currentDay = getCurrentDayOfWeek();
    console.log(`[Cron] Current day: ${currentDay}, time: ${currentTime}`);

    // Query customers who have SMS reminders enabled for today
    const customers = await prisma.customer.findMany({
      where: {
        status: "active",
        smsReminderPreferences: {
          is: {
            enabled: true,
            reminderDays: { has: currentDay },
          },
        },
        contactPerson: {
          is: {
            mobile: { not: "" },
          },
        },
      },
      select: {
        id: true,
        businessName: true,
        tradingName: true,
        contactPerson: {
          select: {
            firstName: true,
            lastName: true,
            mobile: true,
          },
        },
        smsReminderPreferences: true,
      },
    });

    if (customers.length === 0) {
      console.log(`[Cron] No customers scheduled for SMS reminders on ${currentDay}`);
      return NextResponse.json({
        success: true,
        message: `No customers scheduled for ${currentDay}`,
        sentCount: 0,
      });
    }

    console.log(
      `[Cron] Found ${customers.length} customers scheduled for SMS on ${currentDay}`
    );

    // Get message template
    const messageTemplate = company.smsSettings.messageTemplate || DEFAULT_SMS_TEMPLATE;
    const companyName = company.businessName || "Joho Foods";

    // Send SMS to each customer
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ customer: string; error: string }> = [];
    const todayStart = getTodayStartAEST();

    for (const customer of customers) {
      const customerName =
        customer.tradingName ||
        customer.businessName ||
        `${customer.contactPerson.firstName} ${customer.contactPerson.lastName}`;
      const phone = customer.contactPerson.mobile;

      if (!phone) {
        console.log(`[Cron] Skipping ${customerName} - no mobile number`);
        continue;
      }

      // Check if already sent today (idempotency check)
      const lastSent = customer.smsReminderPreferences?.lastReminderSentAt;
      if (lastSent && new Date(lastSent) >= todayStart) {
        console.log(`[Cron] Skipping ${customerName} - already sent today`);
        skippedCount++;
        continue;
      }

      try {
        const result = await sendOrderReminderSms({
          customerName,
          phone,
          messageTemplate,
          companyName,
        });

        if (result.success) {
          // Update lastReminderSentAt to prevent duplicate sends
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              smsReminderPreferences: {
                ...customer.smsReminderPreferences,
                lastReminderSentAt: new Date(),
              },
            },
          });
          sentCount++;
          console.log(`[Cron] SMS sent to ${customerName}`);
        } else {
          failedCount++;
          errors.push({ customer: customerName, error: result.message });
          console.error(`[Cron] Failed to send SMS to ${customerName}: ${result.message}`);
        }
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({ customer: customerName, error: errorMessage });
        console.error(`[Cron] Error sending SMS to ${customerName}:`, error);
      }

      // Small delay between sends to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Log the result
    await prisma.systemLog.create({
      data: {
        level: failedCount > 0 ? "warning" : "info",
        service: "sms-reminder-cron",
        message: `SMS reminders sent: ${sentCount} success, ${failedCount} failed, ${skippedCount} skipped`,
        context: {
          day: currentDay,
          totalCustomers: customers.length,
          sentCount,
          failedCount,
          skippedCount,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
    });

    console.log(
      `[Cron] SMS reminder complete: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`
    );

    return NextResponse.json({
      success: true,
      message: `SMS reminders sent: ${sentCount} success, ${failedCount} failed, ${skippedCount} skipped`,
      day: currentDay,
      totalCustomers: customers.length,
      sentCount,
      failedCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Error in SMS reminder cron:", error);

    // Log the error
    await prisma.systemLog.create({
      data: {
        level: "error",
        service: "sms-reminder-cron",
        message: `SMS reminder cron failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        context: {
          error: error instanceof Error ? error.stack : String(error),
        },
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
