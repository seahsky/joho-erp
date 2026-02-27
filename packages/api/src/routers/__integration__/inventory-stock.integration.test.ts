import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminCaller } from '../../test-utils/create-test-caller';
import { cleanAllData } from '../../test-utils/db-helpers';
import { createTestProduct, createTestProductWithBatches, createTestSupplier } from '../../test-utils/factories';
import { getPrismaClient } from '@joho-erp/database';

describe('Inventory & Stock Management', () => {
  const prisma = getPrismaClient();

  beforeAll(async () => {
    await cleanAllData();
  });

  afterAll(async () => {
    await cleanAllData();
  });

  describe('inventory.getProductBatches', () => {
    it('should return batches for a product', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { product } = await createTestProductWithBatches(
        { name: 'Batch Product', currentStock: 50 },
        [
          { supplierId: supplier.id, quantity: 30, costPerUnit: 1000 },
          { supplierId: supplier.id, quantity: 20, costPerUnit: 1200 },
        ]
      );

      const result = await caller.inventory.getProductBatches({
        productId: product.id,
        includeConsumed: false,
      });

      expect(result).toHaveLength(2);
      expect(result[0].quantityRemaining).toBe(30);
      expect(result[1].quantityRemaining).toBe(20);
      // Each batch should have computed fields
      expect(result[0]).toHaveProperty('totalValue');
      expect(result[0]).toHaveProperty('utilizationRate');
      expect(result[0]).toHaveProperty('daysUntilExpiry');
    });
  });

  describe('inventory.getBatchById', () => {
    it('should return a single batch with full details', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { product, batches } = await createTestProductWithBatches(
        { name: 'Single Batch Product', currentStock: 25 },
        [{ supplierId: supplier.id, quantity: 25, costPerUnit: 800 }]
      );

      const result = await caller.inventory.getBatchById({
        batchId: batches[0].id,
      });

      expect(result).not.toBeNull();
      expect(result!.productId).toBe(product.id);
      expect(result!.quantityRemaining).toBe(25);
      expect(result!.costPerUnit).toBe(800);
      // totalValue = costPerUnit * quantityRemaining = 800 * 25 = 20000
      expect(result!.totalValue).toBe(20000);
      // utilizationRate = (initial - remaining) / initial * 100 = 0%
      expect(result!.utilizationRate).toBe(0);
    });

    it('should return null for non-existent batch', async () => {
      const caller = adminCaller();

      const result = await caller.inventory.getBatchById({
        batchId: '000000000000000000000000',
      });

      expect(result).toBeNull();
    });
  });

  describe('inventory.updateBatchQuantity', () => {
    it('should increase batch quantity and update product stock', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { product, batches } = await createTestProductWithBatches(
        { name: 'Adjust Product', currentStock: 50 },
        [{ supplierId: supplier.id, quantity: 50, costPerUnit: 900 }]
      );

      const result = await caller.inventory.updateBatchQuantity({
        batchId: batches[0].id,
        newQuantity: 70, // increase by 20
      });

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(70);

      // Verify product stock was updated (50 + 20 = 70)
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct!.currentStock).toBe(70);

      // Verify inventory transaction was recorded
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(transactions.length).toBeGreaterThanOrEqual(1);
      expect(transactions[0].type).toBe('adjustment');
      expect(transactions[0].adjustmentType).toBe('stock_count_correction');
      expect(transactions[0].quantity).toBe(20);
      expect(transactions[0].previousStock).toBe(50);
      expect(transactions[0].newStock).toBe(70);
    });

    it('should decrease batch quantity and update product stock', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { product, batches } = await createTestProductWithBatches(
        { name: 'Decrease Product', currentStock: 40 },
        [{ supplierId: supplier.id, quantity: 40, costPerUnit: 950 }]
      );

      const result = await caller.inventory.updateBatchQuantity({
        batchId: batches[0].id,
        newQuantity: 25, // decrease by 15
      });

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(25);

      // Verify product stock was updated (40 - 15 = 25)
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct!.currentStock).toBe(25);
    });

    it('should reject batch quantity change that would make product stock negative', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();

      // Create a product with currentStock = 10 but batch has quantity 30
      // This simulates a scenario where stock was partially consumed elsewhere
      const product = await createTestProduct({ name: 'Negative Stock Product', currentStock: 10 });
      const batch = await prisma.inventoryBatch.create({
        data: {
          productId: product.id,
          supplierId: supplier.id,
          initialQuantity: 30,
          quantityRemaining: 30,
          costPerUnit: 500,
          receivedAt: new Date(),
        },
      });

      // Trying to reduce batch from 30 to 0 would decrease product stock by 30,
      // but product only has 10 stock -> would go to -20
      await expect(
        caller.inventory.updateBatchQuantity({
          batchId: batch.id,
          newQuantity: 0,
        })
      ).rejects.toThrow(/below zero/i);
    });

    it('should mark batch as consumed when quantity is set to zero', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { batches } = await createTestProductWithBatches(
        { name: 'Zero Out Product', currentStock: 15 },
        [{ supplierId: supplier.id, quantity: 15, costPerUnit: 700 }]
      );

      const result = await caller.inventory.updateBatchQuantity({
        batchId: batches[0].id,
        newQuantity: 0,
      });

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(0);

      // Verify batch is marked consumed
      const updatedBatch = await prisma.inventoryBatch.findUnique({
        where: { id: batches[0].id },
      });
      expect(updatedBatch!.isConsumed).toBe(true);
      expect(updatedBatch!.quantityRemaining).toBe(0);
    });
  });

  describe('inventory.markBatchConsumed', () => {
    it('should write off entire batch and reduce product stock', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { product, batches } = await createTestProductWithBatches(
        { name: 'Writeoff Product', currentStock: 20 },
        [{ supplierId: supplier.id, quantity: 20, costPerUnit: 600 }]
      );

      const result = await caller.inventory.markBatchConsumed({
        batchId: batches[0].id,
        reason: 'Expired goods',
      });

      expect(result.success).toBe(true);

      // Verify batch is consumed
      const updatedBatch = await prisma.inventoryBatch.findUnique({
        where: { id: batches[0].id },
      });
      expect(updatedBatch!.isConsumed).toBe(true);
      expect(updatedBatch!.quantityRemaining).toBe(0);

      // Verify product stock is reduced to 0
      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct!.currentStock).toBe(0);

      // Verify inventory transaction was recorded
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { productId: product.id, adjustmentType: 'stock_write_off' },
      });
      expect(transactions.length).toBeGreaterThanOrEqual(1);
      expect(transactions[0].quantity).toBe(-20);
      expect(transactions[0].notes).toContain('Expired goods');
    });

    it('should reject consuming an already consumed batch', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();
      const { batches } = await createTestProductWithBatches(
        { name: 'Already Consumed Product', currentStock: 10 },
        [{ supplierId: supplier.id, quantity: 10, costPerUnit: 500 }]
      );

      // First consume
      await caller.inventory.markBatchConsumed({ batchId: batches[0].id });

      // Second consume should fail
      await expect(
        caller.inventory.markBatchConsumed({ batchId: batches[0].id })
      ).rejects.toThrow(/already consumed/i);
    });

    it('should reject when product stock is insufficient to cover batch remaining', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();

      // Product stock = 5, but batch remaining = 20
      const product = await createTestProduct({ name: 'Insufficient Stock Product', currentStock: 5 });
      const batch = await prisma.inventoryBatch.create({
        data: {
          productId: product.id,
          supplierId: supplier.id,
          initialQuantity: 20,
          quantityRemaining: 20,
          costPerUnit: 500,
          receivedAt: new Date(),
        },
      });

      await expect(
        caller.inventory.markBatchConsumed({ batchId: batch.id })
      ).rejects.toThrow(/insufficient stock/i);
    });
  });

  describe('inventory.getExpiringBatches', () => {
    it('should return batches that are expiring soon', async () => {
      const caller = adminCaller();
      const supplier = await createTestSupplier();

      // Create a batch expiring in 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      await createTestProductWithBatches(
        { name: 'Expiring Product', currentStock: 10 },
        [{ supplierId: supplier.id, quantity: 10, costPerUnit: 500, expiryDate: threeDaysFromNow }]
      );

      const result = await caller.inventory.getExpiringBatches({
        page: 1,
        pageSize: 25,
        sortBy: 'expiryDate',
        sortDirection: 'asc',
        statusFilter: 'all',
      });

      expect(result).toHaveProperty('batches');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('summary');
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('inventory.export.getData', () => {
    it('should return overview data with summary and categories', async () => {
      const caller = adminCaller();

      // Create some test products
      await createTestProduct({ name: 'Export Test Product', currentStock: 50 });

      const result = await caller.inventory.export.getData({
        tab: 'overview',
        useCurrentFilters: false,
      });

      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalProducts');
      expect(result.summary).toHaveProperty('totalValue');
      expect(result.summary).toHaveProperty('lowStockCount');
      expect(result.summary).toHaveProperty('outOfStockCount');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('transactions');
    });

    it('should return trends data', async () => {
      const caller = adminCaller();

      const result = await caller.inventory.export.getData({
        tab: 'trends',
        useCurrentFilters: false,
      });

      expect(result).toHaveProperty('stockMovement');
      expect(result).toHaveProperty('inventoryValue');
      expect(result).toHaveProperty('granularity');
    });

    it('should return comparison data', async () => {
      const caller = adminCaller();

      const result = await caller.inventory.export.getData({
        tab: 'comparison',
        useCurrentFilters: false,
      });

      expect(result).toHaveProperty('comparisonType');
      expect(result).toHaveProperty('stockIn');
      expect(result).toHaveProperty('stockOut');
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('netMovement');
    });
  });
});
