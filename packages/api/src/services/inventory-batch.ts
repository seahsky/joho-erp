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

    // Step 3: Consume from batches in FIFO order
    let remainingToConsume = quantityToConsume;
    const consumptions: BatchConsumptionRecord[] = [];
    const expiryWarnings: ExpiryWarning[] = [];
    let totalCost = 0;

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

      // Add to consumptions record
      consumptions.push({
        batchId: batch.id,
        quantityConsumed: quantityFromBatch,
        costPerUnit: batch.costPerUnit,
        totalCost: costFromBatch,
      });

      totalCost += costFromBatch;

      // Update batch quantity
      const newQuantity = batch.quantityRemaining - quantityFromBatch;
      const isFullyConsumed = newQuantity === 0;

      await client.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          quantityRemaining: newQuantity,
          isConsumed: isFullyConsumed,
          consumedAt: isFullyConsumed ? new Date() : null,
        },
      });

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

    return {
      totalCost,
      batchesUsed: consumptions,
      expiryWarnings,
    };
  } catch (error) {
    console.error('Error consuming stock:', error);
    throw error;
  }
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
