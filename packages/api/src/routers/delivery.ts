import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { getRouteOptimization } from '../services/route-optimizer';

export const deliveryRouter = router({
  // Get all deliveries with filtering
  getAll: isAdminOrSales
    .input(
      z.object({
        status: z
          .enum(['ready_for_delivery', 'delivered'])
          .optional(),
        areaTag: z.enum(['north', 'south', 'east', 'west']).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const where: any = {
        status: {
          in: input.status
            ? [input.status]
            : ['ready_for_delivery', 'delivered'],
        },
      };

      if (input.areaTag) {
        where.deliveryAddress = {
          is: { areaTag: input.areaTag },
        };
      }

      if (input.dateFrom || input.dateTo) {
        where.requestedDeliveryDate = {};
        if (input.dateFrom) where.requestedDeliveryDate.gte = input.dateFrom;
        if (input.dateTo) where.requestedDeliveryDate.lte = input.dateTo;
      }

      const skip = (input.page - 1) * input.limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: [{ requestedDeliveryDate: 'asc' }, { createdAt: 'desc' }],
          include: {
            customer: {
              select: {
                deliveryAddress: true,
              },
            },
          },
        }),
        prisma.order.count({ where }),
      ]);

      // Transform orders into delivery format
      const deliveries = orders.map((order) => ({
        id: order.id,
        orderId: order.orderNumber,
        customer: order.customerName,
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
        latitude: order.customer?.deliveryAddress?.latitude ?? null,
        longitude: order.customer?.deliveryAddress?.longitude ?? null,
        areaTag: order.deliveryAddress.areaTag,
        status: order.status,
        estimatedTime: order.status === 'delivered' ? 'Completed' : order.delivery?.estimatedArrival ? new Date(order.delivery.estimatedArrival).toLocaleTimeString() : 'Pending',
        items: order.items.length,
        totalAmount: order.totalAmount,
        requestedDeliveryDate: order.requestedDeliveryDate,
        deliveryInstructions: order.deliveryAddress.deliveryInstructions,
        deliverySequence: order.delivery?.deliverySequence,
        deliveredAt: order.delivery?.deliveredAt,
      }));

      return {
        deliveries,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // Mark delivery as completed
  markDelivered: isAdminOrSales
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch current order to append to statusHistory
      const currentOrder = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!currentOrder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      const order = await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: 'delivered',
          delivery: {
            ...currentOrder.delivery,
            deliveredAt: new Date(),
          },
          statusHistory: [
            ...currentOrder.statusHistory,
            {
              status: 'delivered',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: input.notes || 'Delivery completed',
            },
          ],
        },
      });

      // Enqueue Xero invoice creation
      const { enqueueXeroJob } = await import('../services/xero-queue');
      await enqueueXeroJob('create_invoice', 'order', input.orderId).catch((error) => {
        console.error('Failed to enqueue Xero invoice creation:', error);
      });

      return order;
    }),

  // Get delivery statistics
  getStats: isAdminOrSales.query(async () => {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const [readyForDelivery, deliveredToday] = await Promise.all([
      prisma.order.count({
        where: { status: 'ready_for_delivery' },
      }),
      prisma.order.count({
        where: {
          status: 'delivered',
          delivery: {
            is: {
              deliveredAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
        },
      }),
    ]);

    return {
      readyForDelivery,
      deliveredToday,
    };
  }),

  // Get optimized route with geometry for map display
  getOptimizedRoute: isAdminOrSales
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
      })
    )
    .query(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);
      const routeOptimization = await getRouteOptimization(deliveryDate);

      if (!routeOptimization) {
        return {
          hasRoute: false,
          route: null,
        };
      }

      // Get all orders for this route with full details
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
            in: ['ready_for_delivery', 'delivered'],
          },
        },
        orderBy: {
          delivery: {
            deliverySequence: 'asc',
          },
        },
      });

      // Build waypoints from route optimization data
      const waypoints = routeOptimization.waypoints.map((wp) => {
        const order = orders.find((o) => o.id === wp.orderId);
        return {
          orderId: wp.orderId,
          orderNumber: wp.orderNumber,
          sequence: wp.sequence,
          address: wp.address,
          latitude: wp.latitude,
          longitude: wp.longitude,
          estimatedArrival: wp.estimatedArrival,
          distanceFromPrevious: wp.distanceFromPrevious,
          durationFromPrevious: wp.durationFromPrevious,
          status: order?.status || 'ready_for_delivery',
        };
      });

      return {
        hasRoute: true,
        route: {
          id: routeOptimization.id,
          deliveryDate: routeOptimization.deliveryDate,
          totalDistance: routeOptimization.totalDistance,
          totalDuration: routeOptimization.totalDuration,
          orderCount: routeOptimization.orderCount,
          routeGeometry: JSON.parse(routeOptimization.routeGeometry),
          waypoints,
          optimizedAt: routeOptimization.optimizedAt,
          optimizedBy: routeOptimization.optimizedBy,
        },
      };
    }),

  // Get deliveries sorted by sequence
  getDeliveriesWithSequence: isAdminOrSales
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
        status: z
          .enum(['ready_for_delivery', 'delivered'])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);
      const startOfDay = new Date(deliveryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const where: any = {
        requestedDeliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: input.status
            ? [input.status]
            : ['ready_for_delivery', 'delivered'],
        },
      };

      const orders = await prisma.order.findMany({
        where,
        orderBy: [
          { delivery: { deliverySequence: 'asc' } },
          { orderNumber: 'asc' },
        ],
        include: {
          customer: {
            select: {
              deliveryAddress: true,
            },
          },
        },
      });

      const deliveries = orders.map((order) => ({
        id: order.id,
        orderId: order.orderNumber,
        customer: order.customerName,
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
        areaTag: order.deliveryAddress.areaTag,
        status: order.status,
        deliverySequence: order.delivery?.deliverySequence || null,
        estimatedArrival: order.delivery?.estimatedArrival || null,
        items: order.items.length,
        totalAmount: order.totalAmount,
        requestedDeliveryDate: order.requestedDeliveryDate,
        deliveryInstructions: order.deliveryAddress.deliveryInstructions,
        deliveredAt: order.delivery?.deliveredAt,
      }));

      return deliveries;
    }),
});
