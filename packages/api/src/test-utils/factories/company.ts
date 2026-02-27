import { getPrismaClient } from '@joho-erp/database';

interface CreateTestCompanyOptions {
  businessName?: string;
  abn?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country?: string;
  };
  contactPerson?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile?: string;
  };
  logoUrl?: string;
}

let companyCounter = 0;

export async function createTestCompany(options: CreateTestCompanyOptions = {}) {
  const prisma = getPrismaClient();
  companyCounter++;

  return prisma.company.create({
    data: {
      businessName: options.businessName ?? `Test Company ${companyCounter}`,
      abn: options.abn ?? `${String(companyCounter).padStart(11, '0')}`,
      email: options.email ?? `company${companyCounter}@test.com`,
      phone: options.phone ?? '0300000000',
      address: options.address ?? {
        street: '100 Company Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
      },
      contactPerson: options.contactPerson ?? {
        firstName: 'Admin',
        lastName: `User${companyCounter}`,
        email: `admin${companyCounter}@test.com`,
        phone: '0400000000',
      },
      logoUrl: options.logoUrl ?? null,
    },
  });
}
