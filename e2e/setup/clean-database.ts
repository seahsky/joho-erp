import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

import { getPrismaClient, disconnectPrisma } from '@joho-erp/database';

async function cleanDatabase() {
  const mongoUri = process.env.MONGODB_URI || '';

  if (!mongoUri.includes('e2e')) {
    throw new Error(
      `MONGODB_URI safety check failed: URI must contain "e2e".\nCurrent URI: ${mongoUri}`
    );
  }

  console.log('[E2E Clean] Cleaning database...');
  const prisma = getPrismaClient();

  await prisma.batchConsumption.deleteMany();
  await prisma.inventoryBatch.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.packingSession.deleteMany();
  await prisma.routeOptimization.deleteMany();
  await prisma.xeroSyncJob.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerPricing.deleteMany();
  await prisma.productSupplier.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.company.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.driverAreaAssignment.deleteMany();
  await prisma.suburbAreaMapping.deleteMany();
  await prisma.area.deleteMany();
  await prisma.category.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.rolePermission.deleteMany();

  await disconnectPrisma();
  console.log('[E2E Clean] Database cleaned successfully.');
}

cleanDatabase().catch(console.error);
