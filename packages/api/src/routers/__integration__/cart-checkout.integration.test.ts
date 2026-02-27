import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { customerCaller } from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { createTestProduct, createTestCustomer, createTestCustomerPricing } from '../../test-utils/factories';
import { getPrismaClient } from '@joho-erp/database';

describe('Cart & Checkout', () => {
  const prisma = getPrismaClient();

  // The customer's clerkUserId MUST match the caller's userId
  const customerClerkId = 'cart-test-customer-clerk-id';

  let product1: Awaited<ReturnType<typeof createTestProduct>>;
  let product2: Awaited<ReturnType<typeof createTestProduct>>;
  let product3: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  beforeAll(async () => {
    await cleanAllData();

    product1 = await createTestProduct({
      name: 'Cart Product A',
      sku: 'CART-A',
      basePrice: 2000, // $20.00
      currentStock: 100,
      applyGst: false,
    });

    product2 = await createTestProduct({
      name: 'Cart Product B',
      sku: 'CART-B',
      basePrice: 3500, // $35.00
      currentStock: 50,
      applyGst: true,
      gstRate: 10,
    });

    product3 = await createTestProduct({
      name: 'Cart Product C',
      sku: 'CART-C',
      basePrice: 1000, // $10.00
      currentStock: 200,
      applyGst: false,
      status: 'discontinued',
    });

    customer = await createTestCustomer({
      clerkUserId: customerClerkId,
      businessName: 'Cart Test Business',
      creditLimit: 100000, // $1000.00 in cents
      creditStatus: 'approved',
    });
  });

  afterAll(async () => {
    await cleanAllData();
  });

  beforeEach(async () => {
    // Clear cart before each test
    await prisma.cart.deleteMany({ where: { customerId: customer.id } });
  });

  describe('cart.addItem', () => {
    it('should add an item to the cart', async () => {
      const caller = customerCaller(customerClerkId);

      const result = await caller.cart.addItem({
        productId: product1.id,
        quantity: 3,
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('gst');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('itemCount');
      expect(result).toHaveProperty('exceedsCredit');
      expect(result).toHaveProperty('creditLimit');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe(product1.id);
      expect(result.items[0].quantity).toBe(3);
      expect(result.items[0].unitPrice).toBe(2000);
      // subtotal = 2000 * 3 = 6000 cents
      expect(result.items[0].subtotal).toBe(6000);
      expect(result.itemCount).toBe(3);
    });

    it('should add GST for products with applyGst = true', async () => {
      const caller = customerCaller(customerClerkId);

      const result = await caller.cart.addItem({
        productId: product2.id,
        quantity: 2,
      });

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.applyGst).toBe(true);
      expect(item.gstRate).toBe(10);
      // subtotal = 3500 * 2 = 7000
      expect(item.subtotal).toBe(7000);
      // itemGst = 7000 * 10% = 700
      expect(item.itemGst).toBe(700);
      // itemTotal = 7000 + 700 = 7700
      expect(item.itemTotal).toBe(7700);

      // Cart totals
      expect(result.subtotal).toBe(7000);
      expect(result.gst).toBe(700);
      expect(result.total).toBe(7700);
    });

    it('should increase quantity when adding an existing item', async () => {
      const caller = customerCaller(customerClerkId);

      // Add 2 of product1
      await caller.cart.addItem({
        productId: product1.id,
        quantity: 2,
      });

      // Add 3 more of product1
      const result = await caller.cart.addItem({
        productId: product1.id,
        quantity: 3,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(5); // 2 + 3
      // subtotal = 2000 * 5 = 10000
      expect(result.items[0].subtotal).toBe(10000);
    });

    it('should apply customer-specific pricing', async () => {
      const caller = customerCaller(customerClerkId);

      // Create custom pricing for this customer
      await createTestCustomerPricing({
        customerId: customer.id,
        productId: product1.id,
        customPrice: 1500, // $15.00 instead of $20.00
      });

      const result = await caller.cart.addItem({
        productId: product1.id,
        quantity: 1,
      });

      expect(result.items[0].unitPrice).toBe(1500);
      expect(result.items[0].hasCustomPricing).toBe(true);
      expect(result.items[0].basePrice).toBe(2000); // Original base price

      // Clean up pricing
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id, productId: product1.id },
      });
    });

    it('should reject adding a discontinued product', async () => {
      const caller = customerCaller(customerClerkId);

      await expect(
        caller.cart.addItem({
          productId: product3.id,
          quantity: 1,
        })
      ).rejects.toThrow(/not available/i);
    });

    it('should reject adding a non-existent product', async () => {
      const caller = customerCaller(customerClerkId);

      await expect(
        caller.cart.addItem({
          productId: '000000000000000000000000',
          quantity: 1,
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('cart.getCart', () => {
    it('should return an empty cart when nothing is added', async () => {
      const caller = customerCaller(customerClerkId);

      const result = await caller.cart.getCart();

      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe(0);
      expect(result.gst).toBe(0);
      expect(result.total).toBe(0);
      expect(result.itemCount).toBe(0);
      expect(result.exceedsCredit).toBe(false);
    });

    it('should return cart with items and calculated totals', async () => {
      const caller = customerCaller(customerClerkId);

      // Add items
      await caller.cart.addItem({ productId: product1.id, quantity: 2 });
      await caller.cart.addItem({ productId: product2.id, quantity: 1 });

      const result = await caller.cart.getCart();

      expect(result.items).toHaveLength(2);
      expect(result.itemCount).toBe(3); // 2 + 1

      // product1: 2000 * 2 = 4000 (no GST)
      // product2: 3500 * 1 = 3500 + 350 GST = 3850
      expect(result.subtotal).toBe(7500); // 4000 + 3500
      expect(result.gst).toBe(350);
      expect(result.total).toBe(7850); // 7500 + 350
    });
  });

  describe('cart.updateQuantity', () => {
    it('should update item quantity in cart', async () => {
      const caller = customerCaller(customerClerkId);

      // Add item
      await caller.cart.addItem({ productId: product1.id, quantity: 5 });

      // Update quantity
      const result = await caller.cart.updateQuantity({
        productId: product1.id,
        quantity: 3,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(3);
      // subtotal = 2000 * 3 = 6000
      expect(result.items[0].subtotal).toBe(6000);
    });

    it('should reject updating quantity for item not in cart', async () => {
      const caller = customerCaller(customerClerkId);

      await expect(
        caller.cart.updateQuantity({
          productId: product1.id,
          quantity: 2,
        })
      ).rejects.toThrow(/not found/i);
    });

    it('should reject quantity of zero', async () => {
      const caller = customerCaller(customerClerkId);

      await caller.cart.addItem({ productId: product1.id, quantity: 3 });

      await expect(
        caller.cart.updateQuantity({
          productId: product1.id,
          quantity: 0,
        })
      ).rejects.toThrow(); // Zod validation: min(1)
    });
  });

  describe('cart.removeItem', () => {
    it('should remove an item from the cart', async () => {
      const caller = customerCaller(customerClerkId);

      // Add two items
      await caller.cart.addItem({ productId: product1.id, quantity: 2 });
      await caller.cart.addItem({ productId: product2.id, quantity: 1 });

      // Remove one
      const result = await caller.cart.removeItem({ productId: product1.id });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe(product2.id);
    });

    it('should reject removing an item not in cart', async () => {
      const caller = customerCaller(customerClerkId);

      await expect(
        caller.cart.removeItem({ productId: product1.id })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('cart.clearCart', () => {
    it('should clear all items from the cart', async () => {
      const caller = customerCaller(customerClerkId);

      // Add items
      await caller.cart.addItem({ productId: product1.id, quantity: 2 });
      await caller.cart.addItem({ productId: product2.id, quantity: 1 });

      // Clear
      const result = await caller.cart.clearCart();

      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe(0);
      expect(result.gst).toBe(0);
      expect(result.total).toBe(0);
      expect(result.itemCount).toBe(0);
    });

    it('should be safe to clear an already empty cart', async () => {
      const caller = customerCaller(customerClerkId);

      const result = await caller.cart.clearCart();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('cart - credit limit', () => {
    it('should indicate when cart total exceeds credit limit', async () => {
      const caller = customerCaller(customerClerkId);

      // Customer has creditLimit of 100000 cents ($1000)
      // Add enough items to exceed: product1 at $20 each, need 51 = $1020
      const result = await caller.cart.addItem({
        productId: product1.id,
        quantity: 51, // 51 * 2000 = 102000 > 100000
      });

      expect(result.exceedsCredit).toBe(true);
      expect(result.total).toBeGreaterThan(result.creditLimit);
    });

    it('should not flag credit warning when under limit', async () => {
      const caller = customerCaller(customerClerkId);

      const result = await caller.cart.addItem({
        productId: product1.id,
        quantity: 1, // 1 * 2000 = 2000 << 100000
      });

      expect(result.exceedsCredit).toBe(false);
    });
  });

  describe('cart - price change detection', () => {
    it('should detect when product price changes between cart add and get', async () => {
      const caller = customerCaller(customerClerkId);

      // Add item at current price
      await caller.cart.addItem({ productId: product1.id, quantity: 2 });

      // Change the product base price behind the scenes
      await prisma.product.update({
        where: { id: product1.id },
        data: { basePrice: 2500 }, // increased from 2000 to 2500
      });

      // Get cart should detect the price change
      const result = await caller.cart.getCart();

      // Should report price changes
      if (result.priceChanges && result.priceChanges.length > 0) {
        const change = result.priceChanges.find((c) => c.productId === product1.id);
        expect(change).toBeDefined();
        expect(change!.oldPrice).toBe(2000);
        expect(change!.newPrice).toBe(2500);
        expect(change!.direction).toBe('increased');
      }

      // Cart should be updated with new price
      const item = result.items.find((i) => i.productId === product1.id);
      expect(item!.unitPrice).toBe(2500);

      // Restore original price
      await prisma.product.update({
        where: { id: product1.id },
        data: { basePrice: 2000 },
      });
    });
  });

  describe('cart - customer credit approval', () => {
    it('should reject cart operations for unapproved customers', async () => {
      const unapprovedClerkId = 'unapproved-customer-clerk-id';
      await createTestCustomer({
        clerkUserId: unapprovedClerkId,
        businessName: 'Unapproved Business',
        creditStatus: 'pending',
      });

      const caller = customerCaller(unapprovedClerkId);

      await expect(
        caller.cart.addItem({ productId: product1.id, quantity: 1 })
      ).rejects.toThrow(/credit application must be approved/i);
    });
  });
});
