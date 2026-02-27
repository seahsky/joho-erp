import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminCaller, customerCaller } from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { createTestProduct, createTestCustomer, createTestCustomerPricing } from '../../test-utils/factories';
import { getPrismaClient } from '@joho-erp/database';

describe('Pricing & Authorization', () => {
  const prisma = getPrismaClient();

  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  beforeAll(async () => {
    await cleanAllData();

    product = await createTestProduct({
      name: 'Pricing Test Product',
      sku: 'PRICE-TEST',
      basePrice: 5000, // $50.00
      currentStock: 100,
    });

    customer = await createTestCustomer({
      clerkUserId: 'pricing-customer-clerk-id',
      businessName: 'Pricing Test Business',
    });
  });

  afterAll(async () => {
    await cleanAllData();
  });

  describe('pricing.setCustomerPrice', () => {
    it('should create a new custom price for a customer-product pair', async () => {
      const caller = adminCaller();

      const result = await caller.pricing.setCustomerPrice({
        customerId: customer.id,
        productId: product.id,
        customPrice: 4000, // $40.00 in cents
        notes: 'Loyalty discount',
      });

      expect(result).toBeDefined();
      expect(result.customerId).toBe(customer.id);
      expect(result.productId).toBe(product.id);
      expect(result.customPrice).toBe(4000);

      // Clean up for subsequent tests
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id, productId: product.id },
      });
    });

    it('should update an existing custom price', async () => {
      const caller = adminCaller();

      // Create initial pricing
      await createTestCustomerPricing({
        customerId: customer.id,
        productId: product.id,
        customPrice: 4500,
      });

      // Update pricing
      const result = await caller.pricing.setCustomerPrice({
        customerId: customer.id,
        productId: product.id,
        customPrice: 3800, // Updated price
        notes: 'Updated discount',
      });

      expect(result.customPrice).toBe(3800);

      // Verify only one pricing record exists
      const count = await prisma.customerPricing.count({
        where: { customerId: customer.id, productId: product.id },
      });
      expect(count).toBe(1);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id, productId: product.id },
      });
    });

    it('should set pricing with date ranges', async () => {
      const caller = adminCaller();

      const effectiveFrom = new Date();
      const effectiveTo = new Date();
      effectiveTo.setMonth(effectiveTo.getMonth() + 3);

      const result = await caller.pricing.setCustomerPrice({
        customerId: customer.id,
        productId: product.id,
        customPrice: 4200,
        effectiveFrom,
        effectiveTo,
      });

      expect(result.effectiveFrom).toBeDefined();
      expect(result.effectiveTo).toBeDefined();

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id, productId: product.id },
      });
    });

    it('should reject pricing for non-existent customer', async () => {
      const caller = adminCaller();

      await expect(
        caller.pricing.setCustomerPrice({
          customerId: '000000000000000000000000',
          productId: product.id,
          customPrice: 4000,
        })
      ).rejects.toThrow(/not found/i);
    });

    it('should reject pricing for non-existent product', async () => {
      const caller = adminCaller();

      await expect(
        caller.pricing.setCustomerPrice({
          customerId: customer.id,
          productId: '000000000000000000000000',
          customPrice: 4000,
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('pricing.getCustomerPrices', () => {
    it('should return all custom prices for a customer', async () => {
      const caller = adminCaller();

      // Create pricing
      await createTestCustomerPricing({
        customerId: customer.id,
        productId: product.id,
        customPrice: 4300,
      });

      const result = await caller.pricing.getCustomerPrices({
        customerId: customer.id,
        includeExpired: false,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      const pricing = result.find((p) => p.productId === product.id);
      expect(pricing).toBeDefined();
      expect(pricing!.customPrice).toBe(4300);
      expect(pricing).toHaveProperty('isValid');
      expect(pricing).toHaveProperty('effectivePriceInfo');

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });

    it('should allow customer to view their own pricing', async () => {
      const caller = customerCaller('pricing-customer-clerk-id');

      // Create pricing for the customer
      await createTestCustomerPricing({
        customerId: customer.id,
        productId: product.id,
        customPrice: 4100,
      });

      const result = await caller.pricing.getCustomerPrices({
        customerId: customer.id,
        includeExpired: false,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });

    it('should prevent customer from viewing another customer pricing', async () => {
      const otherCustomer = await createTestCustomer({
        clerkUserId: 'other-customer-clerk-id',
        businessName: 'Other Business',
      });

      // Create pricing for the other customer
      await createTestCustomerPricing({
        customerId: otherCustomer.id,
        productId: product.id,
        customPrice: 3900,
      });

      // Caller is 'pricing-customer-clerk-id' trying to access other customer's pricing
      const caller = customerCaller('pricing-customer-clerk-id');

      await expect(
        caller.pricing.getCustomerPrices({
          customerId: otherCustomer.id,
          includeExpired: false,
        })
      ).rejects.toThrow(/forbidden|your own/i);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: otherCustomer.id },
      });
    });
  });

  describe('pricing.getAll', () => {
    it('should return paginated pricing list for admin', async () => {
      const caller = adminCaller();

      // Create some pricing records
      const product2 = await createTestProduct({ name: 'Pricing Product 2', basePrice: 3000 });
      await createTestCustomerPricing({ customerId: customer.id, productId: product.id, customPrice: 4000 });
      await createTestCustomerPricing({ customerId: customer.id, productId: product2.id, customPrice: 2500 });

      const result = await caller.pricing.getAll({
        page: 1,
        limit: 50,
        includeExpired: false,
      });

      expect(result).toHaveProperty('pricings');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(result.pricings.length).toBeGreaterThanOrEqual(2);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });

    it('should filter by customer', async () => {
      const caller = adminCaller();

      await createTestCustomerPricing({ customerId: customer.id, productId: product.id, customPrice: 4000 });

      const result = await caller.pricing.getAll({
        customerId: customer.id,
        page: 1,
        limit: 50,
        includeExpired: false,
      });

      for (const pricing of result.pricings) {
        expect(pricing.customerId).toBe(customer.id);
      }

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });

    it('should support search by product name', async () => {
      const caller = adminCaller();

      await createTestCustomerPricing({ customerId: customer.id, productId: product.id, customPrice: 4000 });

      const result = await caller.pricing.getAll({
        search: 'Pricing Test Product',
        page: 1,
        limit: 50,
        includeExpired: false,
      });

      expect(result.pricings.length).toBeGreaterThanOrEqual(1);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });
  });

  describe('pricing.getCustomerProductPrice', () => {
    it('should return effective price for a customer-product pair', async () => {
      const caller = adminCaller();

      // Create custom pricing
      await createTestCustomerPricing({
        customerId: customer.id,
        productId: product.id,
        customPrice: 4200,
      });

      const result = await caller.pricing.getCustomerProductPrice({
        customerId: customer.id,
        productId: product.id,
      });

      expect(result).toHaveProperty('effectivePrice');
      expect(result).toHaveProperty('hasCustomPricing');
      expect(result).toHaveProperty('basePrice');
      expect(result.hasCustomPricing).toBe(true);
      expect(result.effectivePrice).toBe(4200);
      expect(result.basePrice).toBe(5000);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });

    it('should return base price when no custom pricing exists', async () => {
      const caller = adminCaller();

      const result = await caller.pricing.getCustomerProductPrice({
        customerId: customer.id,
        productId: product.id,
      });

      expect(result.hasCustomPricing).toBe(false);
      expect(result.effectivePrice).toBe(5000); // basePrice
    });

    it('should prevent customer from querying another customer pricing', async () => {
      const otherCustomer = await createTestCustomer({
        clerkUserId: 'other-price-check-clerk-id',
        businessName: 'Other Price Check Business',
      });

      const caller = customerCaller('pricing-customer-clerk-id');

      await expect(
        caller.pricing.getCustomerProductPrice({
          customerId: otherCustomer.id,
          productId: product.id,
        })
      ).rejects.toThrow(/forbidden|your own/i);
    });
  });

  describe('pricing.deleteCustomerPrice', () => {
    it('should delete custom pricing', async () => {
      const caller = adminCaller();

      const pricing = await createTestCustomerPricing({
        customerId: customer.id,
        productId: product.id,
        customPrice: 3500,
      });

      const result = await caller.pricing.deleteCustomerPrice({
        pricingId: pricing.id,
      });

      expect(result.success).toBe(true);

      // Verify pricing was deleted
      const deletedPricing = await prisma.customerPricing.findUnique({
        where: { id: pricing.id },
      });
      expect(deletedPricing).toBeNull();
    });

    it('should reject deleting non-existent pricing', async () => {
      const caller = adminCaller();

      await expect(
        caller.pricing.deleteCustomerPrice({
          pricingId: '000000000000000000000000',
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('pricing.getCustomerPricingStats', () => {
    it('should return pricing statistics for a customer', async () => {
      const caller = adminCaller();

      // Create a couple of pricing records
      await createTestCustomerPricing({ customerId: customer.id, productId: product.id, customPrice: 4000 });

      const result = await caller.pricing.getCustomerPricingStats({
        customerId: customer.id,
      });

      expect(result).toHaveProperty('totalProducts');
      expect(result).toHaveProperty('activeProducts');
      expect(result).toHaveProperty('expiredProducts');
      expect(result).toHaveProperty('averageSavings');
      expect(result).toHaveProperty('totalPotentialSavings');
      expect(result.totalProducts).toBeGreaterThanOrEqual(1);

      // basePrice = 5000, customPrice = 4000 -> savings = 1000 cents
      expect(result.totalPotentialSavings).toBeGreaterThanOrEqual(1000);

      // Clean up
      await prisma.customerPricing.deleteMany({
        where: { customerId: customer.id },
      });
    });
  });
});
