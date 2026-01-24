/**
 * Stock Restoration Service
 *
 * Provides unified stock restoration logic for order cancellations and returns.
 * Key features:
 * - Atomic guard using stockConsumed flag (prevents double restoration)
 * - Subproduct-to-parent aggregation (restore to parent, recalculate subproducts)
 * - Creates both inventoryTransaction AND inventoryBatch records
 * - Recalculates all sibling subproduct stocks after parent update
 */

import { PrismaClient, prisma } from '@joho-erp/database';
import {
  calculateParentConsumption,
  calculateAllSubproductStocks,
  type SubproductForStockCalc,
} from '@joho-erp/shared';

// Type for transaction client
type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Simplified order item type (from order.items JSON array)
export interface OrderItemForRestoration {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
}

// Result of stock restoration
export interface StockRestorationResult {
  success: boolean;
  restoredProducts: Array<{
    productId: string;
    productName: string;
    quantityRestored: number;
    previousStock: number;
    newStock: number;
    isSubproduct: boolean;
    parentProductId?: string;
  }>;
  inventoryBatchesCreated: number;
  inventoryTransactionsCreated: number;
}

// Input for restoreOrderStock
export interface RestoreOrderStockInput {
  orderId: string;
  orderNumber: string;
  items: OrderItemForRestoration[];
  userId: string;
  reason: string;
}

/**
 * Restores stock for a cancelled/returned order.
 *
 * IMPORTANT: Only call this if order.stockConsumed === true
 *
 * For regular products:
 * - Creates inventory transaction (type: return)
 * - Creates inventory batch for the returned stock
 * - Updates product.currentStock
 *
 * For subproducts:
 * - Calculates parent product consumption (accounting for loss percentage)
 * - Restores to parent product
 * - Recalculates all sibling subproduct stocks
 *
 * @param input - The order details and items to restore
 * @param tx - Optional transaction client for atomic operations
 * @returns StockRestorationResult with details of what was restored
 */
