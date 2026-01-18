// @ts-nocheck
import { z } from 'zod';
import { router, protectedProcedure, requirePermission } from '../trpc';
import { prisma, PrismaClient } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { generateOrderNumber, calculateOrderTotals, paginatePrismaQuery, getEffectivePrice, createMoney, multiplyMoney, toCents, buildPrismaOrderBy, calculateParentConsumption, isSubproduct, calculateAllSubproductStocks } from '@joho-erp/shared';
import { sortInputSchema } from '../schemas';
import {
  sendBackorderSubmittedEmail,
  sendBackorderApprovedEmail,
  sendBackorderRejectedEmail,
  sendBackorderPartialApprovalEmail,
  sendBackorderAdminNotification,
  sendDriverUrgentCancellationEmail,
  sendOrderConfirmationEmail,
  sendOrderConfirmedByAdminEmail,
  sendOrderOutForDeliveryEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendNewOrderNotificationEmail,
} from '../services/email';
import { clerkClient } from '@clerk/nextjs/server';
import {
  getCutoffInfo as getCutoffInfoService,
  validateOrderCutoffTime,
  isValidDeliveryDate,
  getMinDeliveryDate,
} from '../services/order-validation';
import {
  logOrderCreated,
  logOrderStatusChange,
  logOrderCancellation,
  logBackorderApproval,
  logBackorderRejection,
  logOrderConfirmation,
  logReorder,
  logResendConfirmation,
} from '../services/audit';
import { assignPreliminaryPackingSequence } from '../services/route-optimizer';

// Helper: Validate stock and calculate shortfall for backorder support
interface StockValidationResult {
  requiresBackorder: boolean;
  stockShortfall: Record<string, { requested: number; available: number; shortfall: number }>;
}

function validateStockWithBackorder(
  items: Array<{ productId: string; quantity: number }>,
  products: Array<{ id: string; name: string; currentStock: number; parentProductId?: string | null; parentProduct?: { id: string; currentStock: number } | null; estimatedLossPercentage?: number | null }>
): StockValidationResult {
  const result: StockValidationResult = {
    requiresBackorder: false,
    stockShortfall: {},
  };

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;

    // Check if this is a subproduct
    const productIsSubproduct = isSubproduct(product);

    // For subproducts: calculate parent consumption and check parent stock
    // For regular products: check direct stock
    const requiredQuantity = productIsSubproduct
      ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
      : item.quantity;

    // Use currentStock from products array - this is what customers see and is the authoritative stock level
    // Note: currentStock is kept in sync with batch operations via adjustStock, packing, etc.
    const availableStock = productIsSubproduct && product.parentProduct
      ? product.parentProduct.currentStock
      : product.currentStock;

    if (availableStock < requiredQuantity) {
      // Stock insufficient - backorder needed
      result.requiresBackorder = true;
      result.stockShortfall[item.productId] = {
        requested: item.quantity,
        available: productIsSubproduct
          ? Math.floor(availableStock * (1 - (product.estimatedLossPercentage ?? 0) / 100)) // Convert back to subproduct terms
          : availableStock,
        shortfall: item.quantity - (productIsSubproduct
          ? Math.floor(availableStock * (1 - (product.estimatedLossPercentage ?? 0) / 100))
          : availableStock),
      };
    }
  }

  return result;
}

// Helper: Update parent stock and recalculate all subproduct stocks
async function updateParentAndSubproductStocks(
  parentId: string,
  newParentStock: number,
  tx: any
): Promise<void> {
  // Update parent stock
  await tx.product.update({
    where: { id: parentId },
    data: { currentStock: newParentStock },
  });

  // Find all subproducts of this parent
  const subproducts = await tx.product.findMany({
    where: { parentProductId: parentId },
    select: { id: true, parentProductId: true, estimatedLossPercentage: true },
  });

  if (subproducts.length === 0) return;

  // Calculate new stocks for all subproducts
  const updatedStocks = calculateAllSubproductStocks(newParentStock, subproducts);

  // Update each subproduct's stock
  for (const { id, newStock } of updatedStocks) {
    await tx.product.update({
      where: { id },
      data: { currentStock: newStock },
    });
  }
}

// Helper: Get user display name and email from Clerk
interface UserDetails {
  changedByName: string | null;
  changedByEmail: string | null;
}

async function getUserDetails(userId: string): Promise<UserDetails> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const changedByName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : null;
    const changedByEmail = user.emailAddresses[0]?.emailAddress || null;
    return { changedByName, changedByEmail };
  } catch (error) {
    console.error('Failed to fetch user details:', error);
    return { changedByName: null, changedByEmail: null };
  }
}

