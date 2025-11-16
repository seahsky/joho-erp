import { z } from 'zod';
import { router, protectedProcedure, isAdminOrSales } from '../trpc';
import { Order, Customer, Product, connectDB } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import { generateOrderNumber, calculateOrderTotals, paginateQuery } from '@jimmy-beef/shared';

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
      await connectDB();

      // Determine customer ID
      const targetCustomerId = input.customerId || ctx.userId;

      // Get customer
      const customer = await Customer.findOne({ clerkUserId: targetCustomerId });
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

      // Get products and validate stock
      const productIds = input.items.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== input.items.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more products not found',
        });
      }

      // Build order items with prices
      const orderItems = input.items.map((item) => {
        const product = products.find((p) => p._id.toString() === item.productId);
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

        return {
          productId: product._id,
          sku: product.sku,
          productName: product.name,
          unit: product.unit,
          quantity: item.quantity,
          unitPrice: product.basePrice, // TODO: Check for customer-specific pricing
          subtotal: item.quantity * product.basePrice,
        };
      });

      // Calculate totals (10% GST)
      const totals = calculateOrderTotals(orderItems, 0.1);

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Set delivery date (tomorrow by default)
      const deliveryDate = input.requestedDeliveryDate || new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create order
      const order = await Order.create({
        orderNumber,
        customerId: customer._id,
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
      await connectDB();

      // Get customer
      const customer = await Customer.findOne({ clerkUserId: ctx.userId });
      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const filter: any = { customerId: customer._id };

      if (input.status) {
        filter.status = input.status;
      }

      if (input.dateFrom || input.dateTo) {
        filter.orderedAt = {};
        if (input.dateFrom) filter.orderedAt.$gte = input.dateFrom;
        if (input.dateTo) filter.orderedAt.$lte = input.dateTo;
      }

      const result = await paginateQuery(Order, filter, {
        page: input.page,
        limit: input.limit,
        sortOptions: { orderedAt: -1 },
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
      await connectDB();

      const filter: any = {};

      if (input.status) filter.status = input.status;
      if (input.customerId) filter.customerId = input.customerId;
      if (input.areaTag) filter['deliveryAddress.areaTag'] = input.areaTag;

      if (input.dateFrom || input.dateTo) {
        filter.orderedAt = {};
        if (input.dateFrom) filter.orderedAt.$gte = input.dateFrom;
        if (input.dateTo) filter.orderedAt.$lte = input.dateTo;
      }

      const result = await paginateQuery(Order, filter, {
        page: input.page,
        limit: input.limit,
        sortOptions: { orderedAt: -1 },
      });

      return {
        orders: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Get order by ID
  getById: protectedProcedure.input(z.object({ orderId: z.string() })).query(async ({ input, ctx: _ctx }) => {
    await connectDB();

    const order = await Order.findById(input.orderId);

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
      await connectDB();

      const order = await Order.findByIdAndUpdate(
        input.orderId,
        {
          $set: { status: input.newStatus },
          $push: {
            statusHistory: {
              status: input.newStatus,
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: input.notes,
            },
          },
        },
        { new: true }
      );

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // TODO: Send notification emails based on status
      // TODO: Log to audit trail

      return order;
    }),
});
