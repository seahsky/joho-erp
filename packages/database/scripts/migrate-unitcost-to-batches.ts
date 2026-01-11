/**
 * Migration Script: Migrate Product.unitCost to InventoryBatch
 *
 * This script creates initial InventoryBatch records for all products that:
 * 1. Have currentStock > 0
 * 2. Have a unitCost value (not null)
 *
 * Usage:
 *   pnpm tsx packages/database/scripts/migrate-unitcost-to-batches.ts
 *
 * Safety:
 *   - Runs in a transaction (all or nothing)
 *   - Validates batch totals match product stock
 *   - Logs all operations for audit trail
 *   - Does NOT delete unitCost field (manual step after verification)
 */

import { prisma } from '../src';

interface MigrationStats {
  productsFound: number;
  batchesCreated: number;
  totalStockMigrated: number;
  totalValueMigrated: number;
  errors: string[];
}

async function migrateUnitCostToBatches(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    productsFound: 0,
    batchesCreated: 0,
    totalStockMigrated: 0,
    totalValueMigrated: 0,
    errors: [],
  };

  console.log('🔄 Starting unitCost to InventoryBatch migration...\n');

  try {
    // Step 1: Find all products with stock and unitCost
    console.log('📊 Finding products to migrate...');
    const productsToMigrate = await prisma.product.findMany({
      where: {
        currentStock: { gt: 0 },
        unitCost: { not: null },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        currentStock: true,
        unitCost: true,
        createdAt: true,
      },
    });

    stats.productsFound = productsToMigrate.length;
    console.log(`✅ Found ${stats.productsFound} products to migrate\n`);

    if (stats.productsFound === 0) {
      console.log('ℹ️  No products found with both stock and unitCost. Migration complete.');
      return stats;
    }

    // Step 2: Create initial batches in a transaction
    console.log('🔨 Creating inventory batches...');
    await prisma.$transaction(async (tx) => {
      for (const product of productsToMigrate) {
        try {
          // Create initial batch for this product
          await tx.inventoryBatch.create({
            data: {
              productId: product.id,
              quantityRemaining: product.currentStock,
              initialQuantity: product.currentStock,
              costPerUnit: product.unitCost!, // In cents
              receivedAt: product.createdAt, // Use product creation date as received date
              expiryDate: null, // Unknown expiry for historical stock
              receiveTransactionId: null, // No transaction ID for migrated batches
              notes: 'MIGRATED: Initial batch created from Product.unitCost during migration',
              isConsumed: false,
              consumedAt: null,
            },
          });

          stats.batchesCreated++;
          stats.totalStockMigrated += product.currentStock;
          stats.totalValueMigrated += product.currentStock * product.unitCost!;

          console.log(
            `  ✓ ${product.sku} (${product.name}): ${product.currentStock} units @ $${(product.unitCost! / 100).toFixed(2)}`
          );
        } catch (error) {
          const errorMsg = `Failed to create batch for product ${product.sku}: ${error instanceof Error ? error.message : String(error)}`;
          stats.errors.push(errorMsg);
          console.error(`  ✗ ${errorMsg}`);
          throw error; // Rollback transaction on any error
        }
      }
    });

    console.log(`\n✅ Successfully created ${stats.batchesCreated} inventory batches`);

    // Step 3: Validation - Verify batch totals match product stock
    console.log('\n🔍 Validating migration...');
    const validationQuery = await prisma.$queryRaw<
      Array<{
        sku: string;
        product_stock: number;
        batch_total: number | null;
        discrepancy: number;
      }>
    >`
      SELECT
        p.sku,
        p.currentStock AS product_stock,
        SUM(b.quantityRemaining) AS batch_total,
        ABS(COALESCE(p.currentStock, 0) - COALESCE(SUM(b.quantityRemaining), 0)) AS discrepancy
      FROM products p
      LEFT JOIN inventorybatches b ON b.productId = p._id AND b.isConsumed = false
      WHERE p.currentStock > 0 AND p.unitCost IS NOT NULL
      GROUP BY p._id, p.sku, p.currentStock
      HAVING ABS(COALESCE(p.currentStock, 0) - COALESCE(SUM(b.quantityRemaining), 0)) > 0.01
    `;

    if (validationQuery.length > 0) {
      console.error('\n❌ VALIDATION FAILED! Discrepancies found:');
      validationQuery.forEach((row) => {
        const error = `${row.sku}: Product stock = ${row.product_stock}, Batch total = ${row.batch_total}, Discrepancy = ${row.discrepancy}`;
        console.error(`  ✗ ${error}`);
        stats.errors.push(error);
      });
      throw new Error('Migration validation failed. See errors above.');
    } else {
      console.log('✅ Validation passed: All batch totals match product stock');
    }

    // Step 4: Summary
    console.log('\n📈 Migration Summary:');
    console.log(`  Products migrated: ${stats.productsFound}`);
    console.log(`  Batches created: ${stats.batchesCreated}`);
    console.log(`  Total stock migrated: ${stats.totalStockMigrated} units`);
    console.log(`  Total value migrated: $${(stats.totalValueMigrated / 100).toFixed(2)}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nℹ️  Next steps:');
    console.log('  1. Test the application with the new batch data');
    console.log('  2. Verify FIFO consumption works correctly');
    console.log('  3. After thorough testing, manually remove unitCost field from schema.prisma');
    console.log('  4. Run: cd packages/database && pnpm prisma db push');

    return stats;
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateUnitCostToBatches()
  .then((stats) => {
    if (stats.errors.length > 0) {
      console.error(`\n⚠️  Migration completed with ${stats.errors.length} errors`);
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  });
