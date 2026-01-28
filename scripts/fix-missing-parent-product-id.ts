/**
 * Migration Script: Fix Missing parentProductId Field
 *
 * Problem: Products created before the fix didn't have the parentProductId field,
 * causing them to be invisible in the product listing (which filters by parentProductId: null).
 *
 * Solution: This script sets parentProductId: null on all products where the field is missing.
 *
 * Usage:
 *   pnpm tsx scripts/fix-missing-parent-product-id.ts
 *
 * Or with dry-run (preview only):
 *   pnpm tsx scripts/fix-missing-parent-product-id.ts --dry-run
 */

import { PrismaClient } from '@joho-erp/database';

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Migration: Fix Missing parentProductId Field');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');

  // Find products where parentProductId field doesn't exist
  // Using $exists: false to find documents without the field
  const affectedProducts = await prisma.product.findRaw({
    filter: {
      parentProductId: { $exists: false },
    },
    options: {
      projection: { _id: 1, sku: 1, name: 1 },
    },
  });

  const products = affectedProducts as unknown as Array<{
    _id: { $oid: string };
    sku: string;
    name: string;
  }>;

  console.log(`Found ${products.length} products missing parentProductId field:`);
  console.log('');

  if (products.length === 0) {
    console.log('No products need to be fixed. All products already have parentProductId field.');
    return;
  }

  // List affected products
  for (const product of products) {
    console.log(`  - [${product.sku}] ${product.name}`);
  }
  console.log('');

  if (isDryRun) {
    console.log('DRY RUN: No changes made. Run without --dry-run to apply fixes.');
    return;
  }

  // Apply the fix by updating each product individually
  console.log('Applying fix...');

  let updatedCount = 0;
  for (const product of products) {
    const productId = product._id.$oid;
    await prisma.product.update({
      where: { id: productId },
      data: { parentProductId: null },
    });
    updatedCount++;
    console.log(`  ✓ Fixed: [${product.sku}] ${product.name}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`SUCCESS: Updated ${updatedCount} products`);
  console.log('='.repeat(60));

  // Verify the fix
  const remainingAffected = await prisma.product.findRaw({
    filter: {
      parentProductId: { $exists: false },
    },
  });

  const remaining = remainingAffected as unknown as Array<unknown>;

  if (remaining.length === 0) {
    console.log('Verification: All products now have parentProductId field.');
  } else {
    console.warn(`Warning: ${remaining.length} products still missing parentProductId field.`);
  }
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
