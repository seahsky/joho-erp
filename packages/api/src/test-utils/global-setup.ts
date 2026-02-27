import { getPrismaClient, disconnectPrisma } from '@joho-erp/database';

export async function setup() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.includes('joho-erp-test')) {
    throw new Error(
      `Safety check failed: MONGODB_URI must contain "joho-erp-test". Got: ${uri}`
    );
  }

  const prisma = getPrismaClient();

  try {
    await prisma.$connect();

    // Use deleteMany on all models to clean the test database
    await Promise.all([
      prisma.batchConsumption.deleteMany(),
      prisma.inventoryBatch.deleteMany(),
      prisma.inventoryTransaction.deleteMany(),
      prisma.packingSession.deleteMany(),
      prisma.routeOptimization.deleteMany(),
      prisma.xeroSyncJob.deleteMany(),
      prisma.order.deleteMany(),
      prisma.customerPricing.deleteMany(),
      prisma.productSupplier.deleteMany(),
      prisma.cart.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.product.deleteMany(),
      prisma.supplier.deleteMany(),
      prisma.category.deleteMany(),
      prisma.area.deleteMany(),
      prisma.suburbAreaMapping.deleteMany(),
      prisma.driverAreaAssignment.deleteMany(),
      prisma.company.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.systemLog.deleteMany(),
      prisma.permission.deleteMany(),
      prisma.rolePermission.deleteMany(),
    ]);
  } finally {
    await disconnectPrisma();
  }
}

export async function teardown() {
  // Clean up is handled by global setup on next run
}
