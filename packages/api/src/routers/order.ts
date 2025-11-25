import { z } from 'zod';
import { router, protectedProcedure, isAdminOrSales } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import { generateOrderNumber, calculateOrderTotals, paginatePrismaQuery, getEffectivePrice, createMoney, multiplyMoney, toCents } from '@jimmy-beef/shared';
import {
  sendBackorderSubmittedEmail,
  sendBackorderApprovedEmail,
  sendBackorderRejectedEmail,
  sendBackorderPartialApprovalEmail,
  sendBackorderAdminNotification,
  sendDriverUrgentCancellationEmail,
} from '../services/email';
import { clerkClient } from '@clerk/nextjs/server';

// Helper: Validate stock and calculate shortfall for backorder support
interface StockValidationResult {
  requiresBackorder: boolean;
  stockShortfall: Record<string, { requested: number; available: number; shortfall: number }>;
}

function validateStockWithBackorder(
  items: Array<{ productId: string; quantity: number }>,
  products: Array<{ id: string; name: string; currentStock: number }>
): StockValidationResult {
  const result: StockValidationResult = {
    requiresBackorder: false,
    stockShortfall: {},
  };

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;

    if (product.currentStock < item.quantity) {
      // Stock insufficient - backorder needed
      result.requiresBackorder = true;
      result.stockShortfall[item.productId] = {
        requested: item.quantity,
        available: product.currentStock,
        shortfall: item.quantity - product.currentStock,
      };
    }
  }

  return result;
}

