/**
 * Cron Endpoint: Low Stock Alert Handler
 *
 * This endpoint is called by Vercel Cron (hourly) to:
 * 1. Query products where currentStock < lowStockThreshold
 * 2. Batch low stock items into a single notification email
 * 3. Send email to admin/warehouse manager
 *
 * Vercel Cron Configuration (add to vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/low-stock",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@joho-erp/database";
import { sendLowStockAlertEmail } from "@joho-erp/api";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// Minimum hours between alerts to avoid spamming (default: 4 hours)
const MIN_ALERT_INTERVAL_HOURS = parseInt(
  process.env.LOW_STOCK_ALERT_INTERVAL_HOURS || "4",
  10
);

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Checking for low stock items...");

    // Query all active products where currentStock is at or below threshold
    const lowStockProducts = await prisma.product.findMany({
      where: {
        status: "active",
        OR: [
          // Products with threshold set
          {
            lowStockThreshold: { not: null },
            currentStock: {
              lte: prisma.product.fields.lowStockThreshold,
            },
          },
          // Out of stock products (regardless of threshold)
          {
            currentStock: { lte: 0 },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        lowStockThreshold: true,
        unit: true,
      },
      orderBy: [{ currentStock: "asc" }, { name: "asc" }],
    });

    // Filter to products that are actually low (handling the OR query)
    const filteredProducts = lowStockProducts.filter((p) => {
      if (p.currentStock <= 0) return true;
      if (p.lowStockThreshold && p.currentStock <= p.lowStockThreshold)
        return true;
      return false;
    });

    if (filteredProducts.length === 0) {
      console.log("[Cron] No low stock items found");
      return NextResponse.json({
        success: true,
        message: "No low stock items",
        itemCount: 0,
      });
    }

    console.log(
      `[Cron] Found ${filteredProducts.length} low stock items`
    );

    // Check if we recently sent an alert (to avoid spam)
    // We use SystemLog to track this
    const recentAlert = await prisma.systemLog.findFirst({
      where: {
        service: "low-stock-cron",
        level: "info",
        message: { contains: "Low stock alert sent" },
        timestamp: {
          gte: new Date(
            Date.now() - MIN_ALERT_INTERVAL_HOURS * 60 * 60 * 1000
          ),
        },
      },
      orderBy: { timestamp: "desc" },
    });

    if (recentAlert) {
      const hoursSinceLastAlert = Math.round(
        (Date.now() - recentAlert.timestamp.getTime()) / (60 * 60 * 1000)
      );
      console.log(
        `[Cron] Skipping alert - last alert was ${hoursSinceLastAlert} hours ago (threshold: ${MIN_ALERT_INTERVAL_HOURS}h)`
      );
      return NextResponse.json({
        success: true,
        message: `Alert skipped - last sent ${hoursSinceLastAlert}h ago`,
        itemCount: filteredProducts.length,
        skipped: true,
      });
    }

    // Prepare email data
    const lowStockItems = filteredProducts.map((p) => ({
      productName: p.name,
      sku: p.sku,
      currentStock: p.currentStock,
      threshold: p.lowStockThreshold || 0,
      unit: p.unit,
    }));

    // Send the email
    const emailResult = await sendLowStockAlertEmail({ lowStockItems });

    if (emailResult.success) {
      // Log successful alert
      await prisma.systemLog.create({
        data: {
          level: "info",
          service: "low-stock-cron",
          message: `Low stock alert sent for ${filteredProducts.length} items`,
          context: {
            itemCount: filteredProducts.length,
            items: filteredProducts.map((p) => p.sku),
          },
        },
      });

      console.log(
        `[Cron] Low stock alert sent for ${filteredProducts.length} items`
      );
    } else {
      console.error("[Cron] Failed to send low stock alert:", emailResult.message);
    }

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success
        ? `Alert sent for ${filteredProducts.length} low stock items`
        : `Failed to send alert: ${emailResult.message}`,
      itemCount: filteredProducts.length,
      items: filteredProducts.map((p) => ({
        sku: p.sku,
        name: p.name,
        stock: p.currentStock,
        threshold: p.lowStockThreshold,
      })),
    });
  } catch (error) {
    console.error("[Cron] Error checking low stock:", error);
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
