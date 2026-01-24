/**
 * Cron Endpoint: Packing Session Timeout Handler
 *
 * This endpoint is called by Vercel Cron (every 5 minutes) to:
 * 1. Find packing sessions that have been inactive for 30+ minutes
 * 2. Revert those orders back to "confirmed" status
 * 3. Clear packed items from those orders
 * 4. Send notification email to warehouse manager
 *
 * Vercel Cron Configuration (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/packing-timeout",
 *     "schedule": "*\/5 * * * *"
 *   }]
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@joho-erp/database";
import { processTimedOutSessions, sendPackingTimeoutAlertEmail } from "@joho-erp/api";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("[Cron] Processing packing session timeouts...");

    // Process timed out sessions
    const result = await processTimedOutSessions();

    if (result.revertedOrders.length === 0) {
      console.log("[Cron] No timed out sessions found");
      return NextResponse.json({
        success: true,
        message: "No timed out sessions",
        processedSessions: 0,
        revertedOrders: 0,
      });
    }

    // Group reverted orders by packer/date for email notifications
    const packerGroups = new Map<
      string,
      {
        packerId: string;
        deliveryDate: Date;
        orders: Array<{ orderNumber: string; customerName: string }>;
      }
    >();

    for (const order of result.revertedOrders) {
      const key = `${order.packerId}-${order.deliveryDate.toISOString()}`;

      // Fetch customer name for the order
      const orderDetails = await prisma.order.findUnique({
        where: { id: order.orderId },
        select: { customerName: true },
      });

      if (!packerGroups.has(key)) {
        packerGroups.set(key, {
          packerId: order.packerId,
          deliveryDate: order.deliveryDate,
          orders: [],
        });
      }

      packerGroups.get(key)!.orders.push({
        orderNumber: order.orderNumber,
        customerName: orderDetails?.customerName || "Unknown Customer",
      });
    }

    // Send email notifications for each packer group
    for (const group of packerGroups.values()) {
      try {
        await sendPackingTimeoutAlertEmail({
          revertedOrders: group.orders,
          packerId: group.packerId,
          deliveryDate: group.deliveryDate,
          timeoutDuration: "30 minutes",
        });
        console.log(
          `[Cron] Sent timeout alert email for packer ${group.packerId}`
        );
      } catch (emailError) {
        console.error(
          `[Cron] Failed to send timeout alert email:`,
          emailError
        );
      }
    }

    console.log(
      `[Cron] Processed ${result.processedSessions} sessions, reverted ${result.revertedOrders.length} orders`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedSessions} timed out sessions`,
      processedSessions: result.processedSessions,
      revertedOrders: result.revertedOrders.length,
      details: result.revertedOrders.map((o) => ({
        orderNumber: o.orderNumber,
        packerId: o.packerId,
      })),
    });
  } catch (error) {
    console.error("[Cron] Error processing packing timeouts:", error);
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
