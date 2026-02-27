import { getPrismaClient } from '@joho-erp/database';

/**
 * Clean transactional data while preserving reference data (areas, categories).
 * Deletion order respects referential integrity.
 */
export async function cleanTransactionalData() {
  const prisma = getPrismaClient();

  // Delete in dependency order
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

  // Reset product stock (in case any products remain)
  await prisma.product.updateMany({
    data: { currentStock: 0 },
  });
}

/**
 * Clean ALL data including reference data.
 */
export async function cleanAllData() {
  const prisma = getPrismaClient();

  await cleanTransactionalData();

  // Also clean reference data
  await prisma.driverAreaAssignment.deleteMany();
  await prisma.suburbAreaMapping.deleteMany();
  await prisma.area.deleteMany();
  await prisma.category.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.rolePermission.deleteMany();
}
