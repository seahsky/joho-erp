import dotenv from 'dotenv';
import path from 'path';

// Load env before any other imports that might need it
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });

import { getPrismaClient } from '@joho-erp/database';
import { seedPermissions } from './seed-permissions';
import { seedDatabase } from './seed-database';

export default async function globalSetup() {
  const mongoUri = process.env.MONGODB_URI || '';

  // Safety check: MONGODB_URI must contain "e2e" to prevent accidental production data deletion
  if (!mongoUri.includes('e2e')) {
    throw new Error(
      `MONGODB_URI safety check failed: URI must contain "e2e" to prevent accidental data deletion.\n` +
      `Current URI: ${mongoUri}\n` +
      `Expected something like: mongodb://localhost:27017/joho-erp-e2e`
    );
  }

  console.log('[E2E Setup] Starting global setup...');
  console.log(`[E2E Setup] Using database: ${mongoUri}`);

  const prisma = getPrismaClient();

  // Clean all collections (same deletion order as cleanAllData in test-utils)
  console.log('[E2E Setup] Cleaning database...');
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

  // Seed permissions (required for PermissionProvider/PermissionGate to work)
  console.log('[E2E Setup] Seeding permissions...');
  await seedPermissions(prisma);

  // Seed base reference data (company, categories, areas)
  console.log('[E2E Setup] Seeding reference data...');
  await seedDatabase(prisma);

  console.log('[E2E Setup] Global setup complete.');
}
