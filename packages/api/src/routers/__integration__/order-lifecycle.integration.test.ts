import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPrismaClient } from '@joho-erp/database';
import { adminCaller, customerCaller } from '../../test-utils/create-test-caller';
import { cleanTransactionalData } from '../../test-utils/db-helpers';
import { createTestProduct, createTestCustomer, createTestCompany } from '../../test-utils/factories';

const prisma = getPrismaClient();

/**
 * Order Lifecycle Integration Tests
 *
 * Tests the most critical workflow: order creation through cancellation.
 * Uses the real database and real business logic -- only external services
 * (email, xero, sms, r2, etc.) are mocked via the setup file.
 */

// Shared test data
let product1: Awaited<ReturnType<typeof createTestProduct>>;
let product2: Awaited<ReturnType<typeof createTestProduct>>;
let customer: Awaited<ReturnType<typeof createTestCustomer>>;

// Use a consistent clerkUserId so customerCaller matches the customer record
const CUSTOMER_CLERK_ID = 'test-order-lifecycle-customer';

/**
 * Returns a safe delivery date far enough in the future to avoid cutoff issues.
 * Picks a Wednesday 14 days from now (never a Sunday).
 */
function getSafeDeliveryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  // Shift to next Wednesday if needed (day 3) to avoid Sunday (day 0)
  const day = date.getDay();
  const daysUntilWednesday = (3 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilWednesday);
  date.setHours(10, 0, 0, 0);
  return date;
}

