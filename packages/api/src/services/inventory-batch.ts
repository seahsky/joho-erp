/**
 * Inventory Batch Service
 *
 * Handles FIFO (First-In, First-Out) consumption of inventory batches
 * and tracks cost of goods sold (COGS) per transaction.
 */

import { prisma } from '@joho-erp/database';
import type { PrismaClient } from '@joho-erp/database';

// Types for batch consumption results
export interface BatchConsumptionRecord {
  batchId: string;
  quantityConsumed: number;
  costPerUnit: number;
  totalCost: number;
}

export interface ExpiryWarning {
  batchId: string;
  expiryDate: Date;
  quantityRemaining: number;
  daysUntilExpiry: number;
}

export interface ConsumeStockResult {
  totalCost: number; // In cents
  batchesUsed: BatchConsumptionRecord[];
  expiryWarnings: ExpiryWarning[];
}

/**
 * Consume stock from batches using FIFO (First-In, First-Out) method
 *
 * @param productId - The product to consume stock from
 * @param quantityToConsume - How much stock to consume
 * @param transactionId - The InventoryTransaction ID that triggered this consumption
 * @param orderId - Optional order ID if this consumption is for an order
 * @param orderNumber - Optional order number for easy lookup
 * @param tx - Prisma transaction context (optional, uses global prisma if not provided)
 * @returns Result with total cost, batches used, and expiry warnings
 * @throws Error if insufficient stock available
 */
export async function consumeStock(
  productId: string,
  quantityToConsume: number,
  transactionId: string,
  orderId?: string,
  orderNumber?: string,
  tx?: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
): Promise<ConsumeStockResult> {
  // Use provided transaction context or global prisma instance
  const client = tx || prisma;

  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // Step 1: Get available batches in FIFO order (oldest receivedAt first)
      // Filter: quantityRemaining > 0, isConsumed = false, not expired
      const now = new Date();
      const availableBatches = await client.inventoryBatch.findMany({
        where: {
          productId,
          isConsumed: false,
          quantityRemaining: { gt: 0 },
          OR: [
            { expiryDate: null }, // No expiry date
            { expiryDate: { gt: now } }, // Not yet expired
          ],
        },
        orderBy: { receivedAt: 'asc' }, // FIFO: oldest first
      });

      // Step 2: Validate sufficient stock
      const totalAvailable = availableBatches.reduce(
        (sum: number, batch) => sum + batch.quantityRemaining,
        0
      );

      if (totalAvailable < quantityToConsume) {
        throw new Error(
          `Insufficient stock. Need ${quantityToConsume}, have ${totalAvailable}`
        );
      }

      // Step 3: Consume from batches in FIFO order with atomic guards
      let remainingToConsume = quantityToConsume;
      const consumptions: BatchConsumptionRecord[] = [];
      const expiryWarnings: ExpiryWarning[] = [];
      let totalCost = 0;
      let conflictDetected = false;

      for (const batch of availableBatches) {
        if (remainingToConsume <= 0) break;

        // Check if batch expires soon (within 7 days)
        if (batch.expiryDate) {
          const daysUntilExpiry = Math.ceil(
            (batch.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry <= 7) {
            expiryWarnings.push({
              batchId: batch.id,
              expiryDate: batch.expiryDate,
              quantityRemaining: batch.quantityRemaining,
              daysUntilExpiry,
            });
          }
        }

        // Consume from this batch
        const quantityFromBatch = Math.min(
          batch.quantityRemaining,
          remainingToConsume
        );

        // Calculate cost from this batch (in cents)
        const costFromBatch = Math.round(quantityFromBatch * batch.costPerUnit);

        // Calculate new quantity
        const newQuantity = batch.quantityRemaining - quantityFromBatch;
        const isFullyConsumed = newQuantity === 0;

        // ATOMIC GUARD: Use updateMany with WHERE condition on expected quantityRemaining
        // This prevents race conditions where another process consumed from this batch
        const updateResult = await client.inventoryBatch.updateMany({
          where: {
            id: batch.id,
            quantityRemaining: batch.quantityRemaining, // Optimistic lock on expected value
            isConsumed: false, // Must not already be consumed
          },
          data: {
            quantityRemaining: newQuantity,
            isConsumed: isFullyConsumed,
            consumedAt: isFullyConsumed ? new Date() : null,
          },
        });

        // Check if update succeeded (batch wasn't modified by another process)
        if (updateResult.count === 0) {
          // Batch was consumed by another process - conflict detected
          conflictDetected = true;
          break; // Break and retry the entire operation
        }

        // Update succeeded - record the consumption
        consumptions.push({
          batchId: batch.id,
          quantityConsumed: quantityFromBatch,
          costPerUnit: batch.costPerUnit,
          totalCost: costFromBatch,
        });

        totalCost += costFromBatch;

        // Create BatchConsumption record
        await client.batchConsumption.create({
          data: {
            batchId: batch.id,
            transactionId,
            quantityConsumed: quantityFromBatch,
            costPerUnit: batch.costPerUnit,
            totalCost: costFromBatch,
            orderId: orderId || null,
            orderNumber: orderNumber || null,
          },
        });

        remainingToConsume -= quantityFromBatch;
      }

      // If conflict detected, retry the entire operation
      if (conflictDetected) {
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          throw new Error(
            `Concurrent batch consumption conflict after ${MAX_RETRIES} retries. Please try again.`
          );
        }
        // Small delay before retry to reduce contention
        await new Promise((resolve) => setTimeout(resolve, 50 * retryCount));
        continue; // Retry the loop
      }

      // Check if we consumed enough (shouldn't happen if validation passed, but be safe)
      if (remainingToConsume > 0) {
        throw new Error(
          `Failed to consume all required stock. Remaining: ${remainingToConsume}`
        );
      }

      return {
        totalCost,
        batchesUsed: consumptions,
        expiryWarnings,
      };
    } catch (error) {
      // Re-throw non-conflict errors immediately
      if (error instanceof Error && !error.message.includes('conflict')) {
        console.error('Error consuming stock:', error);
        throw error;
      }
      // For conflict errors, the while loop handles retries
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        console.error('Error consuming stock after retries:', error);
        throw error;
      }
    }
  }

  // Should never reach here, but TypeScript needs a return
  throw new Error('Unexpected error in consumeStock');
}

