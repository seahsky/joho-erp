/**
 * Fix Negative Stock Script
 *
 * Corrects all products with negative currentStock by setting them to 0
 * and creating audit trail transactions.
 *
 * Usage:
 *   pnpm --filter @joho-erp/database tsx src/scripts/fix-negative-stock.ts --dry-run    # Preview changes
 *   pnpm --filter @joho-erp/database tsx src/scripts/fix-negative-stock.ts --confirm     # Execute fix
 */

import { PrismaClient } from '../generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ log: ['error', 'warn'] });

const isDryRun = process.argv.includes('--dry-run');
const isConfirm = process.argv.includes('--confirm');

if (!isDryRun && !isConfirm) {
  console.error('Usage: tsx fix-negative-stock.ts [--dry-run | --confirm]');
  console.error('  --dry-run   Preview what would be changed');
  console.error('  --confirm   Execute the corrections');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(80));
  console.log(`NEGATIVE STOCK FIX ${isDryRun ? '(DRY RUN)' : '(EXECUTING)'}`);
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Find all products with negative stock
  const negativeProducts = await prisma.product.findMany({
    where: { currentStock: { lt: 0 } },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      parentProductId: true,
      estimatedLossPercentage: true,
    },
    orderBy: { currentStock: 'asc' },
  });

  if (negativeProducts.length === 0) {
    console.log('\n✅ No products with negative stock. Nothing to fix.');
    return;
  }

  console.log(`\nFound ${negativeProducts.length} product(s) with negative stock to fix.\n`);

  // Separate root products from subproducts
  const rootProducts = negativeProducts.filter(p => !p.parentProductId);
  const subProducts = negativeProducts.filter(p => p.parentProductId);

  // Fix root products first (so subproduct recalculation uses correct parent values)
  const allToFix = [...rootProducts, ...subProducts];

  for (const product of allToFix) {
    const correctedStock = 0;

    console.log(`${isDryRun ? '[DRY RUN] ' : ''}Fixing: ${product.name} (${product.sku})`);
    console.log(`  Current: ${product.currentStock} → Corrected: ${correctedStock}`);

    if (!isDryRun) {
      await prisma.$transaction(async (tx) => {
        // Create audit trail transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'adjustment',
            adjustmentType: 'stock_write_off',
            quantity: correctedStock - product.currentStock, // positive (restoring to 0)
            previousStock: product.currentStock,
            newStock: correctedStock,
            referenceType: 'manual',
            notes: `Automated fix: Corrected negative stock (${product.currentStock}) to 0. ` +
              `Root cause: subproduct recalculation propagated negative parent stock without floor guard.`,
            createdBy: 'system:fix-negative-stock',
          },
        });

        // Update the product stock
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: correctedStock },
        });

        // If this is a root product with subproducts, recalculate them too
        if (!product.parentProductId) {
          const subproducts = await tx.product.findMany({
            where: { parentProductId: product.id },
            select: {
              id: true,
              name: true,
              currentStock: true,
              estimatedLossPercentage: true,
            },
          });

          for (const sub of subproducts) {
            const effectiveLoss = sub.estimatedLossPercentage ?? product.estimatedLossPercentage ?? 0;
            const newSubStock = Math.max(0, Math.round(correctedStock * (1 - effectiveLoss / 100) * 100) / 100);

            if (sub.currentStock !== newSubStock) {
              await tx.inventoryTransaction.create({
                data: {
                  productId: sub.id,
                  type: 'adjustment',
                  adjustmentType: 'stock_write_off',
                  quantity: newSubStock - sub.currentStock,
                  previousStock: sub.currentStock,
                  newStock: newSubStock,
                  referenceType: 'manual',
                  notes: `Automated fix: Recalculated subproduct stock after parent correction. ` +
                    `Parent ${product.name} was corrected from ${product.currentStock} to ${correctedStock}.`,
                  createdBy: 'system:fix-negative-stock',
                },
              });

              await tx.product.update({
                where: { id: sub.id },
                data: { currentStock: newSubStock },
              });

              console.log(`  Subproduct ${sub.name}: ${sub.currentStock} → ${newSubStock}`);
            }
          }
        }
      });

      console.log(`  ✅ Fixed`);
    }
  }

  // Final verification
  if (!isDryRun) {
    const remaining = await prisma.product.count({
      where: { currentStock: { lt: 0 } },
    });

    console.log('\n' + '='.repeat(80));
    if (remaining === 0) {
      console.log('✅ All negative stock values have been corrected.');
    } else {
      console.log(`⚠️  ${remaining} product(s) still have negative stock. Manual investigation needed.`);
    }
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run with --confirm to execute the corrections.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