describe('Order Lifecycle', () => {
  beforeAll(async () => {
    await cleanTransactionalData();

    // Create a company record so cutoff/minimum-order lookups don't fail
    await createTestCompany();

    // Create products with stock and a non-zero price
    [product1, product2] = await Promise.all([
      createTestProduct({
        name: 'Lifecycle Test Beef',
        sku: 'LT-BEEF-001',
        basePrice: 2500, // $25.00
        currentStock: 50,
        applyGst: false,
      }),
      createTestProduct({
        name: 'Lifecycle Test Chicken',
        sku: 'LT-CHKN-001',
        basePrice: 1800, // $18.00
        currentStock: 30,
        applyGst: true,
        gstRate: 10,
      }),
    ]);

    // Create a customer with approved credit and onboarding complete
    customer = await createTestCustomer({
      clerkUserId: CUSTOMER_CLERK_ID,
      businessName: 'Lifecycle Test Restaurant',
      creditLimit: 1000000, // $10,000
      creditStatus: 'approved',
      onboardingComplete: true,
      status: 'active',
    });
  });

  afterAll(async () => {
    await cleanTransactionalData();
  });

  // ----------------------------------------------------------------
  // Happy Path
  // ----------------------------------------------------------------
  describe('Happy path - customer places order', () => {
    let orderId: string;

    it('should create an order with confirmed status', async () => {
      const caller = customerCaller(CUSTOMER_CLERK_ID);

      const order = await caller.order.create({
        items: [
          { productId: product1.id, quantity: 2 },
          { productId: product2.id, quantity: 3 },
        ],
        requestedDeliveryDate: getSafeDeliveryDate(),
      });

      orderId = order.id;

      expect(order).toBeDefined();
      expect(order.id).toBeTruthy();
      expect(order.orderNumber).toBeTruthy();
      expect(order.status).toBe('confirmed');
      expect(order.customerId).toBe(customer.id);
      expect(order.customerName).toBe('Lifecycle Test Restaurant');
    });

    it('should calculate order totals correctly', async () => {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order).not.toBeNull();

      // product1: $25.00 x 2 = $50.00 (no GST)
      // product2: $18.00 x 3 = $54.00 + 10% GST = $5.40 tax
      // subtotal = $50.00 + $54.00 = $104.00 = 10400 cents
      // tax = $5.40 = 540 cents
      // total = $104.00 + $5.40 = $109.40 = 10940 cents
      expect(order!.subtotal).toBe(10400);
      expect(order!.taxAmount).toBe(540);
      expect(order!.totalAmount).toBe(10940);
    });

    it('should NOT deduct stock at order creation (stock deducted at packing)', async () => {
      const [freshProduct1, freshProduct2] = await Promise.all([
        prisma.product.findUnique({ where: { id: product1.id } }),
        prisma.product.findUnique({ where: { id: product2.id } }),
      ]);

      // Stock should remain unchanged because stock is only deducted during packing
      expect(freshProduct1!.currentStock).toBe(50);
      expect(freshProduct2!.currentStock).toBe(30);
    });

    it('should store correct order items with pricing', async () => {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      const items = order!.items as Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;

      expect(items).toHaveLength(2);

      const beefItem = items.find((i) => i.productId === product1.id);
      expect(beefItem).toBeDefined();
      expect(beefItem!.unitPrice).toBe(2500);
      expect(beefItem!.quantity).toBe(2);
      expect(beefItem!.subtotal).toBe(5000);

      const chickenItem = items.find((i) => i.productId === product2.id);
      expect(chickenItem).toBeDefined();
      expect(chickenItem!.unitPrice).toBe(1800);
      expect(chickenItem!.quantity).toBe(3);
      expect(chickenItem!.subtotal).toBe(5400);
    });
  });

  // ----------------------------------------------------------------
  // Admin: Create Order on Behalf
  // ----------------------------------------------------------------
  describe('Admin creates order on behalf of customer', () => {
    it('should create an order via createOnBehalf', async () => {
      const caller = adminCaller();

      const order = await caller.order.createOnBehalf({
        customerId: customer.id,
        items: [{ productId: product1.id, quantity: 1 }],
        requestedDeliveryDate: getSafeDeliveryDate(),
      });

      expect(order).toBeDefined();
      expect(order.status).toBe('confirmed');
      expect(order.customerId).toBe(customer.id);
      expect(order.placedByAdmin).toBe('admin-user-id');
      expect(order.placedOnBehalfOf).toBe(customer.id);

      // Verify totals: $25.00 x 1 = $25.00 (no GST on product1)
      expect(order.subtotal).toBe(2500);
      expect(order.taxAmount).toBe(0);
      expect(order.totalAmount).toBe(2500);
    });
  });

  // ----------------------------------------------------------------
  // Order Cancellation
  // ----------------------------------------------------------------
  describe('Order cancellation', () => {
    it('should cancel a confirmed order', async () => {
      const caller = customerCaller(CUSTOMER_CLERK_ID);

      // Create an order to cancel
      const order = await caller.order.create({
        items: [{ productId: product1.id, quantity: 5 }],
        requestedDeliveryDate: getSafeDeliveryDate(),
      });

      expect(order.status).toBe('confirmed');

      // Cancel it
      const cancelled = await caller.order.cancelMyOrder({
        orderId: order.id,
        reason: 'Changed my mind',
      });

      expect(cancelled.status).toBe('cancelled');
    });

    it('should not restore stock for confirmed orders (stock not yet consumed)', async () => {
      // Stock is only deducted at packing, so cancelling a confirmed order
      // should leave stock unchanged.
      const freshProduct1 = await prisma.product.findUnique({
        where: { id: product1.id },
      });

      expect(freshProduct1!.currentStock).toBe(50);
    });
  });

  // ----------------------------------------------------------------
  // Credit Limit Exceeded
  // ----------------------------------------------------------------
  describe('Credit limit enforcement', () => {
    const LOW_CREDIT_CLERK_ID = 'test-low-credit-customer';

    beforeAll(async () => {
      await createTestCustomer({
        clerkUserId: LOW_CREDIT_CLERK_ID,
        businessName: 'Budget Restaurant',
        creditLimit: 5000, // $50.00 -- very low
        creditStatus: 'approved',
        onboardingComplete: true,
        status: 'active',
      });
    });

    it('should reject order that exceeds available credit', async () => {
      const caller = customerCaller(LOW_CREDIT_CLERK_ID);

      // product1 is $25 each, ordering 3 = $75 which exceeds $50 credit
      await expect(
        caller.order.create({
          items: [{ productId: product1.id, quantity: 3 }],
          requestedDeliveryDate: getSafeDeliveryDate(),
        })
      ).rejects.toThrow(/exceeds available credit/i);
    });

    it('should allow order within credit limit', async () => {
      const caller = customerCaller(LOW_CREDIT_CLERK_ID);

      // product1 is $25 each, ordering 1 = $25 which is within $50 credit
      const order = await caller.order.create({
        items: [{ productId: product1.id, quantity: 1 }],
        requestedDeliveryDate: getSafeDeliveryDate(),
      });

      expect(order.status).toBe('confirmed');
      expect(order.totalAmount).toBe(2500);
    });

    it('should account for outstanding orders when checking credit', async () => {
      const caller = customerCaller(LOW_CREDIT_CLERK_ID);

      // The customer already has a $25 confirmed order from the previous test.
      // Remaining credit = $50 - $25 = $25.
      // Trying to order $50 worth should fail.
      await expect(
        caller.order.create({
          items: [{ productId: product1.id, quantity: 2 }],
          requestedDeliveryDate: getSafeDeliveryDate(),
        })
      ).rejects.toThrow(/exceeds available credit/i);
    });
  });

  // ----------------------------------------------------------------
  // Customer Validation Guards
  // ----------------------------------------------------------------
  describe('Customer validation guards', () => {
    it('should reject order from suspended customer', async () => {
      const suspendedClerkId = 'test-suspended-customer';
      await createTestCustomer({
        clerkUserId: suspendedClerkId,
        businessName: 'Suspended Business',
        status: 'suspended',
        creditStatus: 'approved',
        onboardingComplete: true,
      });

      const caller = customerCaller(suspendedClerkId);

      await expect(
        caller.order.create({
          items: [{ productId: product1.id, quantity: 1 }],
          requestedDeliveryDate: getSafeDeliveryDate(),
        })
      ).rejects.toThrow(/suspended/i);
    });

    it('should reject order from customer with incomplete onboarding', async () => {
      const incompleteClerkId = 'test-incomplete-customer';
      await createTestCustomer({
        clerkUserId: incompleteClerkId,
        businessName: 'Incomplete Business',
        status: 'active',
        creditStatus: 'approved',
        onboardingComplete: false,
      });

      const caller = customerCaller(incompleteClerkId);

      await expect(
        caller.order.create({
          items: [{ productId: product1.id, quantity: 1 }],
          requestedDeliveryDate: getSafeDeliveryDate(),
        })
      ).rejects.toThrow(/complete your registration/i);
    });

    it('should reject order from customer with unapproved credit', async () => {
      const pendingClerkId = 'test-pending-credit-customer';
      await createTestCustomer({
        clerkUserId: pendingClerkId,
        businessName: 'Pending Credit Business',
        status: 'active',
        creditStatus: 'pending',
        onboardingComplete: true,
      });

      const caller = customerCaller(pendingClerkId);

      await expect(
        caller.order.create({
          items: [{ productId: product1.id, quantity: 1 }],
          requestedDeliveryDate: getSafeDeliveryDate(),
        })
      ).rejects.toThrow(/credit application is pending/i);
    });
  });

  // ----------------------------------------------------------------
  // Backorder (Stock Shortfall)
  // ----------------------------------------------------------------
  describe('Backorder when stock is insufficient', () => {
    let lowStockProduct: Awaited<ReturnType<typeof createTestProduct>>;

    beforeAll(async () => {
      lowStockProduct = await createTestProduct({
        name: 'Low Stock Lamb',
        sku: 'LT-LAMB-001',
        basePrice: 3000, // $30.00
        currentStock: 2, // Only 2 in stock
        applyGst: false,
      });
    });

    it('should create order with awaiting_approval status when stock is insufficient', async () => {
      const caller = customerCaller(CUSTOMER_CLERK_ID);

      // Request 10 but only 2 available
      const order = await caller.order.create({
        items: [{ productId: lowStockProduct.id, quantity: 10 }],
        requestedDeliveryDate: getSafeDeliveryDate(),
      });

      expect(order.status).toBe('awaiting_approval');
      expect(order.stockShortfall).toBeDefined();

      const shortfall = order.stockShortfall as Record<
        string,
        { requested: number; available: number; shortfall: number }
      >;
      expect(shortfall[lowStockProduct.id]).toBeDefined();
      expect(shortfall[lowStockProduct.id].requested).toBe(10);
      expect(shortfall[lowStockProduct.id].available).toBe(2);
      expect(shortfall[lowStockProduct.id].shortfall).toBe(8);
    });
  });

  // ----------------------------------------------------------------
  // Admin bypass flags on createOnBehalf
  // ----------------------------------------------------------------
  describe('Admin bypass flags on createOnBehalf', () => {
    let tightCreditCustomer: Awaited<ReturnType<typeof createTestCustomer>>;

    beforeAll(async () => {
      tightCreditCustomer = await createTestCustomer({
        clerkUserId: 'test-tight-credit-customer',
        businessName: 'Tight Credit Bistro',
        creditLimit: 1000, // $10.00
        creditStatus: 'approved',
        onboardingComplete: true,
        status: 'active',
      });
    });

    it('should allow admin to bypass credit limit with reason', async () => {
      const caller = adminCaller();

      // product1 is $25 which exceeds $10 credit, but bypass is on
      const order = await caller.order.createOnBehalf({
        customerId: tightCreditCustomer.id,
        items: [{ productId: product1.id, quantity: 1 }],
        requestedDeliveryDate: getSafeDeliveryDate(),
        bypassCreditLimit: true,
        bypassCreditReason: 'VIP customer - approved by management',
      });

      expect(order.status).toBe('confirmed');
      expect(order.bypassCreditLimit).toBe(true);
      expect(order.bypassCreditReason).toBe('VIP customer - approved by management');
    });

    it('should reject bypass without reason', async () => {
      const caller = adminCaller();

      await expect(
        caller.order.createOnBehalf({
          customerId: tightCreditCustomer.id,
          items: [{ productId: product1.id, quantity: 1 }],
          requestedDeliveryDate: getSafeDeliveryDate(),
          bypassCreditLimit: true,
          // No bypassCreditReason provided
        })
      ).rejects.toThrow(/bypass reason is required/i);
    });
  });
});
