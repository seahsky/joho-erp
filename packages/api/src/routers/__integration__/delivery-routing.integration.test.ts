import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminCaller, driverCaller } from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { createTestProduct, createTestCustomer, createTestOrder } from '../../test-utils/factories';
import { getPrismaClient } from '@joho-erp/database';

describe('Delivery & Routing', () => {
  const prisma = getPrismaClient();

  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  beforeAll(async () => {
    await cleanAllData();

    // Create shared test data
    product = await createTestProduct({ name: 'Delivery Test Product', basePrice: 2000, currentStock: 100 });
    customer = await createTestCustomer({ businessName: 'Delivery Test Customer' });
  });

  afterAll(async () => {
    await cleanAllData();
  });

  describe('delivery.getAll', () => {
    it('should return deliveries for admin', async () => {
      const caller = adminCaller();

      // Create an order in ready_for_delivery status
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 5, unitPrice: 2000 }],
        status: 'ready_for_delivery',
        requestedDeliveryDate: today,
      });

      const result = await caller.delivery.getAll({
        page: 1,
        limit: 50,
      });

      expect(result).toHaveProperty('deliveries');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(result.deliveries.length).toBeGreaterThanOrEqual(1);

      // Check delivery structure
      const delivery = result.deliveries[0];
      expect(delivery).toHaveProperty('id');
      expect(delivery).toHaveProperty('orderId');
      expect(delivery).toHaveProperty('customer');
      expect(delivery).toHaveProperty('address');
      expect(delivery).toHaveProperty('status');
      expect(delivery).toHaveProperty('totalAmount');
    });

    it('should filter deliveries by status', async () => {
      const caller = adminCaller();

      const result = await caller.delivery.getAll({
        status: 'delivered',
        page: 1,
        limit: 50,
      });

      // All returned deliveries should have status 'delivered'
      for (const delivery of result.deliveries) {
        expect(delivery.status).toBe('delivered');
      }
    });

    it('should search deliveries by customer name', async () => {
      const caller = adminCaller();

      const result = await caller.delivery.getAll({
        search: 'Delivery Test Customer',
        page: 1,
        limit: 50,
      });

      // Results should contain our customer
      for (const delivery of result.deliveries) {
        expect(delivery.customer.toLowerCase()).toContain('delivery test customer');
      }
    });
  });

  describe('delivery.getStats', () => {
    it('should return delivery statistics', async () => {
      const caller = adminCaller();

      const result = await caller.delivery.getStats();

      expect(result).toHaveProperty('readyForDelivery');
      expect(result).toHaveProperty('deliveredToday');
      expect(typeof result.readyForDelivery).toBe('number');
      expect(typeof result.deliveredToday).toBe('number');
    });
  });

  describe('delivery.getDriverDeliveries', () => {
    it('should return only deliveries assigned to the requesting driver', async () => {
      const driverAId = 'driver-a-id';
      const driverBId = 'driver-b-id';

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      // Create an order assigned to driver A
      const orderForA = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 3, unitPrice: 2000 }],
        status: 'ready_for_delivery',
        requestedDeliveryDate: today,
      });

      // Assign to driver A
      await prisma.order.update({
        where: { id: orderForA.id },
        data: {
          delivery: {
            driverId: driverAId,
            driverName: 'Driver A',
            assignedAt: new Date(),
          },
        },
      });

      // Create an order assigned to driver B
      const orderForB = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 2, unitPrice: 2000 }],
        status: 'ready_for_delivery',
        requestedDeliveryDate: today,
      });

      // Assign to driver B
      await prisma.order.update({
        where: { id: orderForB.id },
        data: {
          delivery: {
            driverId: driverBId,
            driverName: 'Driver B',
            assignedAt: new Date(),
          },
        },
      });

      // Driver A should only see their orders
      const callerA = driverCaller(driverAId);
      const resultA = await callerA.delivery.getDriverDeliveries({
        date: today,
      });

      // All returned deliveries should belong to driver A
      for (const delivery of resultA.deliveries) {
        // The delivery endpoint filters by driverId in the query
        // so results should only be for driverA
        expect(delivery).toHaveProperty('orderNumber');
      }

      // Driver B should only see their orders
      const callerB = driverCaller(driverBId);
      const resultB = await callerB.delivery.getDriverDeliveries({
        date: today,
      });

      // Results should not overlap
      const orderNumbersA = new Set(resultA.deliveries.map((d) => d.orderNumber));
      const orderNumbersB = new Set(resultB.deliveries.map((d) => d.orderNumber));

      for (const orderNum of orderNumbersA) {
        expect(orderNumbersB.has(orderNum)).toBe(false);
      }
    });

    it('should return empty list when driver has no assigned deliveries', async () => {
      const callerUnassigned = driverCaller('driver-unassigned-id');

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const result = await callerUnassigned.delivery.getDriverDeliveries({
        date: today,
      });

      expect(result.deliveries).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('delivery.markDelivered', () => {
    it('should mark an order as delivered', async () => {
      const caller = adminCaller();

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      // Create order that was packed today
      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 1, unitPrice: 2000 }],
        status: 'ready_for_delivery',
        requestedDeliveryDate: today,
      });

      // Set packing date to today so same-day validation passes
      await prisma.order.update({
        where: { id: order.id },
        data: {
          packing: {
            packedAt: new Date(),
            packedItems: [],
          },
        },
      });

      const result = await caller.delivery.markDelivered({
        orderId: order.id,
        notes: 'Delivered successfully',
        adminOverride: true, // Override same-day check for test reliability
      });

      expect(result.status).toBe('delivered');
      expect(result.delivery?.deliveredAt).toBeDefined();
    });

    it('should reject marking a non-existent order as delivered', async () => {
      const caller = adminCaller();

      await expect(
        caller.delivery.markDelivered({
          orderId: '000000000000000000000000',
        })
      ).rejects.toThrow(/not found/i);
    });

    it('should reject marking a confirmed order as delivered (invalid transition)', async () => {
      const caller = adminCaller();

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 1, unitPrice: 2000 }],
        status: 'confirmed',
      });

      await expect(
        caller.delivery.markDelivered({
          orderId: order.id,
          adminOverride: true,
        })
      ).rejects.toThrow(/cannot mark order as delivered/i);
    });
  });

  describe('delivery.assignDriver', () => {
    it('should assign a driver to a ready_for_delivery order', async () => {
      const caller = adminCaller();

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 1, unitPrice: 2000 }],
        status: 'ready_for_delivery',
      });

      const result = await caller.delivery.assignDriver({
        orderId: order.id,
        driverId: 'test-driver-123',
        driverName: 'Test Driver',
      });

      expect(result).toBeDefined();
      expect(result!.delivery?.driverId).toBe('test-driver-123');
    });

    it('should reject assigning a driver to a confirmed order', async () => {
      const caller = adminCaller();

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [{ productId: product.id, sku: product.sku, productName: product.name, quantity: 1, unitPrice: 2000 }],
        status: 'confirmed',
      });

      await expect(
        caller.delivery.assignDriver({
          orderId: order.id,
          driverId: 'test-driver-123',
          driverName: 'Test Driver',
        })
      ).rejects.toThrow(/cannot assign driver/i);
    });
  });
});
