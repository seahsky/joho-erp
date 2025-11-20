import { z } from "zod";
import { router, isPacker } from "../trpc";
import { prisma } from "@jimmy-beef/database";
import { TRPCError } from "@trpc/server";
import type { PackingSessionSummary, PackingOrderCard, ProductSummaryItem } from "../types/packing";
import {
  optimizeDeliveryRoute,
  getRouteOptimization,
  checkIfRouteNeedsReoptimization,
} from "../services/route-optimizer";

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
              status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
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
                  status: order.status as 'confirmed' | 'packing' | 'ready_for_delivery',
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

      // Get packed items from database
      const packedSkus = new Set(order.packing?.packedItems ?? []);

      const items = order.items.map((item) => ({
        sku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        packed: packedSkus.has(item.sku), // Read from database
      }));

      const allItemsPacked = items.length > 0 && items.every((item) => item.packed);

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
   * Persists packed state to database for optimistic UI updates
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

      // Get current packed items or initialize empty array
      const packedItems = order.packing?.packedItems ?? [];

      // Update packed items array
      const updatedPackedItems = input.packed
        ? [...new Set([...packedItems, input.itemSku])] // Add SKU (deduplicate)
        : packedItems.filter((sku) => sku !== input.itemSku); // Remove SKU

      // Update order with packed items and move to packing status if confirmed
      await prisma.order.update({
        where: {
          id: input.orderId,
        },
        data: {
          status: order.status === 'confirmed' ? 'packing' : order.status,
          packing: {
            ...(order.packing ?? {}),
            packedItems: updatedPackedItems,
          },
          statusHistory: order.status === 'confirmed' ? {
            push: {
              status: 'packing',
              changedAt: new Date(),
              changedBy: ctx.userId || 'system',
              notes: 'Order moved to packing status',
            },
          } : order.statusHistory,
        },
      });

      return {
        success: true,
        packedItems: updatedPackedItems,
      };
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

  /**
   * Optimize delivery route for a specific date
   * Calculates packing and delivery sequences using Mapbox
   */
  optimizeRoute: isPacker
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
   */
  getOptimizedSession: isPacker
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
      })
    )
    .query(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);

      // Get all orders for the delivery date
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
            in: ["confirmed", "packing", "ready_for_delivery"],
          },
        },
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

      const productSummary = Array.from(productMap.values()).sort((a, b) =>
        a.sku.localeCompare(b.sku)
      );

      // Check if route is optimized
      const routeOptimization = await getRouteOptimization(deliveryDate);
      const needsReoptimization = await checkIfRouteNeedsReoptimization(deliveryDate);

      return {
        deliveryDate,
        orders: orders.map((order) => ({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.businessName ?? "Unknown Customer",
          areaTag: order.deliveryAddress.areaTag,
          packingSequence: order.packing?.packingSequence ?? null,
          deliverySequence: order.delivery?.deliverySequence ?? null,
          status: order.status,
          packedItemsCount: order.packing?.packedItems?.length ?? 0,
          totalItemsCount: order.items.length,
        })),
        productSummary,
        routeOptimization: routeOptimization
          ? {
              id: routeOptimization.id,
              optimizedAt: routeOptimization.optimizedAt,
              totalDistance: routeOptimization.totalDistance,
              totalDuration: routeOptimization.totalDuration,
              needsReoptimization,
            }
          : null,
      };
    }),

  /**
   * Get route optimization status for a date
   */
  getRouteStatus: isPacker
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