/**
 * Check if there is sufficient non-expired stock available
 *
 * @param productId - The product to check
 * @param quantityNeeded - How much stock is needed
 * @param prisma - Prisma client instance (optional)
 * @returns True if sufficient stock available, false otherwise
 */
export async function hasAvailableStock(
  productId: string,
  quantityNeeded: number,
  tx?: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
): Promise<boolean> {
  const client = tx || prisma;

  try {
    const now = new Date();
    const availableBatches = await client.inventoryBatch.findMany({
      where: {
        productId,
        isConsumed: false,
        quantityRemaining: { gt: 0 },
        OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
      },
      select: { quantityRemaining: true },
    });

    const totalAvailable = availableBatches.reduce(
      (sum: number, batch) => sum + batch.quantityRemaining,
      0
    );

    return totalAvailable >= quantityNeeded;
  } catch (error) {
    console.error('Error checking available stock:', error);
    throw error;
  }
}

/**
 * Sync currentStock with actual batch availability.
 * Products may show stale currentStock if their batches have expired since the last update.
 * This function recalculates currentStock based on non-expired, non-consumed batch quantities,
 * and updates subproduct stocks for any affected parents.
 *
 * @param tx - Optional Prisma transaction context
 * @returns Number of products whose stock was synced
 */
export async function syncExpiredBatchStock(
  tx?: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
): Promise<number> {
  const client = tx || prisma;
  const now = new Date();

  // Get all non-subproduct products with positive stock
  const products = await client.product.findMany({
    where: { currentStock: { gt: 0 }, parentProductId: null },
    select: { id: true, currentStock: true },
  });

  if (products.length === 0) return 0;

  // Get available batch totals grouped by productId
  const batchGroups = await client.inventoryBatch.groupBy({
    by: ['productId'],
    where: {
      isConsumed: false,
      quantityRemaining: { gt: 0 },
      OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
    },
    _sum: { quantityRemaining: true },
  });

  const batchStockMap = new Map(
    batchGroups.map((b) => [b.productId, b._sum.quantityRemaining || 0])
  );

  let synced = 0;
  for (const product of products) {
    const batchStock = batchStockMap.get(product.id) ?? 0;
    if (Math.abs(product.currentStock - batchStock) > 0.01) {
      await client.product.update({
        where: { id: product.id },
        data: { currentStock: batchStock },
      });
      // Recalculate subproduct stocks
      const subproducts = await client.product.findMany({
        where: { parentProductId: product.id },
        select: { id: true, estimatedLossPercentage: true, parentProductId: true },
      });
      if (subproducts.length > 0) {
        const { calculateAllSubproductStocks } = await import(
          '@joho-erp/shared'
        );
        const updated = calculateAllSubproductStocks(batchStock, subproducts);
        for (const { id, newStock } of updated) {
          await client.product.update({ where: { id }, data: { currentStock: newStock } });
        }
      }
      synced++;
    }
  }
  return synced;
}

/**
 * Get the total available (non-expired) stock for a product
 *
 * @param productId - The product to check
 * @param prisma - Prisma client instance (optional)
 * @returns Total quantity available in non-expired batches
 */
export async function getAvailableStockQuantity(
  productId: string,
  tx?: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
): Promise<number> {
  const client = tx || prisma;

  try {
    const now = new Date();
    const availableBatches = await client.inventoryBatch.findMany({
      where: {
        productId,
        isConsumed: false,
        quantityRemaining: { gt: 0 },
        OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
      },
      select: { quantityRemaining: true },
    });

    return availableBatches.reduce(
      (sum: number, batch) => sum + batch.quantityRemaining,
      0
    );
  } catch (error) {
    console.error('Error getting available stock quantity:', error);
    throw error;
  }
}
