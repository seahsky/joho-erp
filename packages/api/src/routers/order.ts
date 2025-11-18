import { z } from 'zod';
import { router, protectedProcedure, isAdminOrSales } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import { generateOrderNumber, calculateOrderTotals, paginatePrismaQuery, getEffectivePrice, createMoney, multiplyMoney, toCents } from '@jimmy-beef/shared';

export const orderRouter = router({
  // Create order
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(), // For admin placing on behalf
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().min(1),
          })
        ),
        deliveryAddress: z
          .object({
            street: z.string(),
            suburb: z.string(),
            state: z.string(),
            postcode: z.string(),
            areaTag: z.enum(['north', 'south', 'east', 'west']),
            deliveryInstructions: z.string().optional(),
          })
          .optional(),
        requestedDeliveryDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Determine customer ID
      const targetCustomerId = input.customerId || ctx.userId;

      // Get customer
      const customer = await prisma.customer.findUnique({
        where: { clerkUserId: targetCustomerId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Check credit approval
      if (customer.creditApplication.status !== 'approved') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your credit application is pending approval',
        });
      }

      // Defensive: Validate all items have productId
      const invalidItems = input.items.filter((item) => !item.productId);
      if (invalidItems.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'All order items must have a valid productId',
        });
      }

      // Get products and validate stock
      const productIds = input.items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== input.items.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more products not found',
        });
      }

      // Get customer-specific pricing for all products
      const customerPricings = await prisma.customerPricing.findMany({
        where: {
          customerId: customer.id,
          productId: { in: productIds },
        },
      });

      // Create a map of product ID to custom pricing
      const pricingMap = new Map(customerPricings.map((p) => [p.productId, p]));

      // Build order items with prices (using customer-specific pricing if available)
      const orderItems = input.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          });
        }

        // Check stock
        if (product.currentStock < item.quantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient stock for ${product.name}`,
          });
        }

        // Get effective price (custom or base price) - already in cents
        const customPricing = pricingMap.get(product.id);
        const priceInfo = getEffectivePrice(product.basePrice, customPricing);
        const effectivePrice = priceInfo.effectivePrice; // In cents

        // Calculate item subtotal using dinero.js for precision
        const priceMoney = createMoney(effectivePrice);
        const itemSubtotalMoney = multiplyMoney(priceMoney, item.quantity);
        const itemSubtotal = toCents(itemSubtotalMoney);

        return {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          unit: product.unit,
          quantity: item.quantity,
          unitPrice: effectivePrice, // In cents
          subtotal: itemSubtotal, // In cents
        };
      });

      // Calculate totals (10% GST)
      const totals = calculateOrderTotals(orderItems, 0.1);

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Set delivery date (tomorrow by default)
      const deliveryDate = input.requestedDeliveryDate || new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.businessName,
          items: orderItems,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          deliveryAddress: input.deliveryAddress || customer.deliveryAddress,
          requestedDeliveryDate: deliveryDate,
          status: 'pending',
          statusHistory: [
            {
              status: 'pending',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: 'Order created',
            },
          ],
          orderedAt: new Date(),
          createdBy: ctx.userId,
        },
      });

      // TODO: Reduce inventory
      // TODO: Send order confirmation email
      // TODO: Send notification to admin

      return order;
    }),

  // Get customer's orders
  getMyOrders: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      // Get customer
      const customer = await prisma.customer.findUnique({
        where: { clerkUserId: ctx.userId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const where: any = { customerId: customer.id };

      if (input.status) {
        where.status = input.status;
      }

      if (input.dateFrom || input.dateTo) {
        where.orderedAt = {};
        if (input.dateFrom) where.orderedAt.gte = input.dateFrom;
        if (input.dateTo) where.orderedAt.lte = input.dateTo;
      }

      const result = await paginatePrismaQuery(prisma.order, where, {
        page: input.page,
        limit: input.limit,
        orderBy: { orderedAt: 'desc' },
      });

      return {
        orders: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Get all orders (admin)
  getAll: isAdminOrSales
    .input(
      z.object({
        status: z.string().optional(),
        customerId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        areaTag: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input.status) where.status = input.status;
      if (input.customerId) where.customerId = input.customerId;

      if (input.areaTag) {
        where.deliveryAddress = {
          is: { areaTag: input.areaTag },
        };
      }

      if (input.dateFrom || input.dateTo) {
        where.orderedAt = {};
        if (input.dateFrom) where.orderedAt.gte = input.dateFrom;
        if (input.dateTo) where.orderedAt.lte = input.dateTo;
      }

      const result = await paginatePrismaQuery(prisma.order, where, {
        page: input.page,
        limit: input.limit,
        orderBy: { orderedAt: 'desc' },
      });

      return {
        orders: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Get order by ID
  getById: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input, ctx: _ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // TODO: Check if user has permission to view this order

      return order;
    }),

  // Update order status
  updateStatus: isAdminOrSales
    .input(
      z.object({
        orderId: z.string(),
        newStatus: z.enum([
          'pending',
          'confirmed',
          'packing',
          'ready_for_delivery',
          'out_for_delivery',
          'delivered',
          'cancelled',
        ]),
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
          status: input.newStatus,
          statusHistory: [
            ...currentOrder.statusHistory,
            {
              status: input.newStatus,
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: input.notes,
            },
          ],
        },
      });

      // TODO: Send notification emails based on status
      // TODO: Log to audit trail

      return order;
    }),
});
