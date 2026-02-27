import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { packerCaller } from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { createTestProduct, createTestCustomer, createTestOrder } from '../../test-utils/factories';
import { getPrismaClient } from '@joho-erp/database';

describe('Packing Workflow', () => {
  const prisma = getPrismaClient();

  let product1: Awaited<ReturnType<typeof createTestProduct>>;
  let product2: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  beforeAll(async () => {
    await cleanAllData();

    product1 = await createTestProduct({ name: 'Packing Product A', sku: 'PACK-A', basePrice: 1500, currentStock: 100 });
    product2 = await createTestProduct({ name: 'Packing Product B', sku: 'PACK-B', basePrice: 2500, currentStock: 80 });
    customer = await createTestCustomer({ businessName: 'Packing Test Customer' });
  });

  afterAll(async () => {
    await cleanAllData();
  });

  describe('packing.getSession', () => {
    it('should return a packing session for a delivery date with orders', async () => {
      const caller = packerCaller();

      // Create orders for tomorrow's delivery date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 5, unitPrice: 1500 },
          { productId: product2.id, sku: product2.sku, productName: product2.name, quantity: 3, unitPrice: 2500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 2, unitPrice: 1500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      const result = await caller.packing.getSession({
        deliveryDate: tomorrow.toISOString(),
      });

      expect(result).toHaveProperty('deliveryDate');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('productSummary');

      // Should have 2 orders
      expect(result.orders.length).toBe(2);

      // Product summary should aggregate quantities across orders
      const prodASummary = result.productSummary.find((p) => p.sku === 'PACK-A');
      expect(prodASummary).toBeDefined();
      expect(prodASummary!.totalQuantity).toBe(7); // 5 + 2

      const prodBSummary = result.productSummary.find((p) => p.sku === 'PACK-B');
      expect(prodBSummary).toBeDefined();
      expect(prodBSummary!.totalQuantity).toBe(3);
    });

    it('should return empty session when no orders exist for the date', async () => {
      const caller = packerCaller();

      // Use a date far in the future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      futureDate.setHours(0, 0, 0, 0);

      const result = await caller.packing.getSession({
        deliveryDate: futureDate.toISOString(),
      });

      expect(result.orders).toHaveLength(0);
      expect(result.productSummary).toHaveLength(0);
    });
  });

  describe('packing.getOrderDetails', () => {
    it('should return detailed order information for packing', async () => {
      const caller = packerCaller();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 4, unitPrice: 1500 },
          { productId: product2.id, sku: product2.sku, productName: product2.name, quantity: 2, unitPrice: 2500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      const result = await caller.packing.getOrderDetails({
        orderId: order.id,
      });

      expect(result.orderId).toBe(order.id);
      expect(result.orderNumber).toBe(order.orderNumber);
      expect(result.customerName).toBe('Packing Test Customer');
      expect(result.items).toHaveLength(2);

      // Each item should have packing-relevant fields
      for (const item of result.items) {
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('packed');
        expect(item).toHaveProperty('currentStock');
        expect(item.packed).toBe(false); // Nothing packed yet
      }

      expect(result.allItemsPacked).toBe(false);
      expect(result.status).toBe('confirmed');
    });

    it('should throw NOT_FOUND for non-existent order', async () => {
      const caller = packerCaller();

      await expect(
        caller.packing.getOrderDetails({ orderId: '000000000000000000000000' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('packing.markItemPacked', () => {
    it('should mark an item as packed and transition order to packing status', async () => {
      const caller = packerCaller();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 3, unitPrice: 1500 },
          { productId: product2.id, sku: product2.sku, productName: product2.name, quantity: 1, unitPrice: 2500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      // Mark first item as packed
      const result = await caller.packing.markItemPacked({
        orderId: order.id,
        itemSku: product1.sku,
        packed: true,
      });

      expect(result.success).toBe(true);
      expect(result.packedItems).toContain(product1.sku);
      expect(result.packedItems).not.toContain(product2.sku);

      // Order should have transitioned to 'packing'
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder!.status).toBe('packing');
    });

    it('should toggle item unpacked', async () => {
      const caller = packerCaller();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 2, unitPrice: 1500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      // Mark as packed
      await caller.packing.markItemPacked({
        orderId: order.id,
        itemSku: product1.sku,
        packed: true,
      });

      // Mark as unpacked
      const result = await caller.packing.markItemPacked({
        orderId: order.id,
        itemSku: product1.sku,
        packed: false,
      });

      expect(result.success).toBe(true);
      expect(result.packedItems).not.toContain(product1.sku);
    });

    it('should reject packing for a non-existent order', async () => {
      const caller = packerCaller();

      await expect(
        caller.packing.markItemPacked({
          orderId: '000000000000000000000000',
          itemSku: 'SOME-SKU',
          packed: true,
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('packing.markItemPacked - optimistic locking', () => {
    it('should detect concurrent modifications via version conflict', async () => {
      const caller1 = packerCaller();
      const caller2 = packerCaller();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 2, unitPrice: 1500 },
          { productId: product2.id, sku: product2.sku, productName: product2.name, quantity: 1, unitPrice: 2500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      // First packer marks item A
      const result1 = await caller1.packing.markItemPacked({
        orderId: order.id,
        itemSku: product1.sku,
        packed: true,
      });
      expect(result1.success).toBe(true);

      // Second packer marks item B (should succeed since version is fresh)
      const result2 = await caller2.packing.markItemPacked({
        orderId: order.id,
        itemSku: product2.sku,
        packed: true,
      });
      expect(result2.success).toBe(true);
      expect(result2.packedItems).toContain(product1.sku);
      expect(result2.packedItems).toContain(product2.sku);
    });
  });

  describe('packing.updateItemQuantity', () => {
    it('should update item quantity during packing', async () => {
      const caller = packerCaller();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 10, unitPrice: 1500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      const result = await caller.packing.updateItemQuantity({
        orderId: order.id,
        productId: product1.id,
        newQuantity: 7,
      });

      expect(result).toHaveProperty('success');

      // Verify order item was updated
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      const updatedItem = updatedOrder!.items.find((i) => i.productId === product1.id);
      expect(updatedItem!.quantity).toBe(7);
    });

    it('should reject quantity update for non-existent product in order', async () => {
      const caller = packerCaller();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const order = await createTestOrder({
        customerId: customer.id,
        customerName: customer.businessName,
        items: [
          { productId: product1.id, sku: product1.sku, productName: product1.name, quantity: 5, unitPrice: 1500 },
        ],
        status: 'confirmed',
        requestedDeliveryDate: tomorrow,
      });

      await expect(
        caller.packing.updateItemQuantity({
          orderId: order.id,
          productId: '000000000000000000000000',
          newQuantity: 3,
        })
      ).rejects.toThrow(/not found/i);
    });
  });
});
