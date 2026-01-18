// @ts-nocheck
import { z } from "zod";
import { router, requirePermission } from "../trpc";
import { prisma, Prisma } from "@joho-erp/database";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get user display name and email for audit trail
 */
async function getUserDetails(userId: string | null): Promise<{
  changedByName: string | null;
  changedByEmail: string | null;
}> {
  if (!userId) {
    return { changedByName: null, changedByEmail: null };
  }
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const changedByName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || null;
    const changedByEmail = user.emailAddresses[0]?.emailAddress || null;
    return { changedByName, changedByEmail };
  } catch (error) {
    console.error('Failed to fetch user details:', error);
    return { changedByName: null, changedByEmail: null };
  }
}
import type { PackingSessionSummary, PackingOrderCard, ProductSummaryItem } from "../types/packing";
import {
  optimizeDeliveryRoute,
  getRouteOptimization,
  checkIfRouteNeedsReoptimization,
  calculatePerDriverSequences,
} from "../services/route-optimizer";
import {
  startPackingSession,
  updateSessionActivityByPacker,
} from "../services/packing-session";
import { sendOrderReadyForDeliveryEmail } from "../services/email";
import { createMoney, multiplyMoney, toCents, calculateOrderTotals } from "@joho-erp/shared";
import { createHash } from "crypto";
import {
  logPackingItemUpdate,
  logPackingNotesUpdate,
  logOrderReadyForDelivery,
  logPackingOrderPauseResume,
  logPackingOrderReset,
  logPackingItemQuantityUpdate,
} from "../services/audit";