// Helper: Calculate available credit for a customer
// Pending backorders don't count against credit limit (only approved ones do)
export async function calculateAvailableCredit(customerId: string, creditLimit: number): Promise<number> {
  // Get all orders that count against credit limit
  // Exclude: delivered (invoiced), cancelled, and pending_approval backorders
  const outstandingOrders = await prisma.order.findMany({
    where: {
      customerId,
      // Exclude awaiting_approval (pending backorders) - they don't count until approved
      status: {
        in: ['confirmed', 'packing', 'ready_for_delivery', 'out_for_delivery'],
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

// Helper: Get outstanding balance for a customer
export async function getOutstandingBalance(customerId: string): Promise<number> {
  const outstandingOrders = await prisma.order.findMany({
    where: {
      customerId,
      // Exclude awaiting_approval (pending backorders) - they don't count until approved
      status: {
        in: ['confirmed', 'packing', 'ready_for_delivery', 'out_for_delivery'],
      },
    },
    select: {
      totalAmount: true,
    },
  });

  return outstandingOrders.reduce((sum, order) => sum + order.totalAmount, 0);
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
            areaId: z.string().optional(),
            deliveryInstructions: z.string().optional(),
          })
          .optional(),
        requestedDeliveryDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get customer based on how the ID was provided
      let customer;

      if (input.customerId) {
        // Admin provided a customerId - could be MongoDB ObjectID or Clerk user ID
        // First try as MongoDB ObjectID, then as Clerk user ID
        if (input.customerId.startsWith('user_')) {
          // It's a Clerk user ID
          customer = await prisma.customer.findUnique({
            where: { clerkUserId: input.customerId },
          });
        } else if (/^[a-fA-F0-9]{24}$/.test(input.customerId)) {
          // It's a valid MongoDB ObjectID format
          customer = await prisma.customer.findUnique({
            where: { id: input.customerId },
          });
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid customer ID format',
          });
        }
      } else {
        // Customer placing their own order - ctx.userId is their Clerk user ID
        customer = await prisma.customer.findUnique({
          where: { clerkUserId: ctx.userId },
        });
      }

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Check if customer is suspended
      if (customer.status === 'suspended') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your account is suspended. Please contact support for assistance.',
        });
      }

      // Check if onboarding is complete
      if (!customer.onboardingComplete) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please complete your registration before placing orders.',
        });
      }

      // Check credit approval
      if (customer.creditApplication.status !== 'approved') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your credit application is pending approval. You can browse products and add to cart, but orders cannot be placed until your credit is approved.',
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

      // Get products and validate stock (include parent product for subproducts)
      const productIds = input.items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { parentProduct: true },
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
          applyGst: product.applyGst,
          gstRate: product.gstRate,
        };
      });

      // Calculate totals using per-product GST settings
      const totals = calculateOrderTotals(orderItems);

      // Check credit limit (exclude pending backorders from calculation)
      const creditLimit = customer.creditApplication.creditLimit; // In cents
      const availableCredit = await calculateAvailableCredit(customer.id, creditLimit);

      if (totals.totalAmount > availableCredit) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Order total ($${(totals.totalAmount / 100).toFixed(2)}) exceeds available credit ($${(availableCredit / 100).toFixed(2)}). Please contact sales.`,
        });
      }

      // Check minimum order amount (if configured)
      const company = await prisma.company.findFirst({
        select: { deliverySettings: true },
      });
      const minimumOrderAmount = company?.deliverySettings?.minimumOrderAmount;

      if (minimumOrderAmount && totals.totalAmount < minimumOrderAmount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Order total ($${(totals.totalAmount / 100).toFixed(2)}) does not meet the minimum order requirement ($${(minimumOrderAmount / 100).toFixed(2)}). Please add more items to your order.`,
        });
      }

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Get delivery address and area name for validation
      const deliveryAddress = input.deliveryAddress || customer.deliveryAddress;
      // areaName may not be in input.deliveryAddress, so use customer's if not provided
      const areaName = 'areaName' in deliveryAddress
        ? (deliveryAddress.areaName ?? undefined)
        : (customer.deliveryAddress.areaName ?? undefined);

      // Set delivery date (defaults to next available date)
      const minDeliveryDate = await getMinDeliveryDate(areaName);
      const deliveryDate = input.requestedDeliveryDate || minDeliveryDate;

      // Check if delivery date is Sunday
      if (deliveryDate.getDay() === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Sunday deliveries are not available. Please select a weekday (Monday-Saturday).',
        });
      }

      // Validate delivery date is not in the past and is at or after minimum date
      const isValidDate = await isValidDeliveryDate(deliveryDate, areaName);
      if (!isValidDate) {
        const minDateStr = minDeliveryDate.toLocaleDateString('en-AU');
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `The requested delivery date is not available. The earliest available delivery date is ${minDateStr}. Please select a valid date.`,
        });
      }

      // Validate cutoff time for next-day delivery
      const cutoffValidation = await validateOrderCutoffTime(deliveryDate, areaName);
      if (cutoffValidation.isAfterCutoff) {
        // Cutoff has passed for the requested delivery date
        const nextDateStr = cutoffValidation.nextAvailableDeliveryDate.toLocaleDateString('en-AU');
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Order cutoff time (${cutoffValidation.cutoffTime}) has passed for the requested delivery date. The next available delivery date is ${nextDateStr}. Please select a later delivery date or contact us for assistance.`,
        });
      }

      // Create order with stock reservation in a transaction
      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // For normal orders: Reduce stock immediately
      // For backorders: Stock is NOT reduced (only when approved)
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
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
            status: stockValidation.requiresBackorder ? 'awaiting_approval' : 'confirmed',
            statusHistory: [
              {
                status: stockValidation.requiresBackorder ? 'awaiting_approval' : 'confirmed',
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: stockValidation.requiresBackorder
                  ? 'Order created - Awaiting approval due to insufficient stock'
                  : 'Order created and confirmed',
              },
            ],
            orderedAt: new Date(),
            createdBy: ctx.userId,

            // Backorder fields (stockShortfall presence indicates backorder)
            stockShortfall: stockValidation.requiresBackorder
              ? stockValidation.stockShortfall
              : undefined,
          },
        });

        // Stock is NOT reduced at order creation
        // Stock reduction happens at packing step (markOrderReady) to allow for quantity adjustments

        return newOrder;
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

      // Send order confirmation email (for non-backorder orders)
      if (!stockValidation.requiresBackorder) {
        await sendOrderConfirmationEmail({
          customerEmail: customer.contactPerson.email,
          customerName: customer.businessName,
          orderNumber: order.orderNumber,
          orderDate: order.orderedAt,
          requestedDeliveryDate: deliveryDate,
          items: orderItems.map((item) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          deliveryAddress: {
            street: deliveryAddress.street,
            suburb: deliveryAddress.suburb,
            state: deliveryAddress.state,
            postcode: deliveryAddress.postcode,
          },
        }).catch((error) => {
          console.error('Failed to send order confirmation email:', error);
        });
      }

      // Log order creation to audit trail
      await logOrderCreated(
        ctx.userId,
        order.id,
        order.orderNumber,
        customer.id,
        order.totalAmount
      ).catch((error) => {
        console.error('Failed to log order creation:', error);
      });

      return order;
    }),

  // Create order on behalf of customer (Admin only)
  createOnBehalf: requirePermission('orders:create')
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
            areaId: z.string().optional(),
            deliveryInstructions: z.string().optional(),
          })
          .optional(),

        // Bypass options
        bypassCreditLimit: z.boolean().default(false),
        bypassCreditReason: z.string().optional(),
        bypassCutoffTime: z.boolean().default(false),
        bypassMinimumOrder: z.boolean().default(false),

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

      // 4. Validate products and check stock (include parent product for subproducts)
      const productIds = input.items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { parentProduct: true },
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
          applyGst: product.applyGst,
          gstRate: product.gstRate,
        };
      });

      // 8. Calculate totals using per-product GST settings
      const totals = calculateOrderTotals(orderItems);

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

      // 10. Check minimum order amount (unless bypassed)
      if (!input.bypassMinimumOrder) {
        const company = await prisma.company.findFirst({
          select: { deliverySettings: true },
        });
        const minimumOrderAmount = company?.deliverySettings?.minimumOrderAmount;

        if (minimumOrderAmount && totals.totalAmount < minimumOrderAmount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Order total ($${(totals.totalAmount / 100).toFixed(2)}) does not meet the minimum order requirement ($${(minimumOrderAmount / 100).toFixed(2)})`,
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
              areaId: input.customDeliveryAddress.areaId,
              deliveryInstructions: input.customDeliveryAddress.deliveryInstructions,
            }
          : customer.deliveryAddress;

      // 13. Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // 15. Create order with stock reservation in a transaction
      // For normal orders: Reduce stock immediately
      // For backorders: Stock is NOT reduced (only when approved)
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
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
            status: stockValidation.requiresBackorder ? 'awaiting_approval' : 'confirmed',
            statusHistory: [
              {
                status: stockValidation.requiresBackorder ? 'awaiting_approval' : 'confirmed',
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: stockValidation.requiresBackorder
                  ? 'Order placed by admin - Awaiting approval due to insufficient stock'
                  : 'Order placed by admin on behalf of customer',
              },
            ],
            orderedAt: new Date(),
            createdBy: ctx.userId,

            // Admin-specific fields
            bypassCreditLimit: input.bypassCreditLimit,
            bypassCreditReason: input.bypassCreditReason,
            bypassCutoffTime: input.bypassCutoffTime,
            bypassMinimumOrder: input.bypassMinimumOrder,
            useCustomAddress: input.useCustomAddress,
            customDeliveryAddress: input.useCustomAddress && input.customDeliveryAddress ? {
              street: input.customDeliveryAddress.street,
              suburb: input.customDeliveryAddress.suburb,
              state: input.customDeliveryAddress.state,
              postcode: input.customDeliveryAddress.postcode,
              country: 'Australia',
              areaId: input.customDeliveryAddress.areaId,
              deliveryInstructions: input.customDeliveryAddress.deliveryInstructions,
            } : undefined,
            adminNotes: input.adminNotes,
            internalNotes: input.internalNotes,
            placedOnBehalfOf: customer.id,
            placedByAdmin: ctx.userId,

            // Backorder fields (stockShortfall presence indicates backorder)
            stockShortfall: stockValidation.requiresBackorder
              ? stockValidation.stockShortfall
              : undefined,
          },
        });

        // Stock is NOT reduced at order creation
        // Stock reduction happens at packing step (markOrderReady) to allow for quantity adjustments

        return newOrder;
      });

      // Assign preliminary packing sequence for non-backorder orders (confirmed immediately)
      if (!stockValidation.requiresBackorder) {
        await assignPreliminaryPackingSequence(deliveryDate, order.id);
      }

      // Send order confirmation email to customer (for non-backorder orders)
      if (!stockValidation.requiresBackorder) {
        const deliveryAddr = deliveryAddress as {
          street: string;
          suburb: string;
          state: string;
          postcode: string;
        };

        await sendOrderConfirmationEmail({
          customerEmail: customer.contactPerson.email,
          customerName: customer.businessName,
          orderNumber: order.orderNumber,
          orderDate: order.orderedAt,
          requestedDeliveryDate: deliveryDate,
          items: orderItems.map((item) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          deliveryAddress: {
            street: deliveryAddr.street,
            suburb: deliveryAddr.suburb,
            state: deliveryAddr.state,
            postcode: deliveryAddr.postcode,
          },
        }).catch((error) => {
          console.error('Failed to send order confirmation email:', error);
        });
      }

      // Log order creation to audit trail
      await logOrderCreated(
        ctx.userId,
        order.id,
        order.orderNumber,
        customer.id,
        order.totalAmount
      ).catch((error) => {
        console.error('Failed to log order creation:', error);
      });

      return order;
    }),

  // Get customer's orders
  getMyOrders: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        search: z.string().optional(), // Search by order number
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

      // Search by order number (case-insensitive contains)
      if (input.search) {
        where.orderNumber = {
          contains: input.search,
          mode: 'insensitive',
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

  // Get all orders (admin)
  getAll: requirePermission('orders:view')
    .input(
      z
        .object({
          status: z.string().optional(),
          customerId: z.string().optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          areaId: z.string().optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .merge(sortInputSchema)
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, search, ...filters } = input;
      const where: any = {};

      if (filters.status) where.status = filters.status;
      if (filters.customerId) where.customerId = filters.customerId;

      if (filters.areaId) {
        where.deliveryAddress = {
          is: { areaId: filters.areaId },
        };
      }

      if (filters.dateFrom || filters.dateTo) {
        where.orderedAt = {};
        if (filters.dateFrom) where.orderedAt.gte = filters.dateFrom;
        if (filters.dateTo) where.orderedAt.lte = filters.dateTo;
      }

      // Add search functionality
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { businessName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      // Build orderBy from sort parameters
      const orderSortFieldMapping: Record<string, string> = {
        orderNumber: 'orderNumber',
        orderedAt: 'orderedAt',
        totalAmount: 'totalAmount',
        status: 'status',
        customer: 'customer.businessName',
      };

      const orderBy =
        sortBy && orderSortFieldMapping[sortBy]
          ? buildPrismaOrderBy(sortBy, sortOrder, orderSortFieldMapping)
          : { orderedAt: 'desc' as const };

      const result = await paginatePrismaQuery(prisma.order, where, {
        page,
        limit,
        orderBy,
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
  updateStatus: requirePermission('orders:edit')
    .input(
      z.object({
        orderId: z.string(),
        newStatus: z.enum([
          'awaiting_approval',
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

      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

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

      // Handle stock restoration when cancelling
      // Only restore stock if:
      // 1. Order is being cancelled
      // 2. Order had stock reduced (stock is now reduced at packing step - ready_for_delivery or later)
      // Use stockConsumed flag instead of status-based check for stock restoration
      // This is more reliable as stockConsumed is only set after markOrderReady succeeds
      const shouldRestoreStock =
        input.newStatus === 'cancelled' &&
        currentOrder.stockConsumed === true;

      if (shouldRestoreStock) {
        // Restore stock in a transaction
        const order = await prisma.$transaction(async (tx) => {
          const { isSubproduct, calculateParentConsumption, calculateAllSubproductStocks } = await import('@joho-erp/shared');

          // Update order status
          const updatedOrder = await tx.order.update({
            where: { id: input.orderId },
            data: {
              status: input.newStatus,
              statusHistory: [
                ...currentOrder.statusHistory,
                {
                  status: input.newStatus,
                  changedAt: new Date(),
                  changedBy: ctx.userId,
                  changedByName: userDetails.changedByName,
                  changedByEmail: userDetails.changedByEmail,
                  notes: input.notes,
                },
              ],
            },
          });

          // Get products with parent product info for subproduct handling
          const productIds = (currentOrder.items as any[]).map((item: any) => item.productId);
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            include: { parentProduct: true },
          });

          // Create a map for quick lookup
          const productMap = new Map(products.map((p) => [p.id, p]));

          // ============================================================================
          // PHASE 1: Aggregate restoration per parent product
          // This ensures that if an order has multiple subproducts from the same parent,
          // the parent stock is restored ONCE with the TOTAL restoration
          // ============================================================================
          const parentRestorations = new Map<string, {
            totalRestoration: number;
            items: Array<{ product: any; item: any; restoreQuantity: number }>;
          }>();

          const regularProductItems: Array<{
            product: any;
            item: any;
            restoreQuantity: number;
          }> = [];

          // First pass: categorize and aggregate
          for (const item of currentOrder.items as any[]) {
            const product = productMap.get(item.productId);
            if (!product) continue;

            const productIsSubproduct = isSubproduct(product);
            const parentProduct = productIsSubproduct ? product.parentProduct : null;

            const restoreQuantity = productIsSubproduct
              ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
              : item.quantity;

            if (productIsSubproduct && parentProduct) {
              const existing = parentRestorations.get(parentProduct.id) || {
                totalRestoration: 0,
                items: [],
              };
              existing.totalRestoration += restoreQuantity;
              existing.items.push({ product, item, restoreQuantity });
              parentRestorations.set(parentProduct.id, existing);
            } else {
              regularProductItems.push({ product, item, restoreQuantity });
            }
          }

          // ============================================================================
          // PHASE 2: Process parent products with aggregated restoration totals
          // ============================================================================
          for (const [parentId, { totalRestoration, items }] of parentRestorations) {
            const parentProduct = await tx.product.findUnique({ where: { id: parentId } });
            if (!parentProduct) continue;

            const currentStock = parentProduct.currentStock;
            const newStock = currentStock + totalRestoration;

            // Create individual inventory transactions for each subproduct (detailed audit trail)
            for (const { product, item, restoreQuantity } of items) {
              const transactionNotes = `Subproduct stock restored: ${product.name} (${item.quantity}${product.unit}) from cancelled order ${currentOrder.orderNumber}`;

              await tx.inventoryTransaction.create({
                data: {
                  productId: parentId,
                  type: 'return',
                  quantity: restoreQuantity, // Positive for returns
                  previousStock: currentStock,
                  newStock: currentStock + restoreQuantity, // Individual item's view
                  referenceType: 'order',
                  referenceId: input.orderId,
                  notes: transactionNotes,
                  createdBy: ctx.userId,
                },
              });

              // Create batch for each returned subproduct item
              await tx.inventoryBatch.create({
                data: {
                  productId: parentId,
                  quantityRemaining: restoreQuantity,
                  initialQuantity: restoreQuantity,
                  costPerUnit: 0, // Unknown cost for returned stock
                  receivedAt: new Date(),
                  notes: `Stock returned from cancelled order ${currentOrder.orderNumber} (${product.name})`,
                },
              });
            }

            // Update parent stock ONCE with total restoration
            await tx.product.update({
              where: { id: parentId },
              data: { currentStock: newStock },
            });

            // Recalculate all subproduct stocks ONCE
            const subproducts = await tx.product.findMany({
              where: { parentProductId: parentId },
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

          // ============================================================================
          // PHASE 3: Process regular (non-subproduct) products
          // ============================================================================
          for (const { product, item, restoreQuantity } of regularProductItems) {
            // Get current stock FRESH inside transaction
            const freshProduct = await tx.product.findUnique({ where: { id: product.id } });
            if (!freshProduct) continue;

            const currentStock = freshProduct.currentStock;
            const newStock = currentStock + restoreQuantity;

            // Create inventory transaction (return)
            const transactionNotes = `Stock restored from cancelled order ${currentOrder.orderNumber}`;

            await tx.inventoryTransaction.create({
              data: {
                productId: product.id,
                type: 'return',
                quantity: restoreQuantity, // Positive for returns
                previousStock: currentStock,
                newStock,
                referenceType: 'order',
                referenceId: input.orderId,
                notes: transactionNotes,
                createdBy: ctx.userId,
              },
            });

            // Create a new batch for the returned stock
            await tx.inventoryBatch.create({
              data: {
                productId: product.id,
                quantityRemaining: restoreQuantity,
                initialQuantity: restoreQuantity,
                costPerUnit: 0, // Unknown cost for returned stock
                receivedAt: new Date(),
                notes: `Stock returned from cancelled order ${currentOrder.orderNumber}`,
              },
            });

            // Update product stock
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

          return updatedOrder;
        });

        // Send cancellation email to customer
        const customer = await prisma.customer.findUnique({
          where: { id: currentOrder.customerId },
          select: { contactPerson: true, businessName: true },
        });

        if (customer) {
          await sendOrderCancelledEmail({
            customerEmail: customer.contactPerson.email,
            customerName: customer.businessName,
            orderNumber: currentOrder.orderNumber,
            cancellationReason: input.notes || 'No reason provided',
            totalAmount: currentOrder.totalAmount,
          }).catch((error) => {
            console.error('Failed to send order cancelled email:', error);
          });
        }

        // If order has a Xero invoice, create a credit note
        const xeroInfo = currentOrder.xero as { invoiceId?: string | null } | null;
        if (xeroInfo?.invoiceId) {
          const { enqueueXeroJob } = await import('../services/xero-queue');
          await enqueueXeroJob('create_credit_note', 'order', input.orderId).catch((error) => {
            console.error('Failed to enqueue Xero credit note creation:', error);
          });
        }

        // Log cancellation to audit trail
        await logOrderCancellation(
          ctx.userId,
          input.orderId,
          currentOrder.orderNumber,
          input.notes || 'No reason provided',
          currentOrder.status
        ).catch((error) => {
          console.error('Failed to log order cancellation:', error);
        });

        return order;
      }

      // Normal status update (no stock restoration needed)
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
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
              notes: input.notes,
            },
          ],
        },
      });

      // Send notification emails based on status
      const customer = await prisma.customer.findUnique({
        where: { id: currentOrder.customerId },
        select: { contactPerson: true, businessName: true },
      });

      if (customer) {
        // Send appropriate email based on new status
        switch (input.newStatus) {
          case 'cancelled':
            // Send cancellation email for orders not packed yet (no stock to restore)
            await sendOrderCancelledEmail({
              customerEmail: customer.contactPerson.email,
              customerName: customer.businessName,
              orderNumber: currentOrder.orderNumber,
              cancellationReason: input.notes || 'No reason provided',
              totalAmount: currentOrder.totalAmount,
            }).catch((error) => {
              console.error('Failed to send order cancelled email:', error);
            });
            break;

          case 'ready_for_delivery':
            // Send "out for delivery" email when order is ready to go out
            {
              const deliveryAddr = currentOrder.deliveryAddress as {
                street: string;
                suburb: string;
                state: string;
                postcode: string;
              };
              const delivery = currentOrder.delivery as { driverName?: string } | null;

              await sendOrderOutForDeliveryEmail({
                customerEmail: customer.contactPerson.email,
                customerName: customer.businessName,
                orderNumber: currentOrder.orderNumber,
                driverName: delivery?.driverName,
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
            break;

          case 'delivered':
            await sendOrderDeliveredEmail({
              customerEmail: customer.contactPerson.email,
              customerName: customer.businessName,
              orderNumber: currentOrder.orderNumber,
              deliveredAt: new Date(),
              totalAmount: currentOrder.totalAmount,
            }).catch((error) => {
              console.error('Failed to send order delivered email:', error);
            });
            break;
        }
      }

      // Log status change to audit trail
      await logOrderStatusChange(
        ctx.userId,
        input.orderId,
        currentOrder.orderNumber,
        currentOrder.status,
        input.newStatus,
        input.notes,
        userDetails.changedByEmail || undefined,
        userDetails.changedByName,
        undefined // userRole is not available here
      ).catch((error) => {
        console.error('Failed to log order status change:', error);
      });

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

      // Get products and validate they still exist and are available (include parent for subproducts)
      const productIds = orderItems.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { parentProduct: true },
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

      // Build new order items with CURRENT pricing
      const newOrderItems = orderItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          });
        }

        // Stock validation removed - orders with insufficient stock go to pending admin approval

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
          applyGst: product.applyGst,
          gstRate: product.gstRate,
        };
      });

      // Calculate totals using per-product GST settings
      const totals = calculateOrderTotals(newOrderItems);

      // Validate stock and check if backorder is needed
      const stockValidation = validateStockWithBackorder(orderItems, products);
      const orderStatus = stockValidation.requiresBackorder ? 'awaiting_approval' : 'confirmed';

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

      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // Create new order with stock reservation in a transaction
      const newOrder = await prisma.$transaction(async (tx) => {
        // Create the order
        const createdOrder = await tx.order.create({
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
            status: orderStatus,
            statusHistory: [
              {
                status: orderStatus,
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: stockValidation.requiresBackorder
                  ? `Reordered from order ${originalOrder.orderNumber} - Awaiting approval due to insufficient stock`
                  : `Reordered from order ${originalOrder.orderNumber}`,
              },
            ],
            orderedAt: new Date(),
            createdBy: ctx.userId,

            // Backorder fields (stockShortfall presence indicates backorder)
            stockShortfall: stockValidation.requiresBackorder
              ? stockValidation.stockShortfall
              : undefined,
          },
        });

        // Stock reduction is now handled in markOrderReady (packing step)
        // This ensures stock is only consumed when order is actually packed

        return createdOrder;
      });

      // Send appropriate email based on backorder status
      const deliveryAddr = originalOrder.deliveryAddress as {
        street: string;
        suburb: string;
        state: string;
        postcode: string;
      };

      if (stockValidation.requiresBackorder) {
        // Send backorder notification emails
        const stockShortfallArray = Object.entries(stockValidation.stockShortfall).map(
          ([productId, data]) => {
            const product = products.find((p) => p.id === productId);
            return {
              productName: product?.name || 'Unknown Product',
              sku: product?.sku || productId,
              requested: data.requested,
              available: data.available,
              shortfall: data.shortfall,
              unit: product?.unit || 'unit',
            };
          }
        );

        await sendBackorderSubmittedEmail({
          customerEmail: customer.contactPerson.email,
          customerName: customer.businessName,
          orderNumber: newOrder.orderNumber,
          orderDate: newOrder.orderedAt,
          stockShortfall: stockShortfallArray,
          totalAmount: totals.totalAmount,
        }).catch((error) => {
          console.error('Failed to send backorder submitted email:', error);
        });

        // Notify admin of backorder
        await sendBackorderAdminNotification({
          orderNumber: newOrder.orderNumber,
          customerName: customer.businessName,
          stockShortfall: stockShortfallArray,
          totalAmount: totals.totalAmount,
        }).catch((error) => {
          console.error('Failed to send backorder admin notification:', error);
        });
      } else {
        // Send regular order confirmation email
        await sendOrderConfirmationEmail({
          customerEmail: customer.contactPerson.email,
          customerName: customer.businessName,
          orderNumber: newOrder.orderNumber,
          orderDate: newOrder.orderedAt,
          requestedDeliveryDate: deliveryDate,
          items: newOrderItems.map((item) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          deliveryAddress: {
            street: deliveryAddr.street,
            suburb: deliveryAddr.suburb,
            state: deliveryAddr.state,
            postcode: deliveryAddr.postcode,
          },
        }).catch((error) => {
          console.error('Failed to send order confirmation email:', error);
        });
      }

      // Send notification to admin
      sendNewOrderNotificationEmail({
        orderNumber: newOrder.orderNumber,
        customerName: customer.businessName,
        totalAmount: totals.totalAmount,
        itemCount: newOrderItems.length,
        deliveryDate,
        isBackorder: stockValidation.requiresBackorder,
      }).catch((error) => {
        console.error('Failed to send admin notification email:', error);
      });

      // Audit log - MEDIUM: Reorder creation
      await logReorder(ctx.userId, undefined, ctx.userRole, ctx.userName, newOrder.id, {
        originalOrderId: input.orderId,
        originalOrderNumber: originalOrder.orderNumber,
        newOrderNumber: newOrder.orderNumber,
        customerId: customer.id,
      }).catch((error) => {
        console.error('Audit log failed for reorder:', error);
      });

      return newOrder;
    }),

  // Get pending backorders (Admin only)
  getPendingBackorders: requirePermission('orders:approve_backorder')
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

      // Build where clause (pending backorders have awaiting_approval status and stockShortfall)
      const where: any = {
        status: 'awaiting_approval',
        stockShortfall: { not: null },
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
  approveBackorder: requirePermission('orders:approve_backorder')
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

      // Verify order is pending backorder approval (awaiting_approval status with stockShortfall)
      if (order.status !== 'awaiting_approval' || !order.stockShortfall) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order is not pending backorder approval',
        });
      }

      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // Re-check stock availability before approving (stock may have changed since order was placed)
      const { isSubproduct, calculateParentConsumption } = await import('@joho-erp/shared');
      const productIds = (order.items as any[]).map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { parentProduct: true },
      });

      const shortfalls: Record<string, { requested: number; available: number }> = {};

      for (const item of order.items as any[]) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;

        // Check if this is a subproduct (has parent)
        const productIsSubproduct = isSubproduct(product);
        const consumeFrom = productIsSubproduct ? product.parentProduct : product;
        
        if (!consumeFrom) continue;

        // Calculate consumption quantity (for subproducts, account for loss)
        const consumeQty = productIsSubproduct
          ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
          : item.quantity;

        if (consumeFrom.currentStock < consumeQty) {
          shortfalls[item.productId] = { 
            requested: consumeQty, 
            available: consumeFrom.currentStock 
          };
        }
      }

      if (Object.keys(shortfalls).length > 0) {
        const shortfallDetails = Object.entries(shortfalls)
          .map(([productId, { requested, available }]) => {
            const product = products.find((p) => p.id === productId);
            return `${product?.name || productId}: need ${requested}, have ${available}`;
          })
          .join('; ');
        
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient stock for some items. Stock may have changed since order was placed. ${shortfallDetails}`,
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

        // Recalculate order totals using per-product GST settings
        const newTotals = calculateOrderTotals(
          updatedItems.map((item: any) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            applyGst: item.applyGst ?? false,
            gstRate: item.gstRate ?? null,
          }))
        );

        // Update order with approved quantities and new totals
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            items: updatedItems,
            subtotal: newTotals.subtotal,
            taxAmount: newTotals.taxAmount,
            totalAmount: newTotals.totalAmount,
            approvedQuantities,  // This field indicates partial approval
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
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
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

        // Stock is NOT reduced at backorder approval
        // Stock reduction happens at packing step (markOrderReady) to allow for quantity adjustments

        // Log partial backorder approval to audit trail
        await logBackorderApproval(
          ctx.userId,
          orderId,
          updatedOrder.orderNumber,
          'partial',
          approvedQuantities
        ).catch((error) => {
          console.error('Failed to log backorder partial approval:', error);
        });

        // Assign preliminary packing sequence for confirmed backorder
        await assignPreliminaryPackingSequence(
          updatedOrder.requestedDeliveryDate,
          updatedOrder.id
        );

        return updatedOrder;
      } else {
        // Full approval - no quantity changes needed
        // Note: backorder approval is inferred from stockShortfall being set + status moving to confirmed
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
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
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
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

        // Stock is NOT reduced at backorder approval
        // Stock reduction happens at packing step (markOrderReady) to allow for quantity adjustments

        // Log full backorder approval to audit trail
        await logBackorderApproval(
          ctx.userId,
          orderId,
          updatedOrder.orderNumber,
          'full',
          undefined
        ).catch((error) => {
          console.error('Failed to log backorder full approval:', error);
        });

        // Assign preliminary packing sequence for confirmed backorder
        await assignPreliminaryPackingSequence(
          updatedOrder.requestedDeliveryDate,
          updatedOrder.id
        );

        return updatedOrder;
      }
    }),

  // Reject backorder (Admin only)
  rejectBackorder: requirePermission('orders:approve_backorder')
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

      // Verify order is pending backorder approval (awaiting_approval status with stockShortfall)
      if (order.status !== 'awaiting_approval' || !order.stockShortfall) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order is not pending backorder approval',
        });
      }

      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // Update order to rejected and cancelled
      // Note: rejection is inferred from stockShortfall being set + status being cancelled
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
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
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
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

      // Log backorder rejection to audit trail
      await logBackorderRejection(
        ctx.userId,
        orderId,
        updatedOrder.orderNumber,
        reason
      ).catch((error) => {
        console.error('Failed to log backorder rejection:', error);
      });

      return updatedOrder;
    }),

  // ============================================================================
  // CUTOFF TIME & CREDIT INFO QUERIES
  // ============================================================================

  // Get cutoff time information for the UI
  getCutoffInfo: protectedProcedure
    .input(
      z.object({
        areaName: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const cutoffInfo = await getCutoffInfoService(input?.areaName);
      return cutoffInfo;
    }),

  // Get available credit information for a customer
  getAvailableCreditInfo: protectedProcedure.query(async ({ ctx }) => {
    // Get customer by clerkUserId
    const customer = await prisma.customer.findUnique({
      where: { clerkUserId: ctx.userId },
      select: {
        id: true,
        creditApplication: true,
      },
    });

    if (!customer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }

    const creditLimit = customer.creditApplication.creditLimit;
    const outstandingBalance = await getOutstandingBalance(customer.id);
    const availableCredit = creditLimit - outstandingBalance;

    return {
      creditLimit, // In cents
      outstandingBalance, // In cents
      availableCredit, // In cents
      currency: 'AUD',
    };
  }),

  // Get credit information for a specific customer (Admin only - for order on behalf)
  getCustomerCreditInfoForAdmin: requirePermission('orders:create')
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: {
          id: true,
          creditApplication: true,
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const creditLimit = customer.creditApplication.creditLimit;
      const outstandingBalance = await getOutstandingBalance(customer.id);
      const availableCredit = creditLimit - outstandingBalance;

      return {
        creditLimit, // In cents
        outstandingBalance, // In cents
        availableCredit, // In cents
        currency: 'AUD',
      };
    }),

  // ============================================================================
  // ORDER CONFIRMATION (Admin)
  // ============================================================================

  // Confirm a pending order (Admin/Sales only)
  confirmOrder: requirePermission('orders:confirm')
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

      // Validate current status - only awaiting_approval orders can be confirmed (for backorders)
      if (order.status !== 'awaiting_approval') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot confirm order with status '${order.status}'. Only orders awaiting approval can be confirmed.`,
        });
      }

      // Check stock availability for non-backorders and convert to backorder if insufficient
      let stockValidation: StockValidationResult = { requiresBackorder: false, stockShortfall: {} };
      if (!order.stockShortfall) {  // Normal order (not a backorder)
        const orderItems = order.items as Array<{ productId: string; quantity: number }>;
        const productIds = orderItems.map((item) => item.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
        });

        stockValidation = validateStockWithBackorder(orderItems, products);

        // If stock is insufficient, convert to backorder instead of blocking
        if (stockValidation.requiresBackorder) {
          const userDetails = await getUserDetails(ctx.userId);

          // Update order to backorder status
          const updatedBackorder = await prisma.order.update({
            where: { id: orderId },
            data: {
              stockShortfall: stockValidation.stockShortfall,  // This indicates it's now a backorder
              statusHistory: {
                push: {
                  status: 'awaiting_approval',
                  changedAt: new Date(),
                  changedBy: ctx.userId,
                  changedByName: userDetails.changedByName,
                  changedByEmail: userDetails.changedByEmail,
                  notes: 'Order converted to backorder due to insufficient stock',
                },
              },
            },
            include: { customer: true },
          });

          // Send backorder notification
          const stockShortfallArray = Object.entries(stockValidation.stockShortfall).map(
            ([productId, data]) => {
              const product = products.find((p) => p.id === productId);
              return {
                productName: product?.name || 'Unknown Product',
                sku: product?.sku || productId,
                requested: data.requested,
                available: data.available,
                shortfall: data.shortfall,
                unit: product?.unit || 'unit',
              };
            }
          );

          await sendBackorderSubmittedEmail({
            customerEmail: updatedBackorder.customer.contactPerson.email,
            customerName: updatedBackorder.customer.businessName,
            orderNumber: updatedBackorder.orderNumber,
            orderDate: updatedBackorder.orderedAt,
            stockShortfall: stockShortfallArray,
            totalAmount: updatedBackorder.totalAmount,
          }).catch((error) => {
            console.error('Failed to send backorder submitted email:', error);
          });

          return {
            ...updatedBackorder,
            convertedToBackorder: true,
            message: 'Order converted to backorder due to insufficient stock. Awaiting approval.',
          };
        }
      }

      // Re-validate credit limit
      const creditLimit = order.customer.creditApplication.creditLimit;
      const availableCredit = await calculateAvailableCredit(order.customerId, creditLimit);

      // Need to exclude this order's amount from available credit since it's already counted
      const adjustedAvailableCredit = availableCredit + order.totalAmount;
      if (order.totalAmount > adjustedAvailableCredit) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Order total exceeds available credit. Available: $${(adjustedAvailableCredit / 100).toFixed(2)}`,
        });
      }

      // Validate delivery date is in the future
      const now = new Date();
      if (order.requestedDeliveryDate < now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Requested delivery date is in the past. Please update the delivery date.',
        });
      }

      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // Update order status to confirmed
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'confirmed',
          statusHistory: {
            push: {
              status: 'confirmed',
              changedAt: new Date(),
              changedBy: ctx.userId,
              changedByName: userDetails.changedByName,
              changedByEmail: userDetails.changedByEmail,
              notes: notes || 'Order confirmed by admin',
            },
          },
        },
        include: { customer: true },
      });

      // Assign preliminary packing sequence for immediate display
      await assignPreliminaryPackingSequence(
        updatedOrder.requestedDeliveryDate,
        updatedOrder.id
      );

      // Send order confirmed by admin email to customer
      await sendOrderConfirmedByAdminEmail({
        customerEmail: updatedOrder.customer.contactPerson.email,
        customerName: updatedOrder.customer.businessName,
        orderNumber: updatedOrder.orderNumber,
        estimatedDeliveryDate: updatedOrder.requestedDeliveryDate,
      }).catch((error) => {
        console.error('Failed to send order confirmed by admin email:', error);
      });

      // Audit log - HIGH: Order confirmation must be tracked
      await logOrderConfirmation(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        customerId: order.customerId,
      }).catch((error) => {
        console.error('Audit log failed for order confirmation:', error);
      });

      return updatedOrder;
    }),

  // ============================================================================
  // CUSTOMER ORDER CANCELLATION
  // ============================================================================

  // Cancel own order (Customer only - pending orders)
  cancelMyOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, reason } = input;

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

      // Validate ownership - order must belong to the customer
      if (order.customer.clerkUserId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only cancel your own orders',
        });
      }

      // Validate status - orders can be cancelled before packing starts
      const cancellableStatuses = ['confirmed', 'awaiting_approval'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Orders can only be cancelled before packing begins. Please contact customer service for assistance.',
        });
      }

      // Get user details for status history
      const userDetails = await getUserDetails(ctx.userId);

      // Cancel the order and restore stock in a transaction
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // For normal orders (not backorders), restore the stock
        if (!order.stockShortfall) {
          const orderItems = order.items as Array<{ productId: string; quantity: number }>;

          for (const item of orderItems) {
            // Get current product stock
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });

            if (product) {
              const previousStock = product.currentStock;
              const newStock = previousStock + item.quantity;

              // Create inventory transaction (return)
              await tx.inventoryTransaction.create({
                data: {
                  productId: item.productId,
                  type: 'return',
                  quantity: item.quantity, // Positive for return
                  previousStock,
                  newStock,
                  referenceType: 'order',
                  referenceId: order.id,
                  notes: `Stock restored from cancelled order ${order.orderNumber}`,
                  createdBy: ctx.userId,
                },
              });

              // Update product stock
              await tx.product.update({
                where: { id: item.productId },
                data: { currentStock: newStock },
              });
            }
          }
        }

        // Update order status
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'cancelled',
            statusHistory: {
              push: {
                status: 'cancelled',
                changedAt: new Date(),
                changedBy: ctx.userId,
                changedByName: userDetails.changedByName,
                changedByEmail: userDetails.changedByEmail,
                notes: reason || 'Cancelled by customer',
              },
            },
          },
          include: { customer: true },
        });

        return updated;
      });

      // Send cancellation email to customer
      await sendOrderCancelledEmail({
        customerEmail: cancelledOrder.customer.contactPerson.email,
        customerName: cancelledOrder.customer.businessName,
        orderNumber: cancelledOrder.orderNumber,
        cancellationReason: reason || 'Cancelled by customer',
        totalAmount: cancelledOrder.totalAmount,
      }).catch((error) => {
        console.error('Failed to send order cancelled email:', error);
      });

      // Audit log - HIGH: Customer-initiated cancellation must be tracked
      await logOrderCancellation(ctx.userId, orderId, order.orderNumber, reason || 'Cancelled by customer', order.status).catch((error) => {
        console.error('Audit log failed for customer order cancellation:', error);
      });

      return cancelledOrder;
    }),

  // ============================================================================
  // RESEND CONFIRMATION EMAIL
  // ============================================================================

  // Resend order confirmation email (Admin/Sales only)
  resendConfirmation: requirePermission('orders:confirm')
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;

      // Get the order with customer
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

      // Only allow resending for confirmed orders
      if (order.status !== 'confirmed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot resend confirmation for order with status '${order.status}'. Only confirmed orders can have confirmation emails resent.`,
        });
      }

      // Get the order items from the JSON field
      const orderItems = order.items as Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        subtotal: number;
      }>;

      // Get the delivery address from the JSON field
      const deliveryAddress = order.deliveryAddress as {
        street: string;
        suburb: string;
        state: string;
        postcode: string;
      };

      // Send the order confirmation email
      await sendOrderConfirmationEmail({
        customerEmail: order.customer.contactPerson.email,
        customerName: order.customer.businessName,
        orderNumber: order.orderNumber,
        orderDate: order.orderedAt,
        requestedDeliveryDate: order.requestedDeliveryDate,
        items: orderItems.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        deliveryAddress: {
          street: deliveryAddress.street,
          suburb: deliveryAddress.suburb,
          state: deliveryAddress.state,
          postcode: deliveryAddress.postcode,
        },
      });

      // Audit log - LOW: Resend confirmation tracked for visibility
      await logResendConfirmation(ctx.userId, undefined, ctx.userRole, ctx.userName, orderId, {
        orderNumber: order.orderNumber,
        recipientEmail: order.customer.contactPerson.email,
      }).catch((error) => {
        console.error('Audit log failed for resend confirmation:', error);
      });

      return { success: true, message: 'Confirmation email resent successfully' };
    }),

  /**
   * Get minimum order amount configuration
   * Returns the minimum order amount and whether it's enabled
   */
  getMinimumOrderInfo: protectedProcedure.query(async () => {
    const company = await prisma.company.findFirst({
      select: { deliverySettings: true },
    });

    const minimumOrderAmount = company?.deliverySettings?.minimumOrderAmount || null;

    return {
      minimumOrderAmount, // In cents
      hasMinimum: minimumOrderAmount !== null && minimumOrderAmount > 0,
    };
  }),

  /**
   * Get invoice details for a customer's order
   * Fetches live data from Xero if available, otherwise returns cached data
   * Customer can only view their own orders
   */
  getOrderInvoice: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      // Verify customer owns this order
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          xero: true,
          delivery: true,
        },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Get customer to verify ownership
      const customer = await prisma.customer.findUnique({
        where: { clerkUserId: ctx.userId! },
        select: { id: true },
      });

      if (!customer || order.customerId !== customer.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Check if order has an invoice
      if (!order.xero?.invoiceId) {
        return null;
      }

      // Try to fetch live invoice from Xero
      try {
        const { getCachedInvoice } = await import('../services/xero');
        const liveInvoice = await getCachedInvoice(order.xero.invoiceId);

        if (liveInvoice) {
          return {
            invoiceId: liveInvoice.InvoiceID,
            invoiceNumber: liveInvoice.InvoiceNumber,
            date: liveInvoice.Date,
            dueDate: liveInvoice.DueDate,
            status: liveInvoice.Status,
            total: liveInvoice.Total || 0,
            totalTax: liveInvoice.TotalTax || 0,
            amountDue: liveInvoice.AmountDue,
            amountPaid: liveInvoice.AmountPaid,
            isLive: true,
          };
        }
      } catch (error) {
        // If live fetch fails, fall back to cached data
        console.error('Failed to fetch live invoice:', error);
      }

      // Fallback to cached data from order.xero
      return {
        invoiceId: order.xero.invoiceId,
        invoiceNumber: order.xero.invoiceNumber,
        date: order.delivery?.deliveredAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: order.delivery?.deliveredAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        status: order.xero.invoiceStatus || 'AUTHORISED',
        total: 0,
        totalTax: 0,
        isLive: false,
        syncedAt: order.xero.syncedAt?.toISOString(),
      };
    }),

  /**
   * Get invoice PDF download URL
   * Returns a temporary URL from Xero for customer to download invoice
   * Customer can only download invoices for their own orders
   */
  getInvoicePdfUrl: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      // Verify customer owns this order
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          customerId: true,
          xero: true,
        },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Get customer to verify ownership
      const customer = await prisma.customer.findUnique({
        where: { clerkUserId: ctx.userId! },
        select: { id: true },
      });

      if (!customer || order.customerId !== customer.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Check if order has an invoice
      if (!order.xero?.invoiceId) {
        return null;
      }

      // Fetch PDF URL from Xero
      try {
        const { getInvoicePdfUrl } = await import('../services/xero');
        const pdfUrl = await getInvoicePdfUrl(order.xero.invoiceId);
        return pdfUrl;
      } catch (error) {
        console.error('Failed to fetch invoice PDF URL:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate PDF download link',
        });
      }
    }),
});
