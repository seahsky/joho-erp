import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import {
  createMoney,
  multiplyMoney,
  toCents,
  calculateTotalWithGST,
  getEffectivePrice,
  ZERO_AUD,
  isGreaterThan,
  sumMoney,
} from '@jimmy-beef/shared';

/**
 * Cart Router
 *
 * Manages shopping cart functionality for customers
 * - All prices are stored and calculated in cents (Int)
 * - Uses dinero.js for precise monetary calculations
 * - Session-based cart storage (in-memory per user)
 * - Applies customer-specific pricing automatically
 * - Validates stock availability and credit limits
 */

// ============================================================================
// IN-MEMORY CART STORAGE
// ============================================================================

/**
 * Cart item interface
 * All monetary values in cents
 */
interface CartItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number; // In cents (effective price with customer-specific discount)
  basePrice: number; // In cents (original price)
  subtotal: number; // In cents (unitPrice * quantity)
  hasCustomPricing: boolean;
}

/**
 * Cart interface with totals
 * All monetary values in cents
 */
interface Cart {
  items: CartItem[];
  subtotal: number; // In cents
  gst: number; // In cents (10% Australian GST)
  total: number; // In cents
  itemCount: number;
  exceedsCredit: boolean;
  creditLimit: number; // In cents
}

/**
 * In-memory cart storage
 * Key: userId (Clerk user ID)
 * Value: Map of productId to CartItem
 */
const cartStore = new Map<string, Map<string, CartItem>>();

/**
 * Get user's cart items from store
 */
function getUserCartItems(userId: string): CartItem[] {
  const userCart = cartStore.get(userId);
  return userCart ? Array.from(userCart.values()) : [];
}

/**
 * Set cart item in store
 */
function setCartItem(userId: string, item: CartItem): void {
  let userCart = cartStore.get(userId);
  if (!userCart) {
    userCart = new Map();
    cartStore.set(userId, userCart);
  }
  userCart.set(item.productId, item);
}

/**
 * Remove cart item from store
 */
function removeCartItem(userId: string, productId: string): void {
  const userCart = cartStore.get(userId);
  if (userCart) {
    userCart.delete(productId);
    // Clean up empty carts
    if (userCart.size === 0) {
      cartStore.delete(userId);
    }
  }
}

/**
 * Clear all items from user's cart
 */
function clearUserCart(userId: string): void {
  cartStore.delete(userId);
}

// ============================================================================
// CART CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate cart totals using dinero.js
 * Includes 10% Australian GST
 */
function calculateCartTotals(items: CartItem[], creditLimit: number): Cart {
  // Calculate subtotal using dinero.js
  const subtotalMoney = items.length > 0
    ? sumMoney(items.map(item => createMoney(item.subtotal)))
    : ZERO_AUD;

  // Calculate GST and total (10% Australian GST)
  const { gst, total } = calculateTotalWithGST(subtotalMoney);

  // Convert to cents for storage
  const subtotalCents = toCents(subtotalMoney);
  const gstCents = toCents(gst);
  const totalCents = toCents(total);

  // Check if cart total exceeds credit limit
  const creditLimitMoney = createMoney(creditLimit);
  const exceedsCredit = isGreaterThan(total, creditLimitMoney);

  return {
    items,
    subtotal: subtotalCents,
    gst: gstCents,
    total: totalCents,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    exceedsCredit,
    creditLimit,
  };
}

/**
 * Build cart response for user
 */
async function buildCartResponse(userId: string, customerId: string): Promise<Cart> {
  const items = getUserCartItems(userId);

  // Get customer for credit limit
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { creditApplication: true },
  });

  if (!customer) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Customer not found',
    });
  }

  const creditLimit = customer.creditApplication.creditLimit || 0; // In cents

  return calculateCartTotals(items, creditLimit);
}

// ============================================================================
// CART ROUTER ENDPOINTS
// ============================================================================

