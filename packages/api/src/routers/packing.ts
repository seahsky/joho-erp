import { z } from "zod";
import { router, isPacker } from "../trpc";
import { prisma } from "@jimmy-beef/database";
import { TRPCError } from "@trpc/server";
import type { PackingSessionSummary, PackingOrderCard, ProductSummaryItem } from "../types/packing";

export const packingRouter = router({
  /**
   * Get packing session for a specific delivery date
   * Returns all orders that need packing and aggregated product summary
   */
  getSession: isPacker
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
      })
    )
    .query(async ({ input }): Promise<PackingSessionSummary> => {
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
            });
          } else {
            productMap.set(productId, {
              productId: item.productId,
              sku: item.sku,
              productName: item.productName,
              unit: item.unit,
              totalQuantity: item.quantity,
              orders: [
                {
                  orderNumber: order.orderNumber,
                  quantity: item.quantity,
                },
              ],
            });
          }
        }
      }

      const productSummary = Array.from(productMap.values()).sort((a, b) =>
        a.sku.localeCompare(b.sku)
      );

      return {
        deliveryDate,
        orders: orders.map((order) => ({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.businessName ?? 'Unknown Customer',
          areaTag: order.deliveryAddress.areaTag,
        })),
        productSummary,
      };
    }),

  /**
   * Get detailed order information for packing
   */
  getOrderDetails: isPacker
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

      // Determine which items are packed
      // For simplicity, we'll track this in memory or use a separate field
      // In a real implementation, you might add a 'packedItems' field to the Order model
      const items = order.items.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        packed: false, // TODO: Track packed state in database
      }));

      const allItemsPacked = items.every((item) => item.packed);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.businessName ?? 'Unknown Customer',
        deliveryAddress: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
        areaTag: order.deliveryAddress.areaTag,
        items,
        status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
        allItemsPacked,
        packingNotes: order.packing?.notes ?? undefined,
      };
    }),

  /**
   * Mark an individual item as packed/unpacked
   * Note: This is a simplified implementation. In production, you would track
   * packed items in the database.
   */
  markItemPacked: isPacker
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

      // Update order status to 'packing' if it's currently 'confirmed'
      if (order.status === 'confirmed') {
        await prisma.order.update({
          where: {
            id: input.orderId,
          },
          data: {
            status: 'packing',
            statusHistory: {
              push: {
                status: 'packing',
                changedAt: new Date(),
                changedBy: ctx.userId || 'system',
                notes: 'Order moved to packing status',
              },
            },
          },
        });
      }

      // In a real implementation, you would update a 'packedItems' array here
      // For now, we'll just return success
      return { success: true };
    }),

  /**
   * Mark entire order as ready for delivery
   */
  markOrderReady: isPacker
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

      // Validate that order is in packing status
      if (order.status !== 'packing' && order.status !== 'confirmed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order must be in confirmed or packing status',
        });
      }

      // Update order to ready_for_delivery
      await prisma.order.update({
        where: {
          id: input.orderId,
        },
        data: {
          status: 'ready_for_delivery',
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
              notes: input.notes || 'Order packed and ready for delivery',
            },
          },
        },
      });

      // TODO: Send notification to delivery team
      // This would be implemented via email service or notification system

      return { success: true };
    }),

  /**
   * Add packing notes to an order
   */
  addPackingNotes: isPacker
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
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

      return { success: true };
    }),
});