// Helper: Calculate available credit for a customer
// Pending backorders don't count against credit limit (only approved ones do)
export async function calculateAvailableCredit(customerId: string, creditLimit: number): Promise<number> {
  // Get all orders that count against credit limit
  // Exclude: delivered (invoiced), cancelled, and pending_approval backorders
  const outstandingOrders = await prisma.order.findMany({
    where: {
      customerId,
      status: {
        in: ['pending', 'confirmed', 'packing', 'ready_for_delivery'],
      },
      // Exclude pending backorders (they don't count until approved)
      backorderStatus: {
        not: 'pending_approval',
      },
    },
    select: {
      totalAmount: true,
    },
  });

  // Sum outstanding order totals
  const outstandingBalance = outstandingOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  // Calculate available credit
  const availableCredit = creditLimit - outstandingBalance;

  return availableCredit;
}

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

      // Validate stock and check if backorder is needed
      const stockValidation = validateStockWithBackorder(input.items, products);

      // Build order items with prices (using customer-specific pricing if available)
      const orderItems = input.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
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

      // Check credit limit (exclude pending backorders from calculation)
      const creditLimit = customer.creditApplication.creditLimit; // In cents
      const availableCredit = await calculateAvailableCredit(customer.id, creditLimit);

      if (totals.totalAmount > availableCredit) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Order total ($${(totals.totalAmount / 100).toFixed(2)}) exceeds available credit ($${(availableCredit / 100).toFixed(2)}). Please contact sales.`,
        });
      }

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Set delivery date (tomorrow by default)
      const deliveryDate = input.requestedDeliveryDate || new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Determine backorder status
      const backorderStatus = stockValidation.requiresBackorder ? 'pending_approval' : 'none';

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
              notes: stockValidation.requiresBackorder
                ? 'Order created - Requires backorder approval due to insufficient stock'
                : 'Order created',
            },
          ],
          orderedAt: new Date(),
          createdBy: ctx.userId,

          // Backorder fields
          backorderStatus,
          stockShortfall: stockValidation.requiresBackorder
            ? stockValidation.stockShortfall
            : undefined,
        },
      });

      // Send backorder notification emails if required
      if (stockValidation.requiresBackorder) {
        // Prepare stock shortfall data for email
        const stockShortfallArray = Object.entries(stockValidation.stockShortfall).map(
          ([productId, data]) => {
            const product = products.find((p) => p.id === productId);
            return {
              productName: product?.name || 'Unknown Product',
              sku: product?.sku || productId,
              requested: data.requested,
              available: data.available,
              shortfall: data.shortfall,
              unit: product?.unit || 'units',
            };
          }
        );

        // Send notification to customer
        await sendBackorderSubmittedEmail({
          customerEmail: customer.contactPerson.email,
          customerName: customer.businessName,
          orderNumber: order.orderNumber,
          orderDate: order.orderedAt,
          totalAmount: order.totalAmount,
          stockShortfall: stockShortfallArray,
        }).catch((error) => {
          console.error('Failed to send backorder submitted email to customer:', error);
        });

        // Send notification to admin
        await sendBackorderAdminNotification({
          orderNumber: order.orderNumber,
          customerName: customer.businessName,
          totalAmount: order.totalAmount,
          stockShortfall: stockShortfallArray,
        }).catch((error) => {
          console.error('Failed to send backorder admin notification:', error);
        });
      }

      // TODO: Reduce inventory (normal orders only - backorders reserve on approval)
      // TODO: Send order confirmation email (for non-backorder orders)

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

      // 6. Validate stock and check if backorder is needed
      const stockValidation = validateStockWithBackorder(input.items, products);

      // 7. Build order items with prices
      const orderItems = input.items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
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

      // 8. Calculate totals
      const totals = calculateOrderTotals(orderItems, 0.1);

      // 9. Check credit limit (unless bypassed) - exclude pending backorders from calculation
      if (!input.bypassCreditLimit) {
        const creditLimit = customer.creditApplication.creditLimit; // In cents
        const availableCredit = await calculateAvailableCredit(customer.id, creditLimit);

        if (totals.totalAmount > availableCredit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Order total ($${(totals.totalAmount / 100).toFixed(2)}) exceeds available credit ($${(availableCredit / 100).toFixed(2)})`,
          });
        }
      }

      // 10. Generate order number
      const orderNumber = generateOrderNumber();

      // 11. Determine delivery date
      let deliveryDate = input.requestedDeliveryDate;

      if (!deliveryDate) {
        // Default to tomorrow (cutoff bypass doesn't matter if no specific date requested)
        deliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // 12. Determine delivery address
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

      // 13. Determine backorder status
      const backorderStatus = stockValidation.requiresBackorder ? 'pending_approval' : 'none';

      // 14. Create order
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
          status: stockValidation.requiresBackorder ? 'pending' : 'confirmed', // Backorders need approval
          statusHistory: [
            {
              status: stockValidation.requiresBackorder ? 'pending' : 'confirmed',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: stockValidation.requiresBackorder
                ? 'Order placed by admin - Requires backorder approval due to insufficient stock'
                : 'Order placed by admin on behalf of customer',
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

          // Backorder fields
          backorderStatus,
          stockShortfall: stockValidation.requiresBackorder
            ? stockValidation.stockShortfall
            : undefined,
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

      // Check if cancelling an order with assigned driver - requires urgent driver notification
      // This applies when order is ready_for_delivery or delivered statuses and has a driver assigned
      const delivery = currentOrder.delivery as { driverId?: string; driverName?: string } | null;
      const isCancellingWithAssignedDriver =
        input.newStatus === 'cancelled' &&
        delivery?.driverId &&
        (currentOrder.status === 'ready_for_delivery' || currentOrder.status === 'delivered');

      if (isCancellingWithAssignedDriver && delivery?.driverId) {
        try {
          // Fetch driver email from Clerk
          const client = await clerkClient();
          const driverUser = await client.users.getUser(delivery.driverId);
          const driverEmail = driverUser.primaryEmailAddress?.emailAddress;

          if (driverEmail) {
            const deliveryAddr = currentOrder.deliveryAddress as {
              street: string;
              suburb: string;
              state: string;
              postcode: string;
            };
            await sendDriverUrgentCancellationEmail({
              driverEmail,
              driverName: delivery.driverName || 'Driver',
              orderNumber: currentOrder.orderNumber,
              customerName: currentOrder.customerName,
              deliveryAddress: `${deliveryAddr.street}, ${deliveryAddr.suburb} ${deliveryAddr.state} ${deliveryAddr.postcode}`,
              cancellationReason: input.notes || 'No reason provided',
            });
          }
        } catch (error) {
          console.error('Failed to send driver urgent cancellation email:', error);
        }
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

  // Get pending backorders (Admin only)
  getPendingBackorders: isAdminOrSales
    .input(
      z.object({
        customerId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { customerId, dateFrom, dateTo, page, limit } = input;

      // Build where clause
      const where: any = {
        backorderStatus: 'pending_approval',
      };

      if (customerId) {
        where.customerId = customerId;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Get orders with pagination
      const result = await paginatePrismaQuery(
        prisma.order,
        where,
        {
          page,
          limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                businessName: true,
                contactPerson: true,
                creditApplication: true,
              },
            },
          },
        }
      );

      return result;
    }),

  // Approve backorder (Admin only)
  approveBackorder: isAdminOrSales
    .input(
      z.object({
        orderId: z.string(),
        approvedQuantities: z.record(z.number().int().positive()).optional(), // For partial approval
        expectedFulfillment: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, approvedQuantities, expectedFulfillment, notes } = input;

      // Get order with details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Verify order is in pending_approval status
      if (order.backorderStatus !== 'pending_approval') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order is not pending backorder approval',
        });
      }

      // Determine if this is a partial approval
      const isPartialApproval = approvedQuantities && Object.keys(approvedQuantities).length > 0;

      // Save original items for email
      const originalItems = order.items as any[];

      // Update order items if partial approval
      let updatedItems = order.items;
      if (isPartialApproval && approvedQuantities) {
        updatedItems = order.items.map((item: any) => {
          const approvedQty = approvedQuantities[item.productId];
          if (approvedQty !== undefined && approvedQty !== item.quantity) {
            // Recalculate subtotal for approved quantity
            const unitPriceMoney = createMoney(item.unitPrice);
            const newSubtotalMoney = multiplyMoney(unitPriceMoney, approvedQty);
            return {
              ...item,
              quantity: approvedQty,
              subtotal: toCents(newSubtotalMoney),
            };
          }
          return item;
        });

        // Recalculate order totals
        const newTotals = calculateOrderTotals(updatedItems, 0.1);

        // Update order with approved quantities and new totals
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            items: updatedItems,
            subtotal: newTotals.subtotal,
            taxAmount: newTotals.taxAmount,
            totalAmount: newTotals.totalAmount,
            backorderStatus: 'partial_approved',
            approvedQuantities,
            backorderNotes: notes,
            expectedFulfillment,
            reviewedBy: ctx.userId,
            reviewedAt: new Date(),
            status: 'confirmed', // Move to confirmed for packing
            statusHistory: [
              ...order.statusHistory,
              {
                status: 'confirmed',
                changedAt: new Date(),
                changedBy: ctx.userId,
                notes: `Backorder partially approved by admin${notes ? `: ${notes}` : ''}`,
              },
            ],
          },
          include: {
            customer: true,
          },
        });

        // Send partial approval email to customer
        const approvedItemsForEmail = updatedItems.map((item: any) => ({
          productName: item.productName,
          sku: item.sku,
          requestedQuantity: originalItems.find((i: any) => i.productId === item.productId)?.quantity || item.quantity,
          approvedQuantity: item.quantity,
          unit: item.unit,
        }));

        await sendBackorderPartialApprovalEmail({
          customerEmail: updatedOrder.customer.contactPerson.email,
          customerName: updatedOrder.customer.businessName,
          orderNumber: updatedOrder.orderNumber,
          totalAmount: updatedOrder.totalAmount,
          approvedItems: approvedItemsForEmail,
          estimatedFulfillment: expectedFulfillment,
          notes,
        }).catch((error) => {
          console.error('Failed to send backorder partial approval email:', error);
        });

        // Reserve approved stock quantities
        const productIds = updatedItems.map((item: any) => item.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, currentStock: true, name: true },
        });

        // Validate stock availability and prepare transactions
        const inventoryTransactions = updatedItems.map((item: any) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Product not found: ${item.productId}`,
            });
          }

          const previousStock = product.currentStock;
          const newStock = previousStock - item.quantity;

          if (newStock < 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient stock for ${product.name}. Available: ${previousStock}, Approved: ${item.quantity}`,
            });
          }

          return {
            productId: item.productId,
            type: 'sale' as const,
            quantity: -item.quantity,
            previousStock,
            newStock,
            referenceType: 'order',
            referenceId: orderId,
            notes: `Backorder partially approved: ${item.quantity} units reserved for order ${order.orderNumber}`,
            createdBy: ctx.userId,
          };
        });

        // Create inventory transactions and update product stocks in a transaction
        await prisma.$transaction([
          // Create all inventory transactions
          ...inventoryTransactions.map((tx) =>
            prisma.inventoryTransaction.create({ data: tx })
          ),
          // Update all product stocks
          ...inventoryTransactions.map((tx) =>
            prisma.product.update({
              where: { id: tx.productId },
              data: { currentStock: tx.newStock },
            })
          ),
        ]);

        return updatedOrder;
      } else {
        // Full approval - no quantity changes needed
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            backorderStatus: 'approved',
            backorderNotes: notes,
            expectedFulfillment,
            reviewedBy: ctx.userId,
            reviewedAt: new Date(),
            status: 'confirmed', // Move to confirmed for packing
            statusHistory: [
              ...order.statusHistory,
              {
                status: 'confirmed',
                changedAt: new Date(),
                changedBy: ctx.userId,
                notes: `Backorder approved by admin${notes ? `: ${notes}` : ''}`,
              },
            ],
          },
          include: {
            customer: true,
          },
        });

        // Send full approval email to customer
        const approvedItemsForEmail = (order.items as any[]).map((item) => ({
          productName: item.productName,
          sku: item.sku,
          approvedQuantity: item.quantity,
          unit: item.unit,
        }));

        await sendBackorderApprovedEmail({
          customerEmail: updatedOrder.customer.contactPerson.email,
          customerName: updatedOrder.customer.businessName,
          orderNumber: updatedOrder.orderNumber,
          totalAmount: updatedOrder.totalAmount,
          approvedItems: approvedItemsForEmail,
          estimatedFulfillment: expectedFulfillment,
          notes,
        }).catch((error) => {
          console.error('Failed to send backorder approved email:', error);
        });

        // Reserve stock quantities
        const productIds = (order.items as any[]).map((item: any) => item.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, currentStock: true, name: true },
        });

        // Validate stock availability and prepare transactions
        const inventoryTransactions = (order.items as any[]).map((item: any) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Product not found: ${item.productId}`,
            });
          }

          const previousStock = product.currentStock;
          const newStock = previousStock - item.quantity;

          if (newStock < 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient stock for ${product.name}. Available: ${previousStock}, Approved: ${item.quantity}`,
            });
          }

          return {
            productId: item.productId,
            type: 'sale' as const,
            quantity: -item.quantity,
            previousStock,
            newStock,
            referenceType: 'order',
            referenceId: orderId,
            notes: `Backorder fully approved: ${item.quantity} units reserved for order ${order.orderNumber}`,
            createdBy: ctx.userId,
          };
        });

        // Create inventory transactions and update product stocks in a transaction
        await prisma.$transaction([
          // Create all inventory transactions
          ...inventoryTransactions.map((tx) =>
            prisma.inventoryTransaction.create({ data: tx })
          ),
          // Update all product stocks
          ...inventoryTransactions.map((tx) =>
            prisma.product.update({
              where: { id: tx.productId },
              data: { currentStock: tx.newStock },
            })
          ),
        ]);

        return updatedOrder;
      }
    }),

  // Reject backorder (Admin only)
  rejectBackorder: isAdminOrSales
    .input(
      z.object({
        orderId: z.string(),
        reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, reason } = input;

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Verify order is in pending_approval status
      if (order.backorderStatus !== 'pending_approval') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order is not pending backorder approval',
        });
      }

      // Update order to rejected and cancelled
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          backorderStatus: 'rejected',
          backorderNotes: reason,
          reviewedBy: ctx.userId,
          reviewedAt: new Date(),
          status: 'cancelled',
          statusHistory: [
            ...order.statusHistory,
            {
              status: 'cancelled',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: `Backorder rejected by admin: ${reason}`,
            },
          ],
        },
        include: {
          customer: true,
        },
      });

      // Send rejection email to customer
      const rejectedItemsForEmail = (order.items as any[]).map((item) => ({
        productName: item.productName,
        sku: item.sku,
        requestedQuantity: item.quantity,
        unit: item.unit,
      }));

      await sendBackorderRejectedEmail({
        customerEmail: updatedOrder.customer.contactPerson.email,
        customerName: updatedOrder.customer.businessName,
        orderNumber: updatedOrder.orderNumber,
        reason,
        rejectedItems: rejectedItemsForEmail,
      }).catch((error) => {
        console.error('Failed to send backorder rejected email:', error);
      });

      return updatedOrder;
    }),
});