export const cartRouter = router({
  /**
   * Add item to cart
   *
   * Validates:
   * - Product exists and is active
   * - Sufficient stock available
   * - Quantity is positive
   *
   * Applies customer-specific pricing if available
   */
  addItem: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Check credit approval
      if (customer.creditApplication.status !== 'approved') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your credit application must be approved before placing orders',
        });
      }

      // Get product and validate
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Check if product is active
      if (product.status !== 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Product "${product.name}" is not available for purchase`,
        });
      }

      // Check stock availability
      if (product.currentStock < input.quantity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}`,
        });
      }

      // Get customer-specific pricing
      const customPricing = await prisma.customerPricing.findFirst({
        where: {
          customerId: customer.id,
          productId: input.productId,
        },
      });

      // Calculate effective price (custom or base price) - already in cents
      const priceInfo = getEffectivePrice(product.basePrice, customPricing);
      const effectivePrice = priceInfo.effectivePrice; // In cents

      // Calculate item subtotal using dinero.js for precision
      const priceMoney = createMoney(effectivePrice);
      const itemSubtotalMoney = multiplyMoney(priceMoney, input.quantity);
      const itemSubtotal = toCents(itemSubtotalMoney);

      // Check if item already exists in cart
      const existingItems = getUserCartItems(ctx.userId);
      const existingItem = existingItems.find(item => item.productId === input.productId);

      if (existingItem) {
        // Update quantity if item exists
        const newQuantity = existingItem.quantity + input.quantity;

        // Re-check stock for new quantity
        if (product.currentStock < newQuantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot add ${input.quantity} more. Available stock: ${product.currentStock} ${product.unit}`,
          });
        }

        // Recalculate subtotal for new quantity
        const newSubtotalMoney = multiplyMoney(priceMoney, newQuantity);
        const newSubtotal = toCents(newSubtotalMoney);

        const updatedItem: CartItem = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: newSubtotal,
        };

        setCartItem(ctx.userId, updatedItem);
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          unit: product.unit,
          quantity: input.quantity,
          unitPrice: effectivePrice, // In cents
          basePrice: product.basePrice, // In cents
          subtotal: itemSubtotal, // In cents
          hasCustomPricing: priceInfo.hasCustomPricing,
        };

        setCartItem(ctx.userId, newItem);
      }

      // Return updated cart
      return await buildCartResponse(ctx.userId, customer.id);
    }),

  /**
   * Remove item from cart
   */
  removeItem: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Check if item exists in cart
      const existingItems = getUserCartItems(ctx.userId);
      const itemExists = existingItems.some(item => item.productId === input.productId);

      if (!itemExists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found in cart',
        });
      }

      // Remove item
      removeCartItem(ctx.userId, input.productId);

      // Return updated cart
      return await buildCartResponse(ctx.userId, customer.id);
    }),

  /**
   * Update item quantity in cart
   *
   * Validates:
   * - Quantity is positive
   * - Sufficient stock available
   */
  updateQuantity: protectedProcedure
    .input(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Check if item exists in cart
      const existingItems = getUserCartItems(ctx.userId);
      const existingItem = existingItems.find(item => item.productId === input.productId);

      if (!existingItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found in cart',
        });
      }

      // Get product to check stock
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Check stock availability for new quantity
      if (product.currentStock < input.quantity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}`,
        });
      }

      // Recalculate subtotal using dinero.js
      const priceMoney = createMoney(existingItem.unitPrice);
      const newSubtotalMoney = multiplyMoney(priceMoney, input.quantity);
      const newSubtotal = toCents(newSubtotalMoney);

      // Update item
      const updatedItem: CartItem = {
        ...existingItem,
        quantity: input.quantity,
        subtotal: newSubtotal,
      };

      setCartItem(ctx.userId, updatedItem);

      // Return updated cart
      return await buildCartResponse(ctx.userId, customer.id);
    }),

  /**
   * Get current user's cart
   *
   * Returns:
   * - All cart items with customer-specific pricing
   * - Subtotal, GST (10%), and total in cents
   * - Credit limit check
   */
  getCart: protectedProcedure.query(async ({ ctx }) => {
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

    // Return cart with totals
    return await buildCartResponse(ctx.userId, customer.id);
  }),

  /**
   * Clear all items from cart
   */
  clearCart: protectedProcedure.mutation(async ({ ctx }) => {
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

    // Clear cart
    clearUserCart(ctx.userId);

    // Return empty cart
    return await buildCartResponse(ctx.userId, customer.id);
  }),
});