export const packingRouter = router({
  /**
   * Get packing session for a specific delivery date
   * Returns all orders that need packing and aggregated product summary
   * Also starts/resumes a packing session for timeout tracking
   */
  getSession: requirePermission('packing:view')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
      })
    )
    .query(async ({ input, ctx }): Promise<PackingSessionSummary> => {
      const deliveryDate = new Date(input.deliveryDate);

      // Get all orders for the delivery date with status 'confirmed' or 'packing'
      // Use UTC methods to avoid timezone inconsistencies
      const startOfDay = new Date(deliveryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: {
          requestedDeliveryDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
          status: {
            in: ['confirmed', 'packing'],
          },
        },
        include: {
          customer: {
            select: {
              businessName: true,
            },
          },
        },
        orderBy: {
          orderNumber: 'asc',
        },
      });

      // Build product summary by aggregating quantities across all orders
      const productMap = new Map<string, ProductSummaryItem>();

      for (const order of orders) {
        for (const item of order.items) {
          // Defensive: Skip items without productId
          if (!item.productId) {
            console.warn(`Order ${order.orderNumber} has item without productId:`, {
              sku: item.sku,
              productName: item.productName,
            });
            continue;
          }

          const productId = item.productId;

          if (productMap.has(productId)) {
            const existing = productMap.get(productId)!;
            existing.totalQuantity += item.quantity;
            existing.orders.push({
              orderNumber: order.orderNumber,
              quantity: item.quantity,
              status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
            });
          } else {
            productMap.set(productId, {
              productId: item.productId,
              sku: item.sku,
              productName: item.productName,
              category: null, // Will be populated after fetching from products
              unit: item.unit,
              totalQuantity: item.quantity,
              orders: [
                {
                  orderNumber: order.orderNumber,
                  quantity: item.quantity,
                  status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
                },
              ],
            });
          }
        }
      }

      // Fetch categories for all products in the productMap
      const productIds = Array.from(productMap.keys());
      const productsWithCategories = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true },
      });

      // Create a map of productId -> category
      const categoryMap = new Map<string, string | null>();
      for (const product of productsWithCategories) {
        categoryMap.set(product.id, product.category);
      }

      // Add category to each product summary item
      for (const [productId, item] of productMap.entries()) {
        item.category = categoryMap.get(productId) as ProductSummaryItem['category'] ?? null;
      }

      const productSummary = Array.from(productMap.values()).sort((a, b) =>
        a.sku.localeCompare(b.sku)
      );

      // Start or resume packing session for timeout tracking
      if (ctx.userId && orders.length > 0) {
        const orderIds = orders.map((order) => order.id);
        await startPackingSession(ctx.userId, deliveryDate, orderIds);
      }

      // Get area info for orders
      const areaIds = [...new Set(orders.map((o) => o.deliveryAddress.areaId).filter(Boolean))];
      const areasData = areaIds.length > 0
        ? await prisma.area.findMany({ where: { id: { in: areaIds as string[] } } })
        : [];
      const areaMap = new Map(areasData.map((a) => [a.id, a]));

      return {
        deliveryDate,
        orders: orders.map((order) => {
          const areaId = order.deliveryAddress.areaId;
          const areaInfo = areaId ? areaMap.get(areaId) : null;
          return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customer?.businessName ?? 'Unknown Customer',
            area: areaInfo
              ? {
                  id: areaInfo.id,
                  name: areaInfo.name,
                  displayName: areaInfo.displayName,
                  colorVariant: areaInfo.colorVariant,
                }
              : null,
          };
        }),
        productSummary,
      };
    }),

  /**
   * Get detailed order information for packing
   * Includes current stock levels for each product
   */
  getOrderDetails: requirePermission('packing:view')
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .query(async ({ input }): Promise<PackingOrderCard> => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.orderId,
        },
        include: {
          customer: {
            select: {
              businessName: true,
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Get packed items from database
      const packedSkus = new Set(order.packing?.packedItems ?? []);

      // Fetch current stock levels for all products in the order
      const productIds = order.items.map((item) => item.productId).filter(Boolean);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          currentStock: true,
          lowStockThreshold: true,
        },
      });

      // Create a map for quick lookup
      const productStockMap = new Map(
        products.map((p) => [p.id, { currentStock: p.currentStock, lowStockThreshold: p.lowStockThreshold }])
      );

      // Get area info
      const areaId = order.deliveryAddress.areaId;
      const areaInfo = areaId
        ? await prisma.area.findUnique({ where: { id: areaId } })
        : null;

      const items = order.items.map((item) => {
        const stockInfo = productStockMap.get(item.productId) ?? { currentStock: 0, lowStockThreshold: undefined };
        return {
          productId: item.productId,
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          packed: packedSkus.has(item.sku),
          unit: item.unit,
          unitPrice: item.unitPrice,
          currentStock: stockInfo.currentStock,
          lowStockThreshold: stockInfo.lowStockThreshold ?? undefined,
        };
      });

      const allItemsPacked = items.length > 0 && items.every((item) => item.packed);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.businessName ?? 'Unknown Customer',
        deliveryAddress: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
        area: areaInfo
          ? {
              id: areaInfo.id,
              name: areaInfo.name,
              displayName: areaInfo.displayName,
              colorVariant: areaInfo.colorVariant,
            }
          : null,
        items,
        status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
        allItemsPacked,
        packingNotes: order.packing?.notes ?? undefined,
      };
    }),

  /**
   * Check if PIN is required for quantity modifications
   */
  isPinRequired: requirePermission('packing:view').query(async () => {
    const company = await prisma.company.findFirst({
      select: {
        packingSettings: true,
      },
    });

    return {
      required: !!company?.packingSettings?.quantityPinHash,
    };
  }),

  /**
   * Update item quantity during packing
   * Adjusts stock and recalculates order totals
   * Requires PIN if configured in packing settings
   */
  updateItemQuantity: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
        productId: z.string(),
        newQuantity: z.number().positive(),
        pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits').optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, productId, newQuantity, pin } = input;

      // Check if PIN is required and validate
      const company = await prisma.company.findFirst({
        select: {
          packingSettings: true,
        },
      });

      const pinRequired = !!company?.packingSettings?.quantityPinHash;

      if (pinRequired) {
        if (!pin) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'PIN is required for quantity modifications',
          });
        }

        const inputPinHash = createHash('sha256').update(pin).digest('hex');

        if (inputPinHash !== company.packingSettings?.quantityPinHash) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid PIN',
          });
        }
      }

      // Fetch order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Block if stock already consumed (order marked ready)
      if (order.stockConsumed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot adjust quantities after order has been marked ready for delivery.',
        });
      }

      // Block if not in editable status
      if (!['confirmed', 'packing'].includes(order.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot adjust quantities when order is in '${order.status}' status. Order must be in confirmed or packing status.`,
        });
      }

      // Find the item in the order
      const itemIndex = order.items.findIndex((item) => item.productId === productId);
      if (itemIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found in order',
        });
      }

      const item = order.items[itemIndex];
      const oldQuantity = item.quantity;
      const quantityDiff = newQuantity - oldQuantity;

      // Fetch product for stock validation
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          currentStock: true,
          name: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // If increasing quantity, validate stock availability
      if (quantityDiff > 0 && product.currentStock < quantityDiff) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient stock. Only ${product.currentStock} ${item.unit} available.`,
        });
      }

      // Calculate new subtotal for this item using dinero.js
      const unitPriceMoney = createMoney(item.unitPrice);
      const newSubtotalMoney = multiplyMoney(unitPriceMoney, newQuantity);
      const newSubtotal = toCents(newSubtotalMoney);

      // Update items array with new quantity and subtotal
      const updatedItems = order.items.map((orderItem, idx) => {
        if (idx === itemIndex) {
          return {
            ...orderItem,
            quantity: newQuantity,
            subtotal: newSubtotal,
          };
        }
        return orderItem;
      });

      // Recalculate order totals using per-product GST settings
      const newTotals = calculateOrderTotals(
        updatedItems.map((i: any) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          applyGst: i.applyGst ?? false,
          gstRate: i.gstRate ?? null,
        }))
      );

      // Calculate new stock level
      const newStock = product.currentStock - quantityDiff;

      // Get user details for audit trail
      const userDetails = await getUserDetails(ctx.userId);

      // Perform all updates in a transaction
      await prisma.$transaction(async (tx) => {
        // Re-check stockConsumed inside transaction to prevent race condition
        const freshOrder = await tx.order.findUnique({
          where: { id: orderId },
          select: { stockConsumed: true, status: true },
        });

        if (freshOrder?.stockConsumed) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Order was marked ready concurrently. Cannot adjust quantities.',
          });
        }

        if (freshOrder && !['confirmed', 'packing'].includes(freshOrder.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Order status changed to '${freshOrder.status}'. Cannot adjust quantities.`,
          });
        }

        // Create inventory transaction for audit trail
        const transaction = await tx.inventoryTransaction.create({
          data: {
            productId,
            type: 'adjustment',
            adjustmentType: 'packing_adjustment',
            quantity: -quantityDiff, // Negative when reducing stock (increasing order qty)
            previousStock: product.currentStock,
            newStock,
            referenceType: 'order',
            referenceId: orderId,
            notes: `Packing quantity adjustment for order ${order.orderNumber}: ${oldQuantity} → ${newQuantity} ${item.unit}`,
            createdBy: ctx.userId || 'system',
          },
        });

        // NEW: Handle batch consumption based on quantity change
        if (quantityDiff > 0) {
          // Increasing order qty (reducing stock) - consume from batches
          const { consumeStock } = await import('../services/inventory-batch');
          const result = await consumeStock(
            productId,
            quantityDiff,
            transaction.id,
            orderId,
            order.orderNumber,
            tx
          );

          // Log expiry warnings if any
          if (result.expiryWarnings.length > 0) {
            console.warn(
              `Expiry warnings during packing adjustment for order ${order.orderNumber}:`,
              result.expiryWarnings
            );
          }
        } else if (quantityDiff < 0) {
          // Reducing order qty (returning stock) - create new batch for returned stock
          await tx.inventoryBatch.create({
            data: {
              productId,
              quantityRemaining: Math.abs(quantityDiff),
              initialQuantity: Math.abs(quantityDiff),
              costPerUnit: 0, // Unknown cost - admin can adjust later
              receivedAt: new Date(),
              expiryDate: null,
              receiveTransactionId: transaction.id,
              notes: `Stock returned from packing adjustment: Order ${order.orderNumber}`,
            },
          });
        }

        // Update product stock
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        });

        // Update order with new items and totals
        await tx.order.update({
          where: { id: orderId },
          data: {
            items: updatedItems,
            subtotal: newTotals.subtotal,
            taxAmount: newTotals.taxAmount,
            totalAmount: newTotals.totalAmount,
            statusHistory: {
              push: {
                status: order.status,
                changedAt: new Date(),
                changedBy: ctx.userId || 'system',
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: `Item quantity adjusted: ${item.sku} ${oldQuantity} → ${newQuantity} ${item.unit}`,
              },
            },
          },
        });
      });

      // Audit log - HIGH: Quantity changes during packing must be tracked
      await logPackingItemQuantityUpdate(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        itemSku: item.sku,
        oldQuantity,
        newQuantity,
        reason: 'Packing adjustment',
      }).catch((error) => {
        console.error('Audit log failed for packing quantity update:', error);
      });

      return {
        success: true,
        oldQuantity,
        newQuantity,
        newStock,
        newSubtotal,
        newOrderTotal: newTotals.totalAmount,
      };
    }),

  /**
   * Mark an individual item as packed/unpacked
   * Persists packed state to database for optimistic UI updates
   * Also updates lastPackedAt/lastPackedBy and clears pausedAt when actively packing
   */
  markItemPacked: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
        itemSku: z.string(),
        packed: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.orderId,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Get current packed items or initialize empty array
      const packedItems = order.packing?.packedItems ?? [];

      // Update packed items array
      const updatedPackedItems = input.packed
        ? [...new Set([...packedItems, input.itemSku])] // Add SKU (deduplicate)
        : packedItems.filter((sku) => sku !== input.itemSku); // Remove SKU

      // Get user details for audit trail
      const userDetails = await getUserDetails(ctx.userId);

      // Update order with packed items and move to packing status if confirmed
      // Also update lastPackedAt/lastPackedBy and clear pausedAt (active packing)
      await prisma.order.update({
        where: {
          id: input.orderId,
        },
        data: {
          status: order.status === 'confirmed' ? 'packing' : order.status,
          packing: {
            ...(order.packing ?? {}),
            packedItems: updatedPackedItems,
            // Track when and who last packed
            lastPackedAt: new Date(),
            lastPackedBy: ctx.userId || 'system',
            // Clear paused state when actively packing
            pausedAt: null,
          },
          statusHistory: order.status === 'confirmed' ? {
            push: {
              status: 'packing',
              changedAt: new Date(),
              changedBy: ctx.userId || 'system',
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
              notes: 'Order moved to packing status',
            },
          } : order.statusHistory,
        },
      });

      // Update packing session activity to prevent timeout
      if (ctx.userId) {
        await updateSessionActivityByPacker(ctx.userId, order.requestedDeliveryDate);
      }

      // Audit log - MEDIUM: Item packing tracked
      await logPackingItemUpdate(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
        orderNumber: order.orderNumber,
        itemSku: input.itemSku,
        action: input.packed ? 'packed' : 'unpacked',
      }).catch((error) => {
        console.error('Audit log failed for mark item packed:', error);
      });

      return {
        success: true,
        packedItems: updatedPackedItems,
      };
    }),

  /**
   * Mark entire order as ready for delivery
   */
  markOrderReady: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get user details for audit trail (can be done outside transaction)
      const userDetails = await getUserDetails(ctx.userId);

      // Import shared utilities
      const { consumeStock } = await import('../services/inventory-batch');
      const { isSubproduct, calculateParentConsumption, calculateAllSubproductStocks } = await import('@joho-erp/shared');

      // Store order data for email/audit after transaction
      let orderData: { 
        orderNumber: string; 
        customerEmail: string; 
        customerName: string; 
        deliveryDate: Date;
      } | null = null;

      // Track missing products for logging
      const missingProducts: string[] = [];

      // Reduce stock and update order in a transaction
      await prisma.$transaction(async (tx) => {
        // Fetch order INSIDE transaction for fresh data
        const freshOrder = await tx.order.findUnique({
          where: { id: input.orderId },
          include: { customer: true },
        });

        if (!freshOrder) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }

        // Idempotency check - prevent double stock consumption
        if (freshOrder.stockConsumed) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Stock already consumed for this order. This operation has already been completed.',
          });
        }

        // Validate order status
        if (freshOrder.status !== 'packing' && freshOrder.status !== 'confirmed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Order is in '${freshOrder.status}' status, cannot mark ready. Must be in confirmed or packing status.`,
          });
        }

        // Store order data for use after transaction
        orderData = {
          orderNumber: freshOrder.orderNumber,
          customerEmail: freshOrder.customer.contactPerson.email,
          customerName: freshOrder.customer.businessName,
          deliveryDate: freshOrder.requestedDeliveryDate,
        };

        // Get products INSIDE transaction for fresh data
        const productIds = (freshOrder.items as any[]).map((item: any) => item.productId).filter(Boolean);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          include: { parentProduct: true },
        });

        // Create a product map for quick lookup
        const productMap = new Map(products.map((p) => [p.id, p]));

        // Track which parent products have been updated to avoid duplicate recalculations
        const updatedParentIds = new Set<string>();

        for (const item of freshOrder.items as any[]) {
          const product = productMap.get(item.productId);
          
          // Handle deleted products - log and skip
          if (!product) {
            missingProducts.push(`${item.productName} (${item.sku})`);
            continue;
          }

          // Check if this is a subproduct (has parent)
          const productIsSubproduct = isSubproduct(product);
          const parentProduct = productIsSubproduct ? product.parentProduct : null;

          // For subproducts: consume from parent; for regular products: consume directly
          const consumeFromProductId = parentProduct ? parentProduct.id : product.id;

          // Get current stock of the product we're consuming from (FRESH data inside tx)
          const consumeFromProduct = parentProduct
            ? await tx.product.findUnique({ where: { id: parentProduct.id } })
            : await tx.product.findUnique({ where: { id: product.id } });

          if (!consumeFromProduct) continue;

          // Calculate consumption quantity (for subproducts, account for loss)
          const consumeQuantity = productIsSubproduct
            ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
            : item.quantity;

          const previousStock = consumeFromProduct.currentStock;
          const newStock = previousStock - consumeQuantity;

          // Validate stock availability with fresh data
          if (newStock < 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient stock for ${product.name}. Available: ${previousStock}, Required: ${consumeQuantity}`,
            });
          }

          // Create inventory transaction on the source product (parent for subproducts)
          const transactionNotes = productIsSubproduct
            ? `Subproduct packed: ${product.name} (${item.quantity}${product.unit}) for order ${freshOrder.orderNumber}`
            : `Stock consumed at packing for order ${freshOrder.orderNumber}`;

          const transaction = await tx.inventoryTransaction.create({
            data: {
              productId: consumeFromProductId,
              type: 'sale',
              quantity: -consumeQuantity,
              previousStock,
              newStock,
              referenceType: 'order',
              referenceId: freshOrder.id,
              notes: transactionNotes,
              createdBy: ctx.userId || 'system',
            },
          });

          // Consume from batches via FIFO (from parent for subproducts)
          try {
            const result = await consumeStock(
              consumeFromProductId,
              consumeQuantity,
              transaction.id,
              freshOrder.id,
              freshOrder.orderNumber,
              tx
            );

            // Log expiry warnings if any
            if (result.expiryWarnings.length > 0) {
              console.warn(
                `Expiry warnings for order ${freshOrder.orderNumber}:`,
                result.expiryWarnings
              );
            }
          } catch (stockError) {
            console.error(`Stock consumption failed for order ${freshOrder.orderNumber}, product ${product.id}:`, stockError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to consume stock for ${product.name}. Transaction rolled back. Please retry.`,
            });
          }

          // Update product stock with atomic condition check for parent products
          if (productIsSubproduct && parentProduct && !updatedParentIds.has(parentProduct.id)) {
            // Use atomic update with currentStock condition to prevent race conditions
            const parentUpdateResult = await tx.product.updateMany({
              where: { id: parentProduct.id, currentStock: previousStock },
              data: { currentStock: newStock },
            });

            if (parentUpdateResult.count === 0) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: `Stock for ${parentProduct.name} modified concurrently. Please retry.`,
              });
            }

            // Find all subproducts of this parent and recalculate their stocks
            const subproducts = await tx.product.findMany({
              where: { parentProductId: parentProduct.id },
              select: { id: true, parentProductId: true, estimatedLossPercentage: true },
            });

            if (subproducts.length > 0) {
              const updatedStocks = calculateAllSubproductStocks(newStock, subproducts);
              for (const { id, newStock: subStock } of updatedStocks) {
                await tx.product.update({
                  where: { id },
                  data: { currentStock: subStock },
                });
              }
            }

            updatedParentIds.add(parentProduct.id);
          } else if (!productIsSubproduct) {
            // Regular product: just update its stock
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: newStock },
            });

            // If this regular product has subproducts, recalculate their stocks too
            const subproducts = await tx.product.findMany({
              where: { parentProductId: product.id },
              select: { id: true, parentProductId: true, estimatedLossPercentage: true },
            });

            if (subproducts.length > 0) {
              const updatedStocks = calculateAllSubproductStocks(newStock, subproducts);
              for (const { id, newStock: subStock } of updatedStocks) {
                await tx.product.update({
                  where: { id },
                  data: { currentStock: subStock },
                });
              }
            }
          }
        }

        // Log warning for missing products
        if (missingProducts.length > 0) {
          console.warn(`Order ${freshOrder.orderNumber}: Skipped deleted products:`, missingProducts);
        }

        // Atomic update with version check for optimistic locking
        const updateResult = await tx.order.updateMany({
          where: { 
            id: input.orderId, 
            version: freshOrder.version,
            stockConsumed: false,
          },
          data: {
            status: 'ready_for_delivery',
            stockConsumed: true,
            stockConsumedAt: new Date(),
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'Order modified concurrently. Please retry.' 
          });
        }

        // Update packing info and status history separately (these fields require update, not updateMany)
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            packing: {
              packedAt: new Date(),
              packedBy: ctx.userId || 'system',
              notes: input.notes,
            },
            statusHistory: {
              push: {
                status: 'ready_for_delivery',
                changedAt: new Date(),
                changedBy: ctx.userId || 'system',
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: input.notes || 'Order packed and ready for delivery',
              },
            },
          },
        });
      });

      // Send order ready for delivery email to customer (after transaction success)
      if (orderData) {
        await sendOrderReadyForDeliveryEmail({
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName,
          orderNumber: orderData.orderNumber,
          deliveryDate: orderData.deliveryDate,
        }).catch((error) => {
          console.error('Failed to send order ready for delivery email:', error);
        });

        // Audit log - HIGH: Ready for delivery must be tracked
        await logOrderReadyForDelivery(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
          orderNumber: orderData.orderNumber,
          packedBy: ctx.userId || 'system',
        }).catch((error) => {
          console.error('Audit log failed for mark order ready:', error);
        });
      }

      return { success: true };
    }),

  /**
   * Add packing notes to an order
   */
  addPackingNotes: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.orderId,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      await prisma.order.update({
        where: {
          id: input.orderId,
        },
        data: {
          packing: {
            ...order.packing,
            notes: input.notes,
          },
        },
      });

      // Audit log - LOW: Packing notes tracked
      await logPackingNotesUpdate(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
        orderNumber: order.orderNumber,
        notes: input.notes,
      }).catch((error) => {
        console.error('Audit log failed for packing notes:', error);
      });

      return { success: true };
    }),

  /**
   * Pause packing on an order - saves progress for later
   * Sets pausedAt timestamp and keeps order in 'packing' status
   */
  pauseOrder: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.orderId,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Only allow pausing orders that are in 'packing' status
      if (order.status !== 'packing') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only orders in packing status can be paused',
        });
      }

      // Must have some progress to pause
      const packedItemsCount = order.packing?.packedItems?.length ?? 0;
      if (packedItemsCount === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot pause order with no packed items',
        });
      }

      // Get user details for audit trail
      const userDetails = await getUserDetails(ctx.userId);

      await prisma.order.update({
        where: { id: input.orderId },
        data: {
          packing: {
            ...order.packing,
            pausedAt: new Date(),
            notes: input.notes || order.packing?.notes,
          },
          statusHistory: {
            push: {
              status: 'packing',
              changedAt: new Date(),
              changedBy: ctx.userId || 'system',
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
              notes: `Packing paused. Progress: ${packedItemsCount} items packed`,
            },
          },
        },
      });

      // Audit log - MEDIUM: Packing pause tracked
      await logPackingOrderPauseResume(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
        orderNumber: order.orderNumber,
        action: 'pause',
        reason: input.notes,
      }).catch((error) => {
        console.error('Audit log failed for pause order:', error);
      });

      return { success: true };
    }),

  /**
   * Resume packing on a paused order
   * Clears pausedAt and updates lastPackedAt/lastPackedBy
   */
  resumeOrder: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.orderId,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Only allow resuming orders that are in 'packing' status
      if (order.status !== 'packing') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only orders in packing status can be resumed',
        });
      }

      // Get user details for audit trail
      const userDetails = await getUserDetails(ctx.userId);

      await prisma.order.update({
        where: { id: input.orderId },
        data: {
          packing: {
            ...order.packing,
            pausedAt: null,
            lastPackedAt: new Date(),
            lastPackedBy: ctx.userId || 'system',
          },
          statusHistory: {
            push: {
              status: 'packing',
              changedAt: new Date(),
              changedBy: ctx.userId || 'system',
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
              notes: 'Packing resumed',
            },
          },
        },
      });

      // Update packing session activity
      if (ctx.userId) {
        await updateSessionActivityByPacker(ctx.userId, order.requestedDeliveryDate);
      }

      // Audit log - MEDIUM: Packing resume tracked
      await logPackingOrderPauseResume(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
        orderNumber: order.orderNumber,
        action: 'resume',
      }).catch((error) => {
        console.error('Audit log failed for resume order:', error);
      });

      return { success: true };
    }),

  /**
   * Reset order packing progress - clears all packed items
   * Reverts order to 'confirmed' status
   */
  resetOrder: requirePermission('packing:manage')
    .input(
      z.object({
        orderId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.orderId,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Only allow resetting orders that are in 'packing', 'confirmed', or 'ready_for_delivery' status
      if (!['packing', 'confirmed', 'ready_for_delivery'].includes(order.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only orders in packing, confirmed, or ready_for_delivery status can be reset',
        });
      }

      const packedItemsCount = order.packing?.packedItems?.length ?? 0;

      // Get user details for audit trail
      const userDetails = await getUserDetails(ctx.userId);

      await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: 'confirmed',
          packing: {
            packedAt: null,
            packedBy: null,
            notes: null,
            packingSequence: order.packing?.packingSequence ?? null,
            packedItems: [],
            lastPackedAt: null,
            lastPackedBy: null,
            pausedAt: null,
          },
          statusHistory: {
            push: {
              status: 'confirmed',
              changedAt: new Date(),
              changedBy: ctx.userId || 'system',
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
              notes: `Packing reset from ${order.status} status. ${packedItemsCount} items cleared. Reason: ${input.reason || 'Manual reset by packer'}`,
            },
          },
        },
      });

      // Audit log - MEDIUM: Packing reset tracked
      await logPackingOrderReset(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
        orderNumber: order.orderNumber,
        reason: input.reason,
      }).catch((error) => {
        console.error('Audit log failed for reset order:', error);
      });

      return { success: true };
    }),

  /**
   * Optimize delivery route for a specific date
   * Calculates packing and delivery sequences using Mapbox
   */
  optimizeRoute: requirePermission('packing:manage')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
        force: z.boolean().optional(), // Force re-optimization even if route exists
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deliveryDate = new Date(input.deliveryDate);

      // Check if route already exists and is up-to-date
      if (!input.force) {
        const needsReoptimization =
          await checkIfRouteNeedsReoptimization(deliveryDate);

        if (!needsReoptimization) {
          const existingRoute = await getRouteOptimization(deliveryDate);
          if (existingRoute) {
            return {
              success: true,
              message: "Route already optimized",
              routeId: existingRoute.id,
              alreadyOptimized: true,
            };
          }
        }
      }

      try {
        const result = await optimizeDeliveryRoute(
          deliveryDate,
          ctx.userId || "system"
        );

        return {
          success: true,
          message: `Route optimized successfully. ${result.routeSummary.totalOrders} orders, ${(result.routeSummary.totalDistance / 1000).toFixed(1)} km`,
          routeId: result.routeOptimizationId,
          summary: result.routeSummary,
          alreadyOptimized: false,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Route optimization failed",
        });
      }
    }),

  /**
   * Get packing session with optimized sequences
   * Enhanced version of getSession that includes sequence numbers
   * Also starts/resumes a packing session and auto-triggers route optimization if needed
   */
  getOptimizedSession: requirePermission('packing:view')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
        areaId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const deliveryDate = new Date(input.deliveryDate);

      // Get all orders for the delivery date
      const startOfDay = new Date(deliveryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Build base where clause
      const where: Prisma.OrderWhereInput = {
        requestedDeliveryDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: {
          in: ["confirmed", "packing", "ready_for_delivery"],
        },
      };

      if (input.areaId) {
        where.deliveryAddress = {
          is: { areaId: input.areaId },
        };
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              businessName: true,
            },
          },
        },
        orderBy: [
          { packing: { packingSequence: "asc" } }, // Sort by packing sequence if available
          { orderNumber: "asc" }, // Fallback to order number
        ],
      });

      // Build product summary
      const productMap = new Map<string, ProductSummaryItem>();

      for (const order of orders) {
        for (const item of order.items) {
          if (!item.productId) continue;

          const productId = item.productId;

          if (productMap.has(productId)) {
            const existing = productMap.get(productId)!;
            existing.totalQuantity += item.quantity;
            existing.orders.push({
              orderNumber: order.orderNumber,
              quantity: item.quantity,
              status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
            });
          } else {
            productMap.set(productId, {
              productId: item.productId,
              sku: item.sku,
              productName: item.productName,
              category: null, // Will be populated after fetching from products
              unit: item.unit,
              totalQuantity: item.quantity,
              orders: [
                {
                  orderNumber: order.orderNumber,
                  quantity: item.quantity,
                  status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
                },
              ],
            });
          }
        }
      }

      // Fetch categories for all products in the productMap
      const productIds = Array.from(productMap.keys());
      const productsWithCategories = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true },
      });

      // Create a map of productId -> category
      const categoryMap = new Map<string, string | null>();
      for (const product of productsWithCategories) {
        categoryMap.set(product.id, product.category);
      }

      // Add category to each product summary item
      for (const [productId, item] of productMap.entries()) {
        item.category = categoryMap.get(productId) as ProductSummaryItem['category'] ?? null;
      }

      const productSummary = Array.from(productMap.values()).sort((a, b) =>
        a.sku.localeCompare(b.sku)
      );

      // Start or resume packing session for timeout tracking
      if (ctx.userId && orders.length > 0) {
        const orderIds = orders.map((order) => order.id);
        await startPackingSession(ctx.userId, deliveryDate, orderIds);
      }

      // Auto-trigger route optimization if needed (Task 1.2 requirement)
      let routeOptimization = await getRouteOptimization(deliveryDate);
      let needsReoptimization = await checkIfRouteNeedsReoptimization(deliveryDate);
      let routeAutoOptimized = false;

      // If route needs optimization and there are orders to pack, auto-trigger
      if (needsReoptimization && orders.length > 0) {
        try {
          await optimizeDeliveryRoute(
            deliveryDate,
            ctx.userId || "system"
          );
          routeOptimization = await getRouteOptimization(deliveryDate);
          needsReoptimization = false;
          routeAutoOptimized = true;

          // Re-fetch orders to get updated packing sequences
          const updatedOrders = await prisma.order.findMany({
            where: {
              id: { in: orders.map(o => o.id) },
            },
            include: {
              customer: {
                select: {
                  businessName: true,
                },
              },
            },
            orderBy: [
              { packing: { packingSequence: "asc" } },
              { orderNumber: "asc" },
            ],
          });

          // Calculate per-driver sequences after route optimization
          await calculatePerDriverSequences(deliveryDate).catch((error) => {
            console.error("Failed to calculate per-driver sequences:", error);
          });

          // Re-fetch orders with updated sequences
          const refetchedOrders = await prisma.order.findMany({
            where: {
              id: { in: updatedOrders.map(o => o.id) },
            },
            include: {
              customer: {
                select: {
                  businessName: true,
                },
              },
            },
            orderBy: [
              { delivery: { driverId: "asc" } }, // Group by driver
              { delivery: { driverPackingSequence: "asc" } }, // Then by per-driver packing sequence
              { packing: { packingSequence: "asc" } }, // Fallback to global packing sequence
              { orderNumber: "asc" },
            ],
          });

          // Use updated orders with packing sequences and driver info
          return {
            deliveryDate,
            orders: refetchedOrders.map((order) => ({
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customer?.businessName ?? "Unknown Customer",
              areaName: order.deliveryAddress.areaName,
              packingSequence: order.packing?.packingSequence ?? null,
              deliverySequence: order.delivery?.deliverySequence ?? null,
              // Per-driver fields for multi-driver grouping
              driverId: order.delivery?.driverId ?? null,
              driverName: order.delivery?.driverName ?? null,
              driverPackingSequence: order.delivery?.driverPackingSequence ?? null,
              driverDeliverySequence: order.delivery?.driverDeliverySequence ?? null,
              status: order.status,
              packedItemsCount: order.packing?.packedItems?.length ?? 0,
              totalItemsCount: order.items.length,
              // Partial progress fields
              isPaused: !!order.packing?.pausedAt,
              lastPackedBy: order.packing?.lastPackedBy ?? null,
              lastPackedAt: order.packing?.lastPackedAt ?? null,
            })),
            productSummary,
            routeOptimization: routeOptimization
              ? {
                  id: routeOptimization.id,
                  optimizedAt: routeOptimization.optimizedAt,
                  totalDistance: routeOptimization.totalDistance,
                  totalDuration: routeOptimization.totalDuration,
                  needsReoptimization: false,
                  autoOptimized: true,
                }
              : null,
          };
        } catch (error) {
          // If auto-optimization fails, continue with existing data
          console.error("Auto route optimization failed:", error);
        }
      }

      // Sort orders by driver, then by per-driver packing sequence for multi-driver support
      const sortedOrders = [...orders].sort((a, b) => {
        // First sort by driverId (nulls last)
        const driverA = a.delivery?.driverId ?? 'zzz'; // Put unassigned at end
        const driverB = b.delivery?.driverId ?? 'zzz';
        if (driverA !== driverB) return driverA.localeCompare(driverB);

        // Then by per-driver packing sequence
        const seqA = a.delivery?.driverPackingSequence ?? a.packing?.packingSequence ?? 999;
        const seqB = b.delivery?.driverPackingSequence ?? b.packing?.packingSequence ?? 999;
        return seqA - seqB;
      });

      return {
        deliveryDate,
        orders: sortedOrders.map((order) => ({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.businessName ?? "Unknown Customer",
          areaName: order.deliveryAddress.areaName,
          packingSequence: order.packing?.packingSequence ?? null,
          deliverySequence: order.delivery?.deliverySequence ?? null,
          // Per-driver fields for multi-driver grouping
          driverId: order.delivery?.driverId ?? null,
          driverName: order.delivery?.driverName ?? null,
          driverPackingSequence: order.delivery?.driverPackingSequence ?? null,
          driverDeliverySequence: order.delivery?.driverDeliverySequence ?? null,
          status: order.status,
          packedItemsCount: order.packing?.packedItems?.length ?? 0,
          totalItemsCount: order.items.length,
          // Partial progress fields
          isPaused: !!order.packing?.pausedAt,
          lastPackedBy: order.packing?.lastPackedBy ?? null,
          lastPackedAt: order.packing?.lastPackedAt ?? null,
        })),
        productSummary,
        routeOptimization: routeOptimization
          ? {
              id: routeOptimization.id,
              optimizedAt: routeOptimization.optimizedAt,
              totalDistance: routeOptimization.totalDistance,
              totalDuration: routeOptimization.totalDuration,
              needsReoptimization,
              autoOptimized: routeAutoOptimized,
            }
          : null,
      };
    }),

  /**
   * Get route optimization status for a date
   */
  getRouteStatus: requirePermission('packing:view')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
      })
    )
    .query(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);
      const routeOptimization = await getRouteOptimization(deliveryDate);
      const needsReoptimization = await checkIfRouteNeedsReoptimization(deliveryDate);

      return {
        isOptimized: !!routeOptimization,
        needsReoptimization,
        routeOptimization: routeOptimization
          ? {
              id: routeOptimization.id,
              optimizedAt: routeOptimization.optimizedAt,
              optimizedBy: routeOptimization.optimizedBy,
              totalDistance: routeOptimization.totalDistance,
              totalDuration: routeOptimization.totalDuration,
              orderCount: routeOptimization.orderCount,
            }
          : null,
      };
    }),
});
