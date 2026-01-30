import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';
import {
  getRouteOptimization,
  getDeliveryRouteOptimization,
  checkIfDeliveryRouteNeedsRecalculation,
  optimizeDeliveryOnlyRoute,
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

/**
 * Helper function to check if an order was packed today.
 * Used for same-day delivery validation.
 */
function isPackedToday(packedAt: Date | null | undefined): boolean {
  if (!packedAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const packed = new Date(packedAt);
  return packed >= today && packed < tomorrow;
}

export const deliveryRouter = router({
  // Get all deliveries with filtering and sorting
  getAll: requirePermission('deliveries:view')
    .input(
      z
        .object({
          status: z.enum(['ready_for_delivery', 'delivered']).optional(),
          areaId: z.string().optional(),
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

      if (filters.areaId) {
        where.deliveryAddress = {
          is: { areaId: filters.areaId },
        };
      }

      // Filter by packing date (when the order was packed), not requested delivery date
      // This ensures only orders packed on the selected date appear in the delivery list
      if (filters.dateFrom || filters.dateTo) {
        where.packing = {
          is: {
            packedAt: {},
          },
        };
        if (filters.dateFrom) where.packing.is.packedAt.gte = filters.dateFrom;
        if (filters.dateTo) {
          // Add 1 day to dateTo to include all orders packed on that day
          const endOfDay = new Date(filters.dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          where.packing.is.packedAt.lte = endOfDay;
        }
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
          case 'areaName':
            orderBy = [{ deliveryAddress: { areaName: direction } }];
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
            // Note: packing is an embedded type, automatically included in the order document
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
        latitude: (order.customer?.deliveryAddress as { latitude?: number | null } | undefined)?.latitude ?? null,
        longitude: (order.customer?.deliveryAddress as { longitude?: number | null } | undefined)?.longitude ?? null,
        areaName: order.deliveryAddress.areaName,
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
        deliveredAt: order.delivery?.deliveredAt,
        packedAt: order.packing?.packedAt ?? null, // Add packing date for same-day delivery validation
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
        adminOverride: z.boolean().optional(), // Allow admin to override same-day delivery check
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get user details for audit trail (safe to fetch outside transaction)
      const userDetails = await getUserDetails(ctx.userId);

      // Wrap in transaction with atomic guard
      const result = await prisma.$transaction(async (tx) => {
        // STEP 1: Fetch order first to get current status for audit
        const existingOrder = await tx.order.findUnique({
          where: { id: input.orderId },
        });

        if (!existingOrder) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }

        const previousStatus = existingOrder.status;

        // STEP 2: Check idempotency
        if (existingOrder.status === 'delivered') {
          return { order: existingOrder, alreadyCompleted: true, oldStatus: previousStatus };
        }

        // STEP 3: Atomic guard - use updateMany with status condition
        // Valid transitions to delivered: ready_for_delivery, out_for_delivery
        const updateResult = await tx.order.updateMany({
          where: {
            id: input.orderId,
            status: { in: ['ready_for_delivery', 'out_for_delivery'] },
          },
          data: {
            status: 'delivered',
          },
        });

        if (updateResult.count === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot mark order as delivered. Current status: ${existingOrder.status}`,
          });
        }

        // Same-day delivery validation
        const packedToday = isPackedToday(existingOrder.packing?.packedAt);
        if (!packedToday && !input.adminOverride) {
          // Rollback will happen automatically on throw
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This order was not packed today. Deliveries should occur on the same day as packing.',
          });
        }

        // STEP 4: Update with delivery details and status history
        const order = await tx.order.update({
          where: { id: input.orderId },
          data: {
            delivery: {
              ...existingOrder.delivery,
              deliveredAt: new Date(),
            },
            statusHistory: [
              ...existingOrder.statusHistory,
              {
                status: 'delivered',
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: input.notes || 'Delivery completed',
              },
            ],
          },
        });

        return { order, alreadyCompleted: false, oldStatus: previousStatus };
      });

      // Only trigger side effects if not already completed (idempotent)
      if (!result.alreadyCompleted) {
        // Note: Xero invoice creation is now triggered when order becomes ready_for_delivery
        // (in order.updateStatus) so that invoices can be printed with deliveries

        // Audit log
        await logDeliveryStatusChange(ctx.userId, undefined, ctx.userRole, ctx.userName, input.orderId, {
          orderNumber: result.order.orderNumber,
          oldStatus: result.oldStatus,
          newStatus: 'delivered',
          notes: input.notes,
        }).catch((error) => {
          console.error('Audit log failed for mark delivered:', error);
        });
      }

      return result.order;
    }),

  // Get delivery statistics
  // readyForDelivery now filters by orders packed today (same-day delivery)
  getStats: requirePermission('deliveries:view').query(async () => {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const [readyForDelivery, deliveredToday] = await Promise.all([
      // Only count orders that are ready for delivery AND were packed today
      prisma.order.count({
        where: {
          status: 'ready_for_delivery',
          packing: {
            is: {
              packedAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
        },
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
          // Filter by packing date to match getAll endpoint behavior
          packing: {
            is: {
              packedAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
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
        areaName: order.deliveryAddress.areaName,
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
        areaId: z.string().optional(),
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

      if (input.areaId) {
        where.deliveryAddress = {
          is: { areaId: input.areaId },
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

      // Get area name if areaId is provided
      let areaName: string | null = null;
      if (input.areaId) {
        const area = await prisma.area.findUnique({
          where: { id: input.areaId },
          select: { name: true },
        });
        areaName = area?.name || null;
      }

      if (orders.length === 0) {
        return {
          manifestDate: deliveryDate,
          areaId: input.areaId || null,
          areaName,
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
          ...(input.areaId ? { areaId: input.areaId } : {}),
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
        areaId: input.areaId || null,
        areaName,
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

  /**
   * Download all invoices for a delivery run as a merged PDF
   * Returns invoice URLs for orders that have Xero invoices
   */
  getInvoiceUrlsForDelivery: requirePermission('deliveries:view')
    .input(
      z.object({
        deliveryDate: z.string().datetime(),
        areaId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const deliveryDate = new Date(input.deliveryDate);
      const startOfDay = new Date(deliveryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Build where clause for orders with invoices
      const where: any = {
        requestedDeliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['ready_for_delivery', 'out_for_delivery', 'delivered'],
        },
      };

      if (input.areaId) {
        where.deliveryAddress = {
          is: { areaId: input.areaId },
        };
      }

      // Get orders that have Xero invoices
      const orders = await prisma.order.findMany({
        where,
        orderBy: [
          { delivery: { deliverySequence: 'asc' } },
          { orderNumber: 'asc' },
        ],
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          xero: true,
          delivery: true,
        },
      });

      // Filter orders that have invoices
      const ordersWithInvoices = orders.filter((order) => {
        const xero = order.xero as { invoiceId?: string | null; invoiceNumber?: string | null } | null;
        return xero?.invoiceId;
      });

      // Build invoice data with local PDF proxy URLs
      // No need to call Xero API - the local endpoint handles PDF fetching
      const invoiceData = ordersWithInvoices.map((order) => {
        const xero = order.xero as { invoiceId: string; invoiceNumber?: string | null };
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          invoiceNumber: xero.invoiceNumber || null,
          // Use local PDF proxy endpoint instead of Xero's OnlineInvoice URL
          url: `/api/invoices/${order.id}/pdf`,
          sequence: order.delivery?.deliverySequence || 0,
        };
      });

      // Sort by delivery sequence
      invoiceData.sort((a, b) => a.sequence - b.sequence);

      return {
        totalOrders: orders.length,
        ordersWithInvoices: ordersWithInvoices.length,
        invoices: invoiceData,
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
          { deliveryAddress: { areaName: 'asc' } }, // Group by area
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

      const deliveries = orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        address: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
        deliveryInstructions: order.deliveryAddress.deliveryInstructions,
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
        areaName: order.deliveryAddress.areaName,
        status: order.status,
        deliverySequence: order.delivery?.deliverySequence || null,
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

      // Get user details for audit trail (safe to fetch outside transaction)
      const userDetails = await getUserDetails(ctx.userId);

      // Wrap in transaction with atomic guard
      const result = await prisma.$transaction(async (tx) => {
        // STEP 1: Fetch order inside transaction
        const order = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }

        // STEP 2: Check for idempotency first
        if (order.status === 'out_for_delivery') {
          // Already out for delivery - check if same driver
          if (order.delivery?.driverId === ctx.userId) {
            return { order, alreadyCompleted: true };
          }
          // Different driver already claimed it
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This order has already been claimed by another driver',
          });
        }

        // Validate status
        if (order.status !== 'ready_for_delivery') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot start delivery for order with status '${order.status}'. Order must be 'ready_for_delivery'.`,
          });
        }

        // Validate driver assignment (if order is pre-assigned to a different driver)
        if (order.delivery?.driverId && order.delivery.driverId !== ctx.userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This order is assigned to a different driver',
          });
        }

        // STEP 3: Atomic guard - use updateMany with status condition
        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            status: 'ready_for_delivery', // Atomic guard
          },
          data: {
            status: 'out_for_delivery',
          },
        });

        if (updateResult.count === 0) {
          // Race condition - another driver or process changed the status
          const recheck = await tx.order.findUnique({ where: { id: orderId } });
          if (recheck?.status === 'out_for_delivery') {
            // Check if it was claimed by this driver (unlikely but possible)
            if (recheck.delivery?.driverId === ctx.userId) {
              return { order: recheck, alreadyCompleted: true };
            }
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'This order has already been claimed by another driver',
            });
          }
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Order status was changed by another process. Please refresh and try again.',
          });
        }

        // STEP 4: Update with delivery details and status history
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
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
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: 'Driver started delivery',
              },
            },
          },
        });

        return { order: updatedOrder, alreadyCompleted: false };
      });

      // Only trigger side effects if not already completed (idempotent)
      if (!result.alreadyCompleted) {
        // Fetch customer for email notification
        const customer = await prisma.customer.findUnique({
          where: { id: result.order.customerId },
          select: { contactPerson: true, businessName: true },
        });

        if (customer) {
          // Send notification email to customer
          const deliveryAddr = result.order.deliveryAddress as {
            street: string;
            suburb: string;
            state: string;
            postcode: string;
          };
          await sendOrderOutForDeliveryEmail({
            customerEmail: customer.contactPerson.email,
            customerName: customer.businessName,
            orderNumber: result.order.orderNumber,
            driverName: result.order.delivery?.driverName ?? undefined,
            deliveryAddress: {
              street: deliveryAddr.street,
              suburb: deliveryAddr.suburb,
              state: deliveryAddr.state,
              postcode: deliveryAddr.postcode,
            },
          }).catch((error) => {
            console.error('Failed to send out for delivery email:', error);
          });
        }

        // Audit log
        await logDeliveryStatusChange(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
          orderNumber: result.order.orderNumber,
          oldStatus: 'ready_for_delivery',
          newStatus: 'out_for_delivery',
          driverId: ctx.userId,
          notes: 'Driver started delivery',
        }).catch((error) => {
          console.error('Audit log failed for mark out for delivery:', error);
        });
      }

      return result.order;
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

      // Get user details for audit trail (safe to fetch outside transaction)
      const userDetails = await getUserDetails(ctx.userId);

      // Wrap in transaction with atomic guard
      const result = await prisma.$transaction(async (tx) => {
        // STEP 1: Fetch order with customer inside transaction
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { customer: true },
        });

        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }

        // STEP 2: Check for idempotency first
        if (order.status === 'delivered') {
          return { order, alreadyCompleted: true };
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

        // STEP 3: Atomic guard - use updateMany with status condition
        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            status: 'out_for_delivery', // Atomic guard
          },
          data: {
            status: 'delivered',
          },
        });

        if (updateResult.count === 0) {
          // Race condition - another process changed the status
          const recheck = await tx.order.findUnique({ where: { id: orderId } });
          if (recheck?.status === 'delivered') {
            return { order: { ...order, status: 'delivered' }, alreadyCompleted: true };
          }
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Order status was changed by another process. Please refresh and try again.',
          });
        }

        // STEP 4: Update with delivery details and status history
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
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
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: notes || 'Delivery completed by driver',
              },
            },
          },
          include: { customer: true },
        });

        return { order: updatedOrder, alreadyCompleted: false };
      });

      // Only trigger side effects if not already completed (idempotent)
      if (!result.alreadyCompleted) {
        // Send delivery confirmation email to customer
        await sendOrderDeliveredEmail({
          customerEmail: result.order.customer.contactPerson.email,
          customerName: result.order.customer.businessName,
          orderNumber: result.order.orderNumber,
          deliveredAt: result.order.delivery?.deliveredAt || new Date(),
          totalAmount: result.order.totalAmount,
        }).catch((error) => {
          console.error('Failed to send delivery confirmation email:', error);
        });

        // Enqueue Xero invoice creation
        await enqueueXeroJob('create_invoice', 'order', orderId).catch((error) => {
          console.error('Failed to enqueue Xero invoice creation:', error);
        });

        // Audit log
        await logDeliveryStatusChange(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
          orderNumber: result.order.orderNumber,
          oldStatus: 'out_for_delivery',
          newStatus: 'delivered',
          driverId: ctx.userId,
          notes,
        }).catch((error) => {
          console.error('Audit log failed for complete delivery:', error);
        });
      }

      return result.order;
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

      // Get user details for audit trail (safe to fetch outside transaction)
      const userDetails = await getUserDetails(ctx.userId);

      // Map reason to user-friendly text
      const reasonTexts: Record<string, string> = {
        customer_unavailable: 'Customer unavailable',
        address_not_found: 'Address not found',
        refused_delivery: 'Delivery refused by customer',
        damaged_goods: 'Goods damaged during transit',
        other: notes || 'Other reason',
      };

      // Wrap in transaction with atomic guard
      const result = await prisma.$transaction(async (tx) => {
        // STEP 1: Fetch order with customer inside transaction
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { customer: true },
        });

        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }

        // STEP 2: Check for idempotency - if already returned to warehouse
        if (order.status === 'ready_for_delivery' && order.delivery?.returnReason) {
          return { order, alreadyCompleted: true };
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

        // STEP 3: Atomic guard - use updateMany with status condition
        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            status: 'out_for_delivery', // Atomic guard
          },
          data: {
            status: 'ready_for_delivery',
          },
        });

        if (updateResult.count === 0) {
          // Race condition - check what happened
          const recheck = await tx.order.findUnique({ where: { id: orderId } });
          if (recheck?.status === 'ready_for_delivery' && recheck.delivery?.returnReason) {
            return { order: recheck, alreadyCompleted: true };
          }
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Order status was changed by another process. Please refresh and try again.',
          });
        }

        // STEP 4: Update with return details and status history
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            delivery: {
              ...order.delivery,
              returnReason: reason,
              returnNotes: notes,
              returnedAt: new Date(),
              startedAt: null, // Clear to indicate needs re-attempt
            },
            statusHistory: {
              push: {
                status: 'ready_for_delivery',
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: `Returned to warehouse: ${reasonTexts[reason]}${notes ? ` - ${notes}` : ''}`,
              },
            },
          },
          include: { customer: true },
        });

        return { order: updatedOrder, alreadyCompleted: false };
      });

      // Only trigger side effects if not already completed (idempotent)
      if (!result.alreadyCompleted) {
        // Send notification to admin/warehouse about returned order
        const deliveryAddr = result.order.deliveryAddress as {
          street: string;
          suburb: string;
          state: string;
          postcode: string;
        };
        const delivery = result.order.delivery as { driverName?: string } | null;

        await sendOrderReturnedToWarehouseEmail({
          orderNumber: result.order.orderNumber,
          customerName: result.order.customerName,
          driverName: delivery?.driverName || 'Unknown Driver',
          returnReason: reason,
          returnNotes: notes,
          deliveryAddress: `${deliveryAddr.street}, ${deliveryAddr.suburb} ${deliveryAddr.state} ${deliveryAddr.postcode}`,
        }).catch((error) => {
          console.error('Failed to send order returned to warehouse email:', error);
        });

        // Audit log
        await logReturnToWarehouse(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
          orderNumber: result.order.orderNumber,
          reason,
          driverId: ctx.userId,
        }).catch((error) => {
          console.error('Audit log failed for return to warehouse:', error);
        });
      }

      return {
        success: true,
        message: 'Order returned to warehouse',
        order: result.order,
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

      // Get user details for audit trail (safe outside transaction)
      const userDetails = await getUserDetails(ctx.userId);

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            delivery: true,
            version: true,
          },
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

        const previousDriverId = order.delivery?.driverId;

        // Atomic guard with version check to prevent TOCTOU race
        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            status: { in: ['ready_for_delivery', 'out_for_delivery'] },
            version: order.version,
          },
          data: {
            delivery: {
              ...order.delivery,
              driverId,
              driverName: driverName || order.delivery?.driverName,
              assignedAt: new Date(),
            },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Order was modified concurrently. Please refresh and retry.',
          });
        }

        // Push status history separately (updateMany doesn't support push)
        await tx.order.update({
          where: { id: orderId },
          data: {
            statusHistory: {
              push: {
                status: order.status,
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: `Driver assigned: ${driverName || driverId}`,
              },
            },
          },
        });

        const updatedOrder = await tx.order.findUnique({
          where: { id: orderId },
        });

        return { updatedOrder, previousDriverId, orderNumber: order.orderNumber };
      });

      // Audit log - HIGH: Driver assignment must be tracked
      await logDriverAssignment(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: result.orderNumber,
        driverId,
        driverName: driverName || 'Unknown',
        previousDriverId: result.previousDriverId || undefined,
      }).catch((error) => {
        console.error('Audit log failed for driver assignment:', error);
      });

      return result.updatedOrder;
    }),

  // Get all drivers with their assigned areas
  getDriversWithAreas: requirePermission('deliveries:manage')
    .query(async () => {
      const client = await clerkClient();

      // Fetch all users with driver role
      const usersResponse = await client.users.getUserList({ limit: 100 });
      const drivers = usersResponse.data
        .filter((user) => {
          const metadata = user.publicMetadata as { role?: string };
          return metadata?.role === 'driver';
        })
        .filter((user) => !user.banned)
        .map((user) => ({
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
          email: user.emailAddresses[0]?.emailAddress || '',
        }));

      // Get area assignments for all drivers
      const areaAssignments = await prisma.driverAreaAssignment.findMany({
        where: {
          driverId: { in: drivers.map((d) => d.id) },
          isActive: true,
        },
      });

      const assignmentMap = new Map<string, string[]>();
      for (const assignment of areaAssignments) {
        if (assignment.areaId) {
          const areaIds = assignmentMap.get(assignment.driverId) || [];
          areaIds.push(assignment.areaId);
          assignmentMap.set(assignment.driverId, areaIds);
        }
      }

      return drivers.map((driver) => ({
        ...driver,
        areaIds: assignmentMap.get(driver.id) || [],
      }));
    }),

  // Set driver's assigned area (one-to-one relationship enforced)
  // Each driver can only be assigned to one area, and each area can only have one driver
  setDriverAreas: requirePermission('deliveries:manage')
    .input(
      z.object({
        driverId: z.string(),
        areaIds: z.array(z.string()).max(1), // Maximum one area per driver
      })
    )
    .mutation(async ({ input }) => {
      const { driverId, areaIds } = input;

      // Enforce one-to-one: only one area per driver
      if (areaIds.length > 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Each driver can only be assigned to one area',
        });
      }

      const areaId = areaIds[0] || null;

      // Use Serializable transaction to prevent TOCTOU race condition
      return prisma.$transaction(
        async (tx) => {
          // Check for existing assignment inside transaction
          if (areaId) {
            const existingAssignment = await tx.driverAreaAssignment.findFirst({
              where: {
                areaId,
                driverId: { not: driverId }, // Exclude current driver
                isActive: true,
              },
            });

            if (existingAssignment) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: 'This area is already assigned to another driver',
              });
            }
          }

          // Delete existing assignments for this driver
          await tx.driverAreaAssignment.deleteMany({
            where: { driverId },
          });

          // Create new assignment if an area was selected
          if (areaId) {
            await tx.driverAreaAssignment.create({
              data: {
                driverId,
                areaId,
                isActive: true,
              },
            });
          }

          return { success: true };
        }
      );
    }),

  // Get drivers for assignment dropdown with order counts
  getDriversForAssignment: requirePermission('deliveries:view')
    .input(
      z.object({
        date: z.string().optional(),
        areaId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const client = await clerkClient();

      // Fetch all users with driver role
      const usersResponse = await client.users.getUserList({ limit: 100 });
      const drivers = usersResponse.data
        .filter((user) => {
          const metadata = user.publicMetadata as { role?: string };
          return metadata?.role === 'driver';
        })
        .filter((user) => !user.banned)
        .map((user) => ({
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
          email: user.emailAddresses[0]?.emailAddress || '',
        }));

      // Get area assignments
      const areaAssignments = await prisma.driverAreaAssignment.findMany({
        where: {
          driverId: { in: drivers.map((d) => d.id) },
          isActive: true,
        },
      });

      const assignmentMap = new Map<string, string[]>();
      for (const assignment of areaAssignments) {
        if (assignment.areaId) {
          const areas = assignmentMap.get(assignment.driverId) || [];
          areas.push(assignment.areaId);
          assignmentMap.set(assignment.driverId, areas);
        }
      }

      // Get order counts for today if date provided
      let orderCountMap = new Map<string, number>();
      if (input.date) {
        const targetDate = new Date(input.date);
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const orders = await prisma.order.findMany({
          where: {
            requestedDeliveryDate: { gte: startOfDay, lte: endOfDay },
            status: { in: ['ready_for_delivery', 'out_for_delivery'] },
          },
          select: { delivery: true },
        });

        for (const order of orders) {
          const driverId = order.delivery?.driverId;
          if (driverId) {
            orderCountMap.set(driverId, (orderCountMap.get(driverId) || 0) + 1);
          }
        }
      }

      let filteredDrivers = drivers;
      if (input.areaId) {
        const driversForArea = new Set(
          areaAssignments
            .filter((a) => a.areaId === input.areaId)
            .map((a) => a.driverId)
        );
        filteredDrivers = drivers.filter((d) => driversForArea.has(d.id));
      }

      return filteredDrivers.map((driver) => ({
        ...driver,
        areas: assignmentMap.get(driver.id) || [],
        orderCount: orderCountMap.get(driver.id) || 0,
      }));
    }),

  // Auto-assign drivers by area (round-robin)
  autoAssignDriversByArea: requirePermission('deliveries:manage')
    .input(
      z.object({
        deliveryDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const targetDate = new Date(input.deliveryDate);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Use transaction to ensure atomic bulk assignment
      return prisma.$transaction(
        async (tx) => {
          // Get all ready_for_delivery orders without a driver assigned
          const orders = await tx.order.findMany({
            where: {
              requestedDeliveryDate: { gte: startOfDay, lte: endOfDay },
              status: 'ready_for_delivery',
              OR: [
                { delivery: { is: { driverId: null } } },
                { delivery: { isSet: false } },
              ],
            },
          });

          if (orders.length === 0) {
            return {
              success: true,
              totalAssigned: 0,
              byArea: {},
              message: 'No orders to assign',
            };
          }

          // Group orders by area (using areaId)
          const ordersByArea = new Map<string, typeof orders>();
          for (const order of orders) {
            const areaId = order.deliveryAddress?.areaId;
            if (areaId) {
              const areaOrders = ordersByArea.get(areaId) || [];
              areaOrders.push(order);
              ordersByArea.set(areaId, areaOrders);
            }
          }

          // Get all active driver area assignments
          const areaAssignments = await tx.driverAreaAssignment.findMany({
            where: { isActive: true },
          });

          // Group drivers by area (using areaId)
          const driversByArea = new Map<string, string[]>();
          for (const assignment of areaAssignments) {
            if (assignment.areaId) {
              const drivers = driversByArea.get(assignment.areaId) || [];
              drivers.push(assignment.driverId);
              driversByArea.set(assignment.areaId, drivers);
            }
          }

          // Get driver names from Clerk
          const client = await clerkClient();
          const allDriverIds = [...new Set(areaAssignments.map((a) => a.driverId))];
          const driverNames = new Map<string, string>();

          for (const driverId of allDriverIds) {
            try {
              const user = await client.users.getUser(driverId);
              const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
              driverNames.set(driverId, name);
            } catch {
              driverNames.set(driverId, 'Unknown');
            }
          }

          // Get user details for audit trail
          const userDetails = await getUserDetails(ctx.userId);

          // Assign drivers (round-robin per area)
          const results: { areaId: string; assigned: number; skipped: number }[] = [];
          const driverCounters = new Map<string, number>();

          for (const [areaId, areaOrders] of ordersByArea) {
            const areaDrivers = driversByArea.get(areaId) || [];

            if (areaDrivers.length === 0) {
              results.push({ areaId, assigned: 0, skipped: areaOrders.length });
              continue;
            }

            let counter = driverCounters.get(areaId) || 0;
            let assigned = 0;

            for (const order of areaOrders) {
              const driverId = areaDrivers[counter % areaDrivers.length];
              const driverName = driverNames.get(driverId) || 'Unknown';

              await tx.order.update({
                where: { id: order.id },
                data: {
                  delivery: {
                    ...order.delivery,
                    driverId,
                    driverName,
                    assignedAt: new Date(),
                  },
                  statusHistory: {
                    push: {
                      status: order.status,
                      changedAt: new Date(),
                      changedBy: ctx.userId,
                      changedByName: userDetails.changedByName,
                      changedByEmail: userDetails.changedByEmail,
                      notes: `Driver auto-assigned: ${driverName}`,
                    },
                  },
                },
              });

              counter++;
              assigned++;
            }

            driverCounters.set(areaId, counter);
            results.push({ areaId, assigned, skipped: 0 });
          }

          const byArea = Object.fromEntries(
            results.map((r) => [r.areaId, { assigned: r.assigned, skipped: r.skipped }])
          );

          return {
            success: true,
            totalAssigned: results.reduce((sum, r) => sum + r.assigned, 0),
            byArea,
            message: `Auto-assigned ${results.reduce((sum, r) => sum + r.assigned, 0)} orders`,
          };
        },
        { timeout: 30000 }
      );
    }),

  // Get auto-assignment preview (shows what would be assigned)
  getAutoAssignmentPreview: requirePermission('deliveries:view')
    .input(
      z.object({
        deliveryDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const targetDate = new Date(input.deliveryDate);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Get unassigned orders
      const orders = await prisma.order.findMany({
        where: {
          requestedDeliveryDate: { gte: startOfDay, lte: endOfDay },
          status: 'ready_for_delivery',
          OR: [
            { delivery: { is: { driverId: null } } },
            { delivery: { isSet: false } },
          ],
        },
        select: {
          id: true,
          deliveryAddress: true,
        },
      });

      // Group by area (using areaId)
      const ordersByArea = new Map<string, number>();
      for (const order of orders) {
        const areaId = order.deliveryAddress?.areaId;
        if (areaId) {
          ordersByArea.set(areaId, (ordersByArea.get(areaId) || 0) + 1);
        }
      }

      // Get all active areas
      const areas = await prisma.area.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      // Get driver assignments
      const areaAssignments = await prisma.driverAreaAssignment.findMany({
        where: { isActive: true },
      });

      // Get driver names
      const client = await clerkClient();
      const allDriverIds = [...new Set(areaAssignments.map((a) => a.driverId))];
      const driverInfo = new Map<string, { id: string; name: string }>();

      for (const driverId of allDriverIds) {
        try {
          const user = await client.users.getUser(driverId);
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
          driverInfo.set(driverId, { id: driverId, name });
        } catch {
          driverInfo.set(driverId, { id: driverId, name: 'Unknown' });
        }
      }

      // Build preview by area
      const preview = areas.map((area) => {
        const drivers = areaAssignments
          .filter((a) => a.areaId === area.id)
          .map((a) => driverInfo.get(a.driverId))
          .filter((d): d is { id: string; name: string } => d !== undefined);

        return {
          areaId: area.id,
          areaName: area.name,
          displayName: area.displayName,
          orderCount: ordersByArea.get(area.id) || 0,
          drivers,
          hasDrivers: drivers.length > 0,
        };
      });

      return {
        totalOrders: orders.length,
        preview,
      };
    }),
});
