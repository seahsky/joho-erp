import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import {
  createMoney,
  multiplyMoney,
  toCents,
  getEffectivePrice,
  DEFAULT_GST_RATE,
} from '@joho-erp/shared';
import { calculateAvailableCredit } from './order';

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
  unitPrice: number; // In cents (effective price with customer-specific discount, before GST)
  basePrice: number; // In cents (original price, before GST)
  subtotal: number; // In cents (unitPrice * quantity, before GST)
  hasCustomPricing: boolean;

  // Per-product GST fields (denormalized from Product at add-to-cart time)
  applyGst: boolean; // Whether GST should be applied to this item
  gstRate: number; // GST rate percentage (e.g., 10 for 10%)
  itemGst: number; // In cents (calculated GST for this item: subtotal * gstRate / 100)
  itemTotal: number; // In cents (subtotal + itemGst)

  // Product display fields
  imageUrl: string | null;
  description: string | null;
}

/**
 * Cart interface with totals
 * All monetary values in cents
 */
interface Cart {
  items: CartItem[]; // Items include per-product GST calculations
  subtotal: number; // In cents (sum of all item.subtotal)
  gst: number; // In cents (sum of all item.itemGst, aggregated from per-product rates)
  total: number; // In cents (sum of all item.itemTotal)
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
 * Calculate GST for a single cart item based on product settings
 * @param subtotal - Item subtotal in cents (unitPrice * quantity)
 * @param applyGst - Whether GST should be applied to this item
 * @param gstRate - GST rate percentage (e.g., 10 for 10%), or null to use default
 * @returns Object with itemGst and itemTotal in cents
 */
function calculateItemGst(
  subtotal: number,
  applyGst: boolean,
  gstRate?: number | null
): { itemGst: number; itemTotal: number } {
  if (!applyGst) {
    return { itemGst: 0, itemTotal: subtotal };
  }

  const rate = gstRate ?? DEFAULT_GST_RATE; // Default to 10 if null

  const subtotalMoney = createMoney(subtotal);
  const gstMoney = multiplyMoney(subtotalMoney, { amount: Math.round(rate), scale: 2 });
  const itemGst = toCents(gstMoney);

  return {
    itemGst,
    itemTotal: subtotal + itemGst,
  };
}

/**
 * Calculate cart totals by aggregating per-item GST
 * Each item has its own GST rate, we sum them to get total GST
 */
function calculateCartTotals(items: CartItem[], creditLimit: number): Cart {
  if (items.length === 0) {
    return {
      items: [],
      subtotal: 0,
      gst: 0,
      total: 0,
      itemCount: 0,
      exceedsCredit: false,
      creditLimit,
    };
  }

  // Aggregate subtotals, GST, and totals from pre-calculated item values
  const subtotalCents = items.reduce((sum, item) => sum + item.subtotal, 0);
  const gstCents = items.reduce((sum, item) => sum + item.itemGst, 0);
  const totalCents = items.reduce((sum, item) => sum + item.itemTotal, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const exceedsCredit = totalCents > creditLimit;

  return {
    items,
    subtotal: subtotalCents,
    gst: gstCents, // Sum of per-item GST (not blanket 10%)
    total: totalCents, // Sum of per-item totals
    itemCount,
    exceedsCredit,
    creditLimit,
  };
}

/**
 * Build cart response for user
 * Uses available credit (excluding pending backorders) instead of raw credit limit
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

  // Calculate available credit (excluding pending backorders)
  const availableCredit = await calculateAvailableCredit(customerId, creditLimit);

  return calculateCartTotals(items, availableCredit);
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
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          basePrice: true,
          status: true,
          currentStock: true,
          applyGst: true,
          gstRate: true,
          imageUrl: true,
          description: true,
        },
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

      // Stock validation removed - orders with insufficient stock go to pending admin approval

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

        // Stock validation removed - orders with insufficient stock go to pending admin approval

        // Recalculate subtotal for new quantity
        const newSubtotalMoney = multiplyMoney(priceMoney, newQuantity);
        const newSubtotal = toCents(newSubtotalMoney);

        // Recalculate GST with new subtotal (preserve original rate)
        const { itemGst, itemTotal } = calculateItemGst(
          newSubtotal,
          existingItem.applyGst,
          existingItem.gstRate
        );

        const updatedItem: CartItem = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: newSubtotal,
          itemGst: itemGst,
          itemTotal: itemTotal,
        };

        setCartItem(ctx.userId, updatedItem);
      } else {
        // Add new item to cart

        // Calculate item GST based on product settings
        const gstRate = product.gstRate ?? DEFAULT_GST_RATE; // 10 if null
        const { itemGst, itemTotal } = calculateItemGst(
          itemSubtotal,
          product.applyGst,
          gstRate
        );

        const newItem: CartItem = {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          unit: product.unit,
          quantity: input.quantity,
          unitPrice: effectivePrice, // In cents (before GST)
          basePrice: product.basePrice, // In cents (before GST)
          subtotal: itemSubtotal, // In cents (before GST)
          hasCustomPricing: priceInfo.hasCustomPricing,

          // Per-product GST fields
          applyGst: product.applyGst,
          gstRate: gstRate,
          itemGst: itemGst, // Calculated GST for this item
          itemTotal: itemTotal, // subtotal + itemGst

          // Product display fields
          imageUrl: product.imageUrl,
          description: product.description,
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

      // Stock validation removed - orders with insufficient stock go to pending admin approval

      // Recalculate subtotal using dinero.js
      const priceMoney = createMoney(existingItem.unitPrice);
      const newSubtotalMoney = multiplyMoney(priceMoney, input.quantity);
      const newSubtotal = toCents(newSubtotalMoney);

      // Recalculate GST with new subtotal (preserve original rate)
      const { itemGst, itemTotal } = calculateItemGst(
        newSubtotal,
        existingItem.applyGst,
        existingItem.gstRate
      );

      // Update item
      const updatedItem: CartItem = {
        ...existingItem,
        quantity: input.quantity,
        subtotal: newSubtotal,
        itemGst: itemGst,
        itemTotal: itemTotal,
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
