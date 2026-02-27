import { getPrismaClient } from '@joho-erp/database';

interface CreateTestCustomerPricingOptions {
  customerId: string;
  productId: string;
  customPrice: number; // in cents
  effectiveFrom?: Date;
  effectiveTo?: Date;
  notes?: string;
  createdBy?: string;
}

export async function createTestCustomerPricing(options: CreateTestCustomerPricingOptions) {
  const prisma = getPrismaClient();

  return prisma.customerPricing.create({
    data: {
      customerId: options.customerId,
      productId: options.productId,
      customPrice: options.customPrice,
      effectiveFrom: options.effectiveFrom ?? new Date(),
      effectiveTo: options.effectiveTo ?? undefined,
      notes: options.notes ?? undefined,
      createdBy: options.createdBy ?? 'test-user',
    },
  });
}
