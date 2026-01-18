/**
 * Migration script to convert deprecated adjustment types to new types
 * - damaged_goods -> stock_write_off
 * - expired_stock -> stock_write_off
 *
 * Uses raw MongoDB commands since Prisma doesn't recognize old enum values
 */

import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting adjustment type migration...');

  // Use $runCommandRaw to execute MongoDB updateMany directly
  // This bypasses Prisma's enum validation

  // Update damaged_goods to stock_write_off
  const damagedResult = await prisma.$runCommandRaw({
    update: 'InventoryTransaction',
    updates: [
      {
        q: { adjustmentType: 'damaged_goods' },
        u: { $set: { adjustmentType: 'stock_write_off' } },
        multi: true,
      },
    ],
  }) as { nModified?: number; n?: number };
  console.log(`Updated ${damagedResult.nModified ?? damagedResult.n ?? 0} records from 'damaged_goods' to 'stock_write_off'`);

  // Update expired_stock to stock_write_off
  const expiredResult = await prisma.$runCommandRaw({
    update: 'InventoryTransaction',
    updates: [
      {
        q: { adjustmentType: 'expired_stock' },
        u: { $set: { adjustmentType: 'stock_write_off' } },
        multi: true,
      },
    ],
  }) as { nModified?: number; n?: number };
  console.log(`Updated ${expiredResult.nModified ?? expiredResult.n ?? 0} records from 'expired_stock' to 'stock_write_off'`);

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
