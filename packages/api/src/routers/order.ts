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

  // Create order on behalf of customer (Admin only)
  createOnBehalf: isAdminOrSales
    .input(
      z.object({
        customerId: z.string(), // Required - which customer to place order for
        items: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().min(1),
            })
          )
          .min(1, 'At least one item is required'),

        // Address handling
        useCustomAddress: z.boolean().default(false),
        customDeliveryAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string(),
            postcode: z.string(),
            areaTag: z.enum(['north', 'south', 'east', 'west']),
            deliveryInstructions: z.string().optional(),
          })
          .optional(),

        // Bypass options
        bypassCreditLimit: z.boolean().default(false),
        bypassCreditReason: z.string().optional(),
        bypassCutoffTime: z.boolean().default(false),

        // Notes
        adminNotes: z.string().optional(),
        internalNotes: z.string().optional(),

        // Optional delivery date
        requestedDeliveryDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // 2. Validate bypass reason if credit limit is bypassed
      if (input.bypassCreditLimit && !input.bypassCreditReason) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Bypass reason is required when bypassing credit limit',
        });
      }

      // 3. Validate custom address if using custom address
      if (input.useCustomAddress && !input.customDeliveryAddress) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Custom delivery address is required when useCustomAddress is true',
        });
      }

      // 4. Validate products and check stock
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

      // 5. Get customer-specific pricing
      const customerPricings = await prisma.customerPricing.findMany({
        where: {
          customerId: customer.id,
          productId: { in: productIds },
        },
      });

      const pricingMap = new Map(customerPricings.map((p) => [p.productId, p]));

      // 6. Build order items with prices
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

        // Get effective price
        const customPricing = pricingMap.get(product.id);
        const priceInfo = getEffectivePrice(product.basePrice, customPricing);
        const effectivePrice = priceInfo.effectivePrice; // In cents

        // Calculate item subtotal
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

      // 7. Calculate totals
      const totals = calculateOrderTotals(orderItems, 0.1);

      // 8. Check credit limit (unless bypassed)
      if (!input.bypassCreditLimit) {
        const creditLimit = customer.creditApplication.creditLimit; // In cents
        if (totals.totalAmount > creditLimit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Order total ($${(totals.totalAmount / 100).toFixed(2)}) exceeds customer credit limit ($${(creditLimit / 100).toFixed(2)})`,
          });
        }
      }

      // 9. Generate order number
      const orderNumber = generateOrderNumber();

      // 10. Determine delivery date
      let deliveryDate = input.requestedDeliveryDate;

      if (!deliveryDate) {
        // Default to tomorrow (cutoff bypass doesn't matter if no specific date requested)
        deliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // 11. Determine delivery address
      const deliveryAddress =
        input.useCustomAddress && input.customDeliveryAddress
          ? {
              street: input.customDeliveryAddress.street,
              suburb: input.customDeliveryAddress.suburb,
              state: input.customDeliveryAddress.state,
              postcode: input.customDeliveryAddress.postcode,
              country: 'Australia',
              areaTag: input.customDeliveryAddress.areaTag,
              deliveryInstructions: input.customDeliveryAddress.deliveryInstructions,
            }
          : customer.deliveryAddress;

      // 12. Create order
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.businessName,
          items: orderItems,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          deliveryAddress,
          requestedDeliveryDate: deliveryDate,
          status: 'confirmed', // Admin orders auto-confirm
          statusHistory: [
            {
              status: 'confirmed',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: 'Order placed by admin on behalf of customer',
            },
          ],
          orderedAt: new Date(),
          createdBy: ctx.userId,

          // Admin-specific fields
          bypassCreditLimit: input.bypassCreditLimit,
          bypassCreditReason: input.bypassCreditReason,
          bypassCutoffTime: input.bypassCutoffTime,
          useCustomAddress: input.useCustomAddress,
          customDeliveryAddress: input.useCustomAddress && input.customDeliveryAddress ? {
            street: input.customDeliveryAddress.street,
            suburb: input.customDeliveryAddress.suburb,
            state: input.customDeliveryAddress.state,
            postcode: input.customDeliveryAddress.postcode,
            country: 'Australia',
            areaTag: input.customDeliveryAddress.areaTag,
            deliveryInstructions: input.customDeliveryAddress.deliveryInstructions,
          } : undefined,
          adminNotes: input.adminNotes,
          internalNotes: input.internalNotes,
          placedOnBehalfOf: customer.id,
          placedByAdmin: ctx.userId,
        },
      });

      // TODO: Send order confirmation email to customer
      // TODO: Reduce inventory
      // TODO: Log to audit trail

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
    .query(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Role-based data isolation: customers can only view their own orders
      if (ctx.userRole === 'customer') {
        // Get customer to verify ownership
        const customer = await prisma.customer.findUnique({
          where: { clerkUserId: ctx.userId },
        });

        if (!customer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Customer not found',
          });
        }

        // Verify the order belongs to the authenticated customer
        if (order.customerId !== customer.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to access this resource',
          });
        }
      }
      // Admin, Sales, and Manager roles can view all orders (no additional check needed)

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

  // Reorder - Create new order from existing order
  reorder: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Fetch the original order with all items
      const originalOrder = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!originalOrder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Get customer to verify ownership
      const customer = await prisma.customer.findUnique({
        where: { clerkUserId: ctx.userId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Verify the order belongs to the authenticated customer
      if (originalOrder.customerId !== customer.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to reorder this order',
        });
      }

      // Check credit approval
      if (customer.creditApplication.status !== 'approved') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your credit application is pending approval',
        });
      }

      // Extract product IDs and quantities from original order items
      const orderItems = originalOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      // Get products and validate they still exist and are available
      const productIds = orderItems.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== orderItems.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more products from the original order are no longer available',
        });
      }

      // Get current customer-specific pricing for all products
      const customerPricings = await prisma.customerPricing.findMany({
        where: {
          customerId: customer.id,
          productId: { in: productIds },
        },
      });

      // Create a map of product ID to custom pricing
      const pricingMap = new Map(customerPricings.map((p) => [p.productId, p]));

      // Build new order items with CURRENT pricing and stock validation
      const newOrderItems = orderItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          });
        }

        // Check stock availability
        if (product.currentStock < item.quantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`,
          });
        }

        // Get effective price using CURRENT pricing (not historical)
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
          unitPrice: effectivePrice, // In cents - CURRENT price
          subtotal: itemSubtotal, // In cents
        };
      });

      // Calculate totals with current GST rate (10%)
      const totals = calculateOrderTotals(newOrderItems, 0.1);

      // Validate credit limit
      const creditLimit = customer.creditApplication.creditLimit; // In cents
      if (totals.totalAmount > creditLimit) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Order total exceeds your credit limit. Credit limit: ${creditLimit / 100}, Order total: ${totals.totalAmount / 100}`,
        });
      }

      // Generate new order number
      const orderNumber = generateOrderNumber();

      // Set delivery date (tomorrow by default)
      const deliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create new order with confirmed status
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.businessName,
          items: newOrderItems,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          deliveryAddress: originalOrder.deliveryAddress, // Use same delivery address
          requestedDeliveryDate: deliveryDate,
          status: 'confirmed',
          statusHistory: [
            {
              status: 'confirmed',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: `Reordered from order ${originalOrder.orderNumber}`,
            },
          ],
          orderedAt: new Date(),
          createdBy: ctx.userId,
        },
      });

      // TODO: Reduce inventory
      // TODO: Send order confirmation email
      // TODO: Send notification to admin

      return newOrder;
    }),
});
