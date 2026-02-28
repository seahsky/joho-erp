import { test as baseTest } from './base.fixture';
import { getPrismaClient } from '@joho-erp/database';
import {
  createTestProduct,
  createTestCustomer,
  createTestOrder,
  createTestSupplier,
} from './factories';

type SeededData = {
  products: Awaited<ReturnType<typeof createTestProduct>>[];
  customers: Awaited<ReturnType<typeof createTestCustomer>>[];
  suppliers: Awaited<ReturnType<typeof createTestSupplier>>[];
  orders: Awaited<ReturnType<typeof createTestOrder>>[];
};

export type DataFixtures = {
  seededData: SeededData;
};

export const test = baseTest.extend<DataFixtures>({
  seededData: async ({}, use) => {
    const prisma = getPrismaClient();

    // Seed test data
    const products = [
      await createTestProduct({ name: 'E2E Beef Brisket', category: 'Beef', basePrice: 2500, sku: `E2E-BEEF-${Date.now()}` }),
      await createTestProduct({ name: 'E2E Pork Belly', category: 'Pork', basePrice: 1800, sku: `E2E-PORK-${Date.now()}` }),
      await createTestProduct({ name: 'E2E Chicken Breast', category: 'Chicken', basePrice: 1200, sku: `E2E-CHKN-${Date.now()}` }),
    ];

    const customers = [
      await createTestCustomer({ businessName: 'E2E Restaurant Alpha' }),
      await createTestCustomer({ businessName: 'E2E Restaurant Beta' }),
    ];

    const suppliers = [
      await createTestSupplier({ businessName: 'E2E Meat Supplier' }),
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = [
      await createTestOrder({
        customerId: customers[0].id,
        customerName: 'E2E Restaurant Alpha',
        status: 'awaiting_approval',
        items: [{
          productId: products[0].id,
          sku: products[0].sku,
          productName: products[0].name,
          quantity: 5,
          unitPrice: products[0].basePrice,
        }],
        requestedDeliveryDate: tomorrow,
      }),
      await createTestOrder({
        customerId: customers[1].id,
        customerName: 'E2E Restaurant Beta',
        status: 'confirmed',
        items: [{
          productId: products[1].id,
          sku: products[1].sku,
          productName: products[1].name,
          quantity: 10,
          unitPrice: products[1].basePrice,
        }],
        requestedDeliveryDate: tomorrow,
      }),
    ];

    await use({ products, customers, suppliers, orders });

    // Cleanup seeded data after test
    for (const order of orders) {
      await prisma.order.deleteMany({ where: { id: order.id } });
    }
    for (const customer of customers) {
      await prisma.customer.deleteMany({ where: { id: customer.id } });
    }
    for (const supplier of suppliers) {
      await prisma.supplier.deleteMany({ where: { id: supplier.id } });
    }
    for (const product of products) {
      await prisma.product.deleteMany({ where: { id: product.id } });
    }
  },
});

export { expect } from '@playwright/test';