export async function restoreOrderStock(
  input: RestoreOrderStockInput,
  tx?: TransactionClient
): Promise<StockRestorationResult> {
  const client = tx || prisma;
  const { orderId, orderNumber, items, userId, reason } = input;

  const result: StockRestorationResult = {
    success: true,
    restoredProducts: [],
    inventoryBatchesCreated: 0,
    inventoryTransactionsCreated: 0,
  };

  // Group items by whether they're subproducts or regular products
  // For subproducts, we need to aggregate by parent product
  const productIds = items.map((item) => item.productId);
  const products = await client.product.findMany({
    where: { id: { in: productIds } },
    include: {
      parentProduct: true,
      subProducts: {
        where: { status: 'active' },
        select: {
          id: true,
          estimatedLossPercentage: true,
          parentProductId: true,
        },
      },
    },
  });

  // Create a map for quick lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Track parent products that need recalculation
  // Map: parentProductId -> { totalParentConsumption, subproductIds }
  const parentRestoreMap = new Map<
    string,
    {
      totalParentConsumption: number;
      subproductIdsToRecalc: string[];
      parentName: string;
    }
  >();

  // Process each order item
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      console.warn(
        `Product ${item.productId} not found during stock restoration for order ${orderNumber}`
      );
      continue;
    }

    const isSubproduct = !!product.parentProductId;

    if (isSubproduct && product.parentProduct) {
      // For subproducts, calculate parent consumption and aggregate
      const lossPercentage = product.estimatedLossPercentage ?? 0;
      const parentConsumption = calculateParentConsumption(item.quantity, lossPercentage);

      const existing = parentRestoreMap.get(product.parentProductId!);
      if (existing) {
        existing.totalParentConsumption += parentConsumption;
      } else {
        // Get all sibling subproducts (including this one) for recalculation
        const parentWithSiblings = await client.product.findUnique({
          where: { id: product.parentProductId! },
          include: {
            subProducts: {
              where: { status: 'active' },
              select: {
                id: true,
                estimatedLossPercentage: true,
                parentProductId: true,
              },
            },
          },
        });

        parentRestoreMap.set(product.parentProductId!, {
          totalParentConsumption: parentConsumption,
          subproductIdsToRecalc:
            parentWithSiblings?.subProducts.map((s) => s.id) || [],
          parentName: product.parentProduct.name,
        });
      }
    } else {
      // Regular product - restore directly
      const previousStock = product.currentStock;
      const newStock = previousStock + item.quantity;

      // Create inventory transaction (return)
      await client.inventoryTransaction.create({
        data: {
          productId: product.id,
          type: 'return',
          quantity: item.quantity,
          previousStock,
          newStock,
          referenceType: 'order',
          referenceId: orderId,
          notes: `Stock restored from cancelled order ${orderNumber}: ${reason}`,
          createdBy: userId,
        },
      });
      result.inventoryTransactionsCreated++;

      // Create inventory batch for the returned stock
      // Use average cost from existing batches, or 0 if no batches exist
      const existingBatch = await client.inventoryBatch.findFirst({
        where: { productId: product.id },
        orderBy: { receivedAt: 'desc' },
        select: { costPerUnit: true },
      });
      const costPerUnit = existingBatch?.costPerUnit ?? 0;

      await client.inventoryBatch.create({
        data: {
          productId: product.id,
          quantityRemaining: item.quantity,
          initialQuantity: item.quantity,
          costPerUnit,
          receivedAt: new Date(),
          notes: `Returned stock from cancelled order ${orderNumber}`,
        },
      });
      result.inventoryBatchesCreated++;

      // Update product stock
      await client.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      result.restoredProducts.push({
        productId: product.id,
        productName: product.name,
        quantityRestored: item.quantity,
        previousStock,
        newStock,
        isSubproduct: false,
      });
    }
  }

  // Process parent products that had subproduct returns
  for (const [parentId, parentData] of parentRestoreMap) {
    const parent = await client.product.findUnique({
      where: { id: parentId },
      include: {
        subProducts: {
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            estimatedLossPercentage: true,
            parentProductId: true,
            currentStock: true,
          },
        },
      },
    });

    if (!parent) {
      console.warn(
        `Parent product ${parentId} not found during stock restoration for order ${orderNumber}`
      );
      continue;
    }

    const previousParentStock = parent.currentStock;
    const newParentStock = previousParentStock + parentData.totalParentConsumption;

    // Create inventory transaction for parent (return)
    await client.inventoryTransaction.create({
      data: {
        productId: parentId,
        type: 'return',
        quantity: parentData.totalParentConsumption,
        previousStock: previousParentStock,
        newStock: newParentStock,
        referenceType: 'order',
        referenceId: orderId,
        notes: `Stock restored from cancelled order ${orderNumber} (from subproduct returns): ${reason}`,
        createdBy: userId,
      },
    });
    result.inventoryTransactionsCreated++;

    // Create inventory batch for parent's returned stock
    const existingParentBatch = await client.inventoryBatch.findFirst({
      where: { productId: parentId },
      orderBy: { receivedAt: 'desc' },
      select: { costPerUnit: true },
    });
    const parentCostPerUnit = existingParentBatch?.costPerUnit ?? 0;

    await client.inventoryBatch.create({
      data: {
        productId: parentId,
        quantityRemaining: parentData.totalParentConsumption,
        initialQuantity: parentData.totalParentConsumption,
        costPerUnit: parentCostPerUnit,
        receivedAt: new Date(),
        notes: `Returned stock from cancelled order ${orderNumber} (from subproduct returns)`,
      },
    });
    result.inventoryBatchesCreated++;

    // Update parent stock
    await client.product.update({
      where: { id: parentId },
      data: { currentStock: newParentStock },
    });

    result.restoredProducts.push({
      productId: parentId,
      productName: parentData.parentName,
      quantityRestored: parentData.totalParentConsumption,
      previousStock: previousParentStock,
      newStock: newParentStock,
      isSubproduct: false,
    });

    // Recalculate all sibling subproduct stocks based on new parent stock
    const subproductsForCalc: SubproductForStockCalc[] = parent.subProducts.map((s) => ({
      id: s.id,
      estimatedLossPercentage: s.estimatedLossPercentage,
      parentProductId: s.parentProductId,
    }));

    const newSubproductStocks = calculateAllSubproductStocks(
      newParentStock,
      subproductsForCalc
    );

    for (const subStock of newSubproductStocks) {
      const subproduct = parent.subProducts.find((s) => s.id === subStock.id);
      if (subproduct && subproduct.currentStock !== subStock.newStock) {
        await client.product.update({
          where: { id: subStock.id },
          data: { currentStock: subStock.newStock },
        });
      }
    }
  }

  return result;
}

/**
 * Marks an order as having its stock NOT consumed (for rollback scenarios).
 * This should be used when an order is cancelled BEFORE packing (stock was never consumed).
 *
 * @param orderId - The order ID
 * @param tx - Optional transaction client
 */
export async function markStockNotConsumed(
  orderId: string,
  tx?: TransactionClient
): Promise<void> {
  const client = tx || prisma;

  await client.order.update({
    where: { id: orderId },
    data: {
      stockConsumed: false,
      stockConsumedAt: null,
    },
  });
}
