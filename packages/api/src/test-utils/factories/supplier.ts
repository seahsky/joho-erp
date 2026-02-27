import { getPrismaClient } from '@joho-erp/database';

interface CreateTestSupplierOptions {
  supplierCode?: string;
  businessName?: string;
  tradingName?: string;
  abn?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  status?: 'active' | 'inactive' | 'pending_approval' | 'suspended';
  primaryCategories?: string[];
  paymentTerms?: string;
  createdBy?: string;
}

let supplierCounter = 0;

export async function createTestSupplier(options: CreateTestSupplierOptions = {}) {
  const prisma = getPrismaClient();
  supplierCounter++;

  return prisma.supplier.create({
    data: {
      supplierCode: options.supplierCode ?? `SUP-${supplierCounter}-${Date.now()}`,
      businessName: options.businessName ?? `Test Supplier ${supplierCounter}`,
      tradingName: options.tradingName ?? undefined,
      abn: options.abn ?? undefined,
      primaryContact: {
        name: options.primaryContactName ?? 'Test Contact',
        email: options.primaryContactEmail ?? `supplier${supplierCounter}@test.com`,
        phone: options.primaryContactPhone ?? '0400000000',
      },
      businessAddress: {
        street: '456 Supplier Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
      },
      primaryCategories: options.primaryCategories ?? ['Beef'],
      paymentTerms: options.paymentTerms ?? undefined,
      status: options.status ?? 'active',
      createdBy: options.createdBy ?? 'test-user',
    },
  });
}
