import type { PrismaClient } from '@joho-erp/database';

/**
 * Seeds base reference data required by the application:
 * - Company record (required for order cutoff time lookups)
 * - Product categories
 * - Delivery areas
 */
export async function seedDatabase(prisma: PrismaClient) {
  // Create company record
  await prisma.company.create({
    data: {
      businessName: 'Joho Foods E2E Test',
      abn: '12345678901',
      email: 'e2e@johofoods.com',
      phone: '0300000000',
      address: {
        street: '100 Test Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia',
      },
      contactPerson: {
        firstName: 'E2E',
        lastName: 'Admin',
        email: 'admin@johofoods.com',
        phone: '0400000000',
      },
    },
  });

  // Create product categories
  const categories = ['Beef', 'Pork', 'Chicken', 'Lamb', 'Processed'];
  for (const name of categories) {
    await prisma.category.create({
      data: {
        name,
        description: `${name} products`,
        isActive: true,
      },
    });
  }

  // Create delivery areas
  const areas = [
    { name: 'melbourne-cbd', displayName: 'Melbourne CBD' },
    { name: 'inner-north', displayName: 'Inner North' },
    { name: 'inner-south', displayName: 'Inner South' },
  ];

  for (const area of areas) {
    await prisma.area.create({
      data: {
        name: area.name,
        displayName: area.displayName,
        isActive: true,
      },
    });
  }

  console.log(
    `[E2E Setup] Seeded 1 company, ${categories.length} categories, ${areas.length} delivery areas.`
  );
}
