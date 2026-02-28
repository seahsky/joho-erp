import { test as baseTest } from './base.fixture';
import { getPrismaClient } from '@joho-erp/database';
import {
  createTestProductWithBatches,
  createTestCustomer,
  createTestOrder,
} from './factories';

type SettingsProduct = Awaited<ReturnType<typeof createTestProductWithBatches>>;

type SettingsData = {
  product: SettingsProduct;
  customer: Awaited<ReturnType<typeof createTestCustomer>>;
  /** An order at ready_for_delivery status for the driver page */
  deliveryOrder: Awaited<ReturnType<typeof createTestOrder>>;
  deliveryDate: Date;
};

export type SettingsFixtures = {
  settingsData: SettingsData;
};

export const test = baseTest.extend<SettingsFixtures>({
  settingsData: async ({}, use) => {
    const prisma = getPrismaClient();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Create a product with inventory (needed for ready_for_delivery orders)
    const product = await createTestProductWithBatches(
      {
        name: 'E2E Driver Delivery Beef',
        category: 'Beef',
        basePrice: 3000,
        sku: `E2E-DRV-BEEF-${Date.now()}`,
        currentStock: 50,
      },
      [{ quantity: 50, costPerUnit: 1500 }]
    );

    // Create a customer
    const customer = await createTestCustomer({
      businessName: `E2E Driver Test Restaurant ${Date.now()}`,
      creditLimit: 5_000_000,
    });

    // Create an order at ready_for_delivery status
    const deliveryOrder = await createTestOrder({
      customerId: customer.id,
      customerName: customer.businessName,
      status: 'ready_for_delivery',
      items: [
        {
          productId: product.product.id,
          sku: product.product.sku,
          productName: product.product.name,
          quantity: 3,
          unitPrice: product.product.basePrice,
        },
      ],
      requestedDeliveryDate: tomorrow,
    });

    await use({
      product,
      customer,
      deliveryOrder,
      deliveryDate: tomorrow,
    });

    // Cleanup in reverse dependency order
    const batchIds = product.batches.map((b) => b.id);
    await prisma.batchConsumption.deleteMany({
      where: {
        OR: [
          { orderId: deliveryOrder.id },
          { batchId: { in: batchIds } },
        ],
      },
    });

    await prisma.inventoryTransaction.deleteMany({
      where: {
        OR: [
          { referenceId: deliveryOrder.id },
          { productId: product.product.id },
        ],
      },
    });

    await prisma.order.deleteMany({ where: { id: deliveryOrder.id } });
    await prisma.inventoryBatch.deleteMany({ where: { productId: product.product.id } });
    await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.product.deleteMany({ where: { id: product.product.id } });
  },
});

export { expect } from '@playwright/test';
