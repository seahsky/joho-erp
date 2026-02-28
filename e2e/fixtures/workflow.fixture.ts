import { test as baseTest } from './base.fixture';
import { getPrismaClient } from '@joho-erp/database';
import {
  createTestProductWithBatches,
  createTestCustomer,
  createTestOrder,
} from './factories';

type WorkflowProduct = Awaited<ReturnType<typeof createTestProductWithBatches>>;

type WorkflowData = {
  products: WorkflowProduct[];
  customer: Awaited<ReturnType<typeof createTestCustomer>>;
  orders: {
    awaitingApproval: Awaited<ReturnType<typeof createTestOrder>>;
    confirmed: Awaited<ReturnType<typeof createTestOrder>>;
    readyForDelivery: Awaited<ReturnType<typeof createTestOrder>>;
  };
  /** Tomorrow as a Date object (used for delivery dates) */
  deliveryDate: Date;
};

export type WorkflowFixtures = {
  workflowData: WorkflowData;
};

export const test = baseTest.extend<WorkflowFixtures>({
  workflowData: async ({}, use) => {
    const prisma = getPrismaClient();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Create 2 products with inventory batches (required for stock consumption at markOrderReady)
    const products = [
      await createTestProductWithBatches(
        {
          name: 'E2E Workflow Beef',
          category: 'Beef',
          basePrice: 2500,
          sku: `E2E-WF-BEEF-${Date.now()}`,
          currentStock: 100,
        },
        [{ quantity: 100, costPerUnit: 1200 }]
      ),
      await createTestProductWithBatches(
        {
          name: 'E2E Workflow Pork',
          category: 'Pork',
          basePrice: 1800,
          sku: `E2E-WF-PORK-${Date.now()}`,
          currentStock: 50,
        },
        [{ quantity: 50, costPerUnit: 900 }]
      ),
    ];

    // 1 customer with high credit limit ($100,000 = 10,000,000 cents)
    const customer = await createTestCustomer({
      businessName: `E2E Workflow Restaurant ${Date.now()}`,
      creditLimit: 10_000_000,
    });

    // 3 orders at different lifecycle stages
    const awaitingApproval = await createTestOrder({
      customerId: customer.id,
      customerName: customer.businessName,
      status: 'awaiting_approval',
      items: [
        {
          productId: products[0].product.id,
          sku: products[0].product.sku,
          productName: products[0].product.name,
          quantity: 5,
          unitPrice: products[0].product.basePrice,
        },
      ],
      requestedDeliveryDate: tomorrow,
    });

    const confirmed = await createTestOrder({
      customerId: customer.id,
      customerName: customer.businessName,
      status: 'confirmed',
      items: [
        {
          productId: products[0].product.id,
          sku: products[0].product.sku,
          productName: products[0].product.name,
          quantity: 3,
          unitPrice: products[0].product.basePrice,
        },
        {
          productId: products[1].product.id,
          sku: products[1].product.sku,
          productName: products[1].product.name,
          quantity: 2,
          unitPrice: products[1].product.basePrice,
        },
      ],
      requestedDeliveryDate: tomorrow,
    });

    const readyForDelivery = await createTestOrder({
      customerId: customer.id,
      customerName: customer.businessName,
      status: 'ready_for_delivery',
      items: [
        {
          productId: products[1].product.id,
          sku: products[1].product.sku,
          productName: products[1].product.name,
          quantity: 4,
          unitPrice: products[1].product.basePrice,
        },
      ],
      requestedDeliveryDate: tomorrow,
    });

    await use({
      products,
      customer,
      orders: { awaitingApproval, confirmed, readyForDelivery },
      deliveryDate: tomorrow,
    });

    // Cleanup in reverse dependency order
    const orderIds = [awaitingApproval.id, confirmed.id, readyForDelivery.id];

    // Delete batch consumptions first
    const batchIds = products.flatMap((p) => p.batches.map((b) => b.id));
    await prisma.batchConsumption.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          { batchId: { in: batchIds } },
        ],
      },
    });

    // Delete inventory transactions (referenceId links to orders)
    await prisma.inventoryTransaction.deleteMany({
      where: {
        OR: [
          { referenceId: { in: orderIds } },
          { productId: { in: products.map((p) => p.product.id) } },
        ],
      },
    });

    // Delete orders
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

    // Delete inventory batches
    for (const p of products) {
      await prisma.inventoryBatch.deleteMany({ where: { productId: p.product.id } });
    }

    // Delete customer
    await prisma.customer.deleteMany({ where: { id: customer.id } });

    // Delete products
    await prisma.product.deleteMany({
      where: { id: { in: products.map((p) => p.product.id) } },
    });
  },
});

export { expect } from '@playwright/test';
