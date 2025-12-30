import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import {
  getRouteOptimization,
  getDeliveryRouteOptimization,
  checkIfDeliveryRouteNeedsRecalculation,
  optimizeDeliveryOnlyRoute,
  calculatePerDriverSequences,
} from '../services/route-optimizer';
import {
  sendOrderOutForDeliveryEmail,
  sendOrderDeliveredEmail,
  sendOrderReturnedToWarehouseEmail,
} from '../services/email';
import { enqueueXeroJob } from '../services/xero-queue';
import { sortInputSchema } from '../schemas';
import {
  logDriverAssignment,
  logDeliveryStatusChange,
  logProofOfDeliveryUpload,
  logReturnToWarehouse,
} from '../services/audit';

export const deliveryRouter = router({
  // Get all deliveries with filtering and sorting
  getAll: requirePermission('deliveries:view')
    .input(
      z
        .object({
          status: z.enum(['ready_for_delivery', 'delivered']).optional(),
          areaTag: z.enum(['north', 'south', 'east', 'west']).optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(50),
        })
        .merge(sortInputSchema)
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, search, ...filters } = input;
      const where: any = {
        status: {
          in: filters.status ? [filters.status] : ['ready_for_delivery', 'delivered'],
        },
      };

      if (filters.areaTag) {
        where.deliveryAddress = {
          is: { areaTag: filters.areaTag },
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.requestedDeliveryDate = {};
        if (filters.dateFrom) where.requestedDeliveryDate.gte = filters.dateFrom;
        if (filters.dateTo) where.requestedDeliveryDate.lte = filters.dateTo;
      }

      // Add search functionality
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      // Build orderBy based on sort parameters
      type OrderByType = Record<string, 'asc' | 'desc' | Record<string, 'asc' | 'desc'>>;
      let orderBy: OrderByType[];

      if (sortBy) {
        const direction = sortOrder || 'asc';
        switch (sortBy) {
          case 'customer':
            orderBy = [{ customerName: direction }];
            break;
          case 'requestedDeliveryDate':
            orderBy = [{ requestedDeliveryDate: direction }];
            break;
          case 'areaTag':
            orderBy = [{ deliveryAddress: { areaTag: direction } }];
            break;
          case 'deliverySequence':
            orderBy = [{ delivery: { deliverySequence: direction } }];
            break;
          case 'status':
            orderBy = [{ status: direction }];
            break;
          default:
            orderBy = [
              { delivery: { deliverySequence: 'asc' } },
              { requestedDeliveryDate: 'asc' },
              { createdAt: 'desc' },
            ];
        }
      } else {
        orderBy = [
          { delivery: { deliverySequence: 'asc' } },
          { requestedDeliveryDate: 'asc' },
          { createdAt: 'desc' },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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
        estimatedTime:
          order.status === 'delivered'
            ? 'Completed'
            : order.delivery?.estimatedArrival
              ? new Date(order.delivery.estimatedArrival).toLocaleTimeString()
              : 'Pending',
        items: order.items.length,
        totalAmount: order.totalAmount,
        requestedDeliveryDate: order.requestedDeliveryDate,
        deliveryInstructions: order.deliveryAddress.deliveryInstructions,
        deliverySequence: order.delivery?.deliverySequence,
        driverId: order.delivery?.driverId ?? null,
        driverName: order.delivery?.driverName ?? null,
        driverDeliverySequence: order.delivery?.driverDeliverySequence ?? null,
        deliveredAt: order.delivery?.deliveredAt,
      }));

      return {
        deliveries,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Mark delivery as completed
  markDelivered: requirePermission('deliveries:manage')
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

      // Audit log - HIGH: Delivery completion must be tracked
      await logDeliveryStatusChange(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
        orderNumber: order.orderNumber,
        oldStatus: currentOrder.status,
        newStatus: 'delivered',
        notes: input.notes,
      }).catch((error) => {
        console.error('Audit log failed for mark delivered:', error);
      });

      return order;
    }),

  // Get delivery statistics
  getStats: requirePermission('deliveries:view').query(async () => {
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
  // Auto-recalculates delivery route when needed (ready_for_delivery orders only)
  getOptimizedRoute: requirePermission('deliveries:view')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
        forceRecalculate: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const deliveryDate = new Date(input.deliveryDate);

      // Fetch company warehouse address for route origin marker
      const company = await prisma.company.findFirst({
        select: { deliverySettings: true },
      });

      const warehouseAddress = company?.deliverySettings?.warehouseAddress;
      const warehouseLocation = (typeof warehouseAddress?.latitude === 'number' && typeof warehouseAddress?.longitude === 'number')
        ? {
            latitude: warehouseAddress.latitude,
            longitude: warehouseAddress.longitude,
            address: `${warehouseAddress.street}, ${warehouseAddress.suburb}`,
          }
        : null;

      // Check if delivery route needs recalculation
      const needsRecalculation = input.forceRecalculate ||
        await checkIfDeliveryRouteNeedsRecalculation(deliveryDate);

      if (needsRecalculation) {
        // Check if there's a packing route first (base requirement)
        const packingRoute = await getRouteOptimization(deliveryDate);

        if (packingRoute) {
          // Recalculate delivery route with only ready orders
          try {
            await optimizeDeliveryOnlyRoute(deliveryDate, ctx.userId || 'system');
          } catch (error) {
            console.error('Failed to recalculate delivery route:', error);
            // Continue with whatever route exists
          }
        }
      }

      // Fetch the delivery route (or fall back to packing route)
      let routeOptimization = await getDeliveryRouteOptimization(deliveryDate, null);

      // If no delivery route, fall back to packing route for display
      if (!routeOptimization) {
        routeOptimization = await getRouteOptimization(deliveryDate);
      }

      if (!routeOptimization) {
        return {
          hasRoute: false,
          route: null,
          warehouseLocation,
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
      // Filter to only include ready_for_delivery orders (not orders still in packing)
      const waypoints = routeOptimization.waypoints
        .filter((wp) => {
          const order = orders.find((o) => o.id === wp.orderId);
          return order; // Only include if order is in ready_for_delivery or delivered
        })
        .map((wp) => {
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
          routeType: (routeOptimization as any).routeType || 'packing',
          totalDistance: routeOptimization.totalDistance,
          totalDuration: routeOptimization.totalDuration,
          orderCount: waypoints.length, // Use filtered count
          routeGeometry: JSON.parse(routeOptimization.routeGeometry),
          waypoints,
          optimizedAt: routeOptimization.optimizedAt,
          optimizedBy: routeOptimization.optimizedBy,
        },
        warehouseLocation,
      };
    }),

  // Get deliveries sorted by sequence
  getDeliveriesWithSequence: requirePermission('deliveries:view')
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

  // Get complete manifest data for PDF generation
  getManifestData: requirePermission('deliveries:view')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
        areaTag: z.enum(['north', 'south', 'east', 'west']).optional(),
      })
    )
    .query(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);
      const startOfDay = new Date(deliveryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Build where clause
      const where: any = {
        requestedDeliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'ready_for_delivery',
      };

      // Filter by area if specified
      if (input.areaTag) {
        where.deliveryAddress = {
          is: { areaTag: input.areaTag },
        };
      }

      // Get all orders with full item details
      const orders = await prisma.order.findMany({
        where,
        orderBy: [
          { delivery: { deliverySequence: 'asc' } },
          { orderNumber: 'asc' },
        ],
        include: {
          customer: {
            select: {
              contactPerson: true,
              deliveryAddress: true,
            },
          },
        },
      });

      if (orders.length === 0) {
        return {
          manifestDate: deliveryDate,
          areaTag: input.areaTag || null,
          warehouseAddress: null,
          routeSummary: {
            totalStops: 0,
            totalDistance: 0,
            totalDuration: 0,
            optimizedAt: null,
          },
          stops: [],
          productAggregation: [],
        };
      }

      // Get route optimization for distance/duration info
      const routeOptimization = await prisma.routeOptimization.findFirst({
        where: {
          deliveryDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          ...(input.areaTag ? { areaTag: input.areaTag } : {}),
        },
        orderBy: {
          optimizedAt: 'desc',
        },
      });

      // Get company settings for warehouse address
      const company = await prisma.company.findFirst();
      const warehouseAddress = company?.deliverySettings?.warehouseAddress || null;

      // Build stops data with full item details
      const stops = orders.map((order, index) => ({
        sequence: order.delivery?.deliverySequence || index + 1,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: {
          name: order.customerName,
          phone: order.customer?.contactPerson?.phone || order.customer?.contactPerson?.mobile || null,
        },
        address: {
          street: order.deliveryAddress.street,
          suburb: order.deliveryAddress.suburb,
          state: order.deliveryAddress.state,
          postcode: order.deliveryAddress.postcode,
          deliveryInstructions: order.deliveryAddress.deliveryInstructions || null,
        },
        items: order.items.map((item) => ({
          sku: item.sku,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPrice,
          subtotalCents: item.subtotal,
        })),
        subtotalCents: order.subtotal,
        taxAmountCents: order.taxAmount,
        totalAmountCents: order.totalAmount,
      }));

      // Aggregate products across all orders
      const productMap = new Map<string, {
        sku: string;
        productName: string;
        unit: string;
        totalQuantity: number;
      }>();

      orders.forEach((order) => {
        order.items.forEach((item) => {
          const existing = productMap.get(item.sku);
          if (existing) {
            existing.totalQuantity += item.quantity;
          } else {
            productMap.set(item.sku, {
              sku: item.sku,
              productName: item.productName,
              unit: item.unit,
              totalQuantity: item.quantity,
            });
          }
        });
      });

      // Convert map to sorted array
      const productAggregation = Array.from(productMap.values()).sort((a, b) =>
        a.sku.localeCompare(b.sku)
      );

      return {
        manifestDate: deliveryDate,
        areaTag: input.areaTag || null,
        warehouseAddress: warehouseAddress
          ? {
              street: warehouseAddress.street,
              suburb: warehouseAddress.suburb,
              state: warehouseAddress.state,
              postcode: warehouseAddress.postcode,
            }
          : null,
        routeSummary: {
          totalStops: orders.length,
          totalDistance: routeOptimization?.totalDistance || 0,
          totalDuration: routeOptimization?.totalDuration || 0,
          optimizedAt: routeOptimization?.optimizedAt || null,
        },
        stops,
        productAggregation,
      };
    }),

  // ============================================================================
  // DRIVER PROCEDURES
  // ============================================================================

  // Get deliveries assigned to the current driver
  getDriverDeliveries: requirePermission('driver:view')
    .input(
      z.object({
        date: z.date().optional(), // Defaults to today
        search: z.string().optional(),
        status: z.enum(['ready_for_delivery', 'out_for_delivery']).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Use provided date or default to today (in Sydney timezone)
      const targetDate = input?.date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Build where clause for orders
      const where: any = {
        requestedDeliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: input?.status
          ? { equals: input.status }
          : { in: ['ready_for_delivery', 'out_for_delivery'] },
        delivery: {
          is: {
            driverId: ctx.userId,
          },
        },
      };

      // Add search functionality
      if (input?.search) {
        where.OR = [
          { orderNumber: { contains: input.search, mode: 'insensitive' } },
          { customerName: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      // Get orders assigned to this driver
      // Use driverDeliverySequence for per-driver contiguous ordering
      const orders = await prisma.order.findMany({
        where,
        orderBy: [
          { delivery: { driverDeliverySequence: 'asc' } },
          { delivery: { deliverySequence: 'asc' } }, // Fallback to global sequence
          { orderNumber: 'asc' },
        ],
        include: {
          customer: {
            select: {
              contactPerson: true,
              deliveryAddress: true,
            },
          },
        },
      });

      const deliveries = orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
        deliveryInstructions: order.deliveryAddress.deliveryInstructions,
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
        areaTag: order.deliveryAddress.areaTag,
        status: order.status,
        // Use per-driver sequence for contiguous ordering (1, 2, 3...) or fall back to global
        deliverySequence: order.delivery?.driverDeliverySequence || order.delivery?.deliverySequence || null,
        globalDeliverySequence: order.delivery?.deliverySequence || null,
        estimatedArrival: order.delivery?.estimatedArrival || null,
        startedAt: order.delivery?.startedAt || null,
        itemCount: order.items.length,
        totalAmount: order.totalAmount,
        hasProofOfDelivery: !!order.delivery?.proofOfDelivery,
        proofOfDeliveryType: order.delivery?.proofOfDelivery?.type || null,
        contactPhone: order.customer?.contactPerson?.phone || null,
      }));

      return {
        date: targetDate,
        deliveries,
        total: deliveries.length,
        outForDelivery: deliveries.filter((d) => d.status === 'out_for_delivery').length,
        readyForDelivery: deliveries.filter((d) => d.status === 'ready_for_delivery').length,
      };
    }),

  // Mark order as out for delivery (driver starts delivery)
  markOutForDelivery: requirePermission('driver:complete')
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;

      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Validate status
      if (order.status !== 'ready_for_delivery') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot start delivery for order with status '${order.status}'. Order must be 'ready_for_delivery'.`,
        });
      }

      // Validate driver assignment
      if (order.delivery?.driverId && order.delivery.driverId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This order is assigned to a different driver',
        });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'out_for_delivery',
          delivery: {
            ...order.delivery,
            driverId: ctx.userId,
            startedAt: new Date(),
          },
          statusHistory: {
            push: {
              status: 'out_for_delivery',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: 'Driver started delivery',
            },
          },
        },
        include: { customer: true },
      });

      // Send notification email to customer
      const deliveryAddr = updatedOrder.deliveryAddress as {
        street: string;
        suburb: string;
        state: string;
        postcode: string;
      };
      await sendOrderOutForDeliveryEmail({
        customerEmail: updatedOrder.customer.contactPerson.email,
        customerName: updatedOrder.customer.businessName,
        orderNumber: updatedOrder.orderNumber,
        driverName: updatedOrder.delivery?.driverName ?? undefined,
        deliveryAddress: {
          street: deliveryAddr.street,
          suburb: deliveryAddr.suburb,
          state: deliveryAddr.state,
          postcode: deliveryAddr.postcode,
        },
      }).catch((error) => {
        console.error('Failed to send out for delivery email:', error);
      });

      // Audit log - HIGH: Out for delivery status change must be tracked
      await logDeliveryStatusChange(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: updatedOrder.orderNumber,
        oldStatus: 'ready_for_delivery',
        newStatus: 'out_for_delivery',
        driverId: ctx.userId,
        notes: 'Driver started delivery',
      }).catch((error) => {
        console.error('Audit log failed for mark out for delivery:', error);
      });

      return updatedOrder;
    }),

  // Upload proof of delivery (photo or signature)
  uploadProofOfDelivery: requirePermission('driver:upload_pod')
    .input(
      z.object({
        orderId: z.string(),
        type: z.enum(['photo', 'signature']),
        fileUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, type, fileUrl } = input;

      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Validate status (must be out_for_delivery)
      if (order.status !== 'out_for_delivery') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot upload POD for order with status '${order.status}'. Order must be 'out_for_delivery'.`,
        });
      }

      // Validate driver assignment
      if (order.delivery?.driverId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This order is assigned to a different driver',
        });
      }

      // Update order with POD
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          delivery: {
            ...order.delivery,
            proofOfDelivery: {
              type,
              fileUrl,
              uploadedAt: new Date(),
            },
          },
        },
      });

      // Audit log - HIGH: POD upload must be tracked
      await logProofOfDeliveryUpload(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        fileUrl,
        uploadType: type,
      }).catch((error) => {
        console.error('Audit log failed for POD upload:', error);
      });

      return {
        success: true,
        message: 'Proof of delivery uploaded successfully',
        proofOfDelivery: updatedOrder.delivery?.proofOfDelivery,
      };
    }),

  // Complete delivery (requires POD)
  completeDelivery: requirePermission('driver:complete')
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, notes } = input;

      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Validate status
      if (order.status !== 'out_for_delivery') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot complete delivery for order with status '${order.status}'. Order must be 'out_for_delivery'.`,
        });
      }

      // Validate driver assignment
      if (order.delivery?.driverId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This order is assigned to a different driver',
        });
      }

      // Validate POD exists
      if (!order.delivery?.proofOfDelivery) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Proof of delivery is required before completing delivery. Please upload a photo or signature.',
        });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'delivered',
          delivery: {
            ...order.delivery,
            deliveredAt: new Date(),
            actualArrival: new Date(),
            notes: notes || order.delivery.notes,
          },
          statusHistory: {
            push: {
              status: 'delivered',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: notes || 'Delivery completed by driver',
            },
          },
        },
        include: { customer: true },
      });

      // Send delivery confirmation email to customer
      await sendOrderDeliveredEmail({
        customerEmail: updatedOrder.customer.contactPerson.email,
        customerName: updatedOrder.customer.businessName,
        orderNumber: updatedOrder.orderNumber,
        deliveredAt: updatedOrder.delivery?.deliveredAt || new Date(),
        totalAmount: updatedOrder.totalAmount,
      }).catch((error) => {
        console.error('Failed to send delivery confirmation email:', error);
      });

      // Enqueue Xero invoice creation
      await enqueueXeroJob('create_invoice', 'order', orderId).catch((error) => {
        console.error('Failed to enqueue Xero invoice creation:', error);
      });

      // Audit log - HIGH: Delivery completion must be tracked
      await logDeliveryStatusChange(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        oldStatus: 'out_for_delivery',
        newStatus: 'delivered',
        driverId: ctx.userId,
        notes,
      }).catch((error) => {
        console.error('Audit log failed for complete delivery:', error);
      });

      return updatedOrder;
    }),

  // Return order to warehouse
  returnToWarehouse: requirePermission('driver:complete')
    .input(
      z.object({
        orderId: z.string(),
        reason: z.enum([
          'customer_unavailable',
          'address_not_found',
          'refused_delivery',
          'damaged_goods',
          'other',
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, reason, notes } = input;

      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Validate status
      if (order.status !== 'out_for_delivery') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot return order with status '${order.status}'. Order must be 'out_for_delivery'.`,
        });
      }

      // Validate driver assignment
      if (order.delivery?.driverId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This order is assigned to a different driver',
        });
      }

      // Map reason to user-friendly text
      const reasonTexts: Record<string, string> = {
        customer_unavailable: 'Customer unavailable',
        address_not_found: 'Address not found',
        refused_delivery: 'Delivery refused by customer',
        damaged_goods: 'Goods damaged during transit',
        other: notes || 'Other reason',
      };

      // Update order status back to ready_for_delivery
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'ready_for_delivery',
          delivery: {
            ...order.delivery,
            returnReason: reason,
            returnNotes: notes,
            returnedAt: new Date(),
            // Clear the startedAt to indicate it needs to be re-attempted
            startedAt: null,
          },
          statusHistory: {
            push: {
              status: 'ready_for_delivery',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: `Returned to warehouse: ${reasonTexts[reason]}${notes ? ` - ${notes}` : ''}`,
            },
          },
        },
        include: { customer: true },
      });

      // Send notification to admin/warehouse about returned order
      const deliveryAddr = updatedOrder.deliveryAddress as {
        street: string;
        suburb: string;
        state: string;
        postcode: string;
      };
      const delivery = updatedOrder.delivery as { driverName?: string } | null;

      await sendOrderReturnedToWarehouseEmail({
        orderNumber: updatedOrder.orderNumber,
        customerName: updatedOrder.customerName,
        driverName: delivery?.driverName || 'Unknown Driver',
        returnReason: reason,
        returnNotes: notes,
        deliveryAddress: `${deliveryAddr.street}, ${deliveryAddr.suburb} ${deliveryAddr.state} ${deliveryAddr.postcode}`,
      }).catch((error) => {
        console.error('Failed to send order returned to warehouse email:', error);
      });

      // Audit log - HIGH: Return to warehouse must be tracked
      await logReturnToWarehouse(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        reason,
        driverId: ctx.userId,
      }).catch((error) => {
        console.error('Audit log failed for return to warehouse:', error);
      });

      return {
        success: true,
        message: 'Order returned to warehouse',
        order: updatedOrder,
      };
    }),

  // Assign driver to order (Admin/Sales only)
  assignDriver: requirePermission('deliveries:manage')
    .input(
      z.object({
        orderId: z.string(),
        driverId: z.string(),
        driverName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, driverId, driverName } = input;

      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Validate status
      if (!['ready_for_delivery', 'out_for_delivery'].includes(order.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot assign driver to order with status '${order.status}'.`,
        });
      }

      // Get previous driver for audit
      const previousDriverId = order.delivery?.driverId;

      // Update order with driver assignment
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          delivery: {
            ...order.delivery,
            driverId,
            driverName: driverName || order.delivery?.driverName,
            assignedAt: new Date(),
          },
          statusHistory: {
            push: {
              status: order.status,
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: `Driver assigned: ${driverName || driverId}`,
            },
          },
        },
      });

      // Audit log - HIGH: Driver assignment must be tracked
      await logDriverAssignment(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        driverId,
        driverName: driverName || 'Unknown',
        previousDriverId: previousDriverId || undefined,
      }).catch((error) => {
        console.error('Audit log failed for driver assignment:', error);
      });

      // Recalculate per-driver sequences when driver assignment changes
      await calculatePerDriverSequences(order.requestedDeliveryDate).catch((error) => {
        console.error('Failed to recalculate per-driver sequences:', error);
      });

      return updatedOrder;
    }),

  // Recalculate per-driver sequences for a delivery date
  // Call this when driver assignments change or need to be refreshed
  recalculatePerDriverSequences: requirePermission('deliveries:manage')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
      })
    )
    .mutation(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);

      await calculatePerDriverSequences(deliveryDate);

      return {
        success: true,
        message: 'Per-driver sequences recalculated successfully',
      };
    }),
});
