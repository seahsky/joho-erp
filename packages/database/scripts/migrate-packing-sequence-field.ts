/**
 * Database Migration Script: Rename packing.packingSequence to packing.areaPackingSequence
 *
 * This script fixes the field name mismatch between:
 * - MongoDB data: packing.packingSequence
 * - Prisma schema: packing.areaPackingSequence
 *
 * The mismatch causes the LIFO order badge to not display on the packing page
 * because the code reads order.packing?.areaPackingSequence which returns null.
 *
 * Usage:
 * ```
 * pnpm tsx packages/database/scripts/migrate-packing-sequence-field.ts
 * ```
 *
 * Verification:
 * ```
 * pnpm tsx packages/database/scripts/migrate-packing-sequence-field.ts verify
 * ```
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting packing sequence field migration...\n');
  console.log('📋 Renaming packing.packingSequence → packing.areaPackingSequence\n');

  try {
    // Step 1: Count affected documents using raw MongoDB command
    const countResult = (await prisma.$runCommandRaw({
      count: 'orders',
      query: { 'packing.packingSequence': { $exists: true } },
    })) as { n: number };

    const beforeCount = countResult.n;

    console.log(`📊 Found ${beforeCount} orders with packing.packingSequence field\n`);

    if (beforeCount === 0) {
      console.log('ℹ️  No orders need migration. The field may have already been renamed.\n');

      // Check if areaPackingSequence exists
      const afterCountResult = (await prisma.$runCommandRaw({
        count: 'orders',
        query: { 'packing.areaPackingSequence': { $exists: true } },
      })) as { n: number };

      console.log(`📊 Orders with packing.areaPackingSequence: ${afterCountResult.n}\n`);
      return;
    }

    // Step 2: Rename the field using aggregation pipeline update
    console.log('🔄 Migrating orders...\n');

    // First, copy the old field to the new field
    const copyResult = (await prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { 'packing.packingSequence': { $exists: true } },
          u: [
            {
              $set: {
                'packing.areaPackingSequence': '$packing.packingSequence',
              },
            },
          ],
          multi: true,
        },
      ],
    })) as { nModified?: number; ok?: number };

    console.log('📊 Copy result:', JSON.stringify(copyResult, null, 2), '\n');

    // Then, remove the old field
    const unsetResult = (await prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { 'packing.packingSequence': { $exists: true } },
          u: {
            $unset: { 'packing.packingSequence': '' },
          },
          multi: true,
        },
      ],
    })) as { nModified?: number; ok?: number };

    console.log('📊 Unset result:', JSON.stringify(unsetResult, null, 2), '\n');

    // Step 3: Verify migration
    const remainingOldResult = (await prisma.$runCommandRaw({
      count: 'orders',
      query: { 'packing.packingSequence': { $exists: true } },
    })) as { n: number };

    const newFieldResult = (await prisma.$runCommandRaw({
      count: 'orders',
      query: { 'packing.areaPackingSequence': { $exists: true } },
    })) as { n: number };

    console.log('✅ Migration completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Orders with old field (packingSequence): ${remainingOldResult.n}`);
    console.log(`   - Orders with new field (areaPackingSequence): ${newFieldResult.n}\n`);

    if (remainingOldResult.n > 0) {
      console.log('⚠️  Warning: Some orders still have the old field. Manual inspection may be needed.\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify migration status without making changes
 */
async function verify() {
  console.log('🔍 Verifying packing sequence field migration status...\n');

  try {
    // Check old field count
    const oldFieldResult = (await prisma.$runCommandRaw({
      count: 'orders',
      query: { 'packing.packingSequence': { $exists: true } },
    })) as { n: number };

    // Check new field count
    const newFieldResult = (await prisma.$runCommandRaw({
      count: 'orders',
      query: { 'packing.areaPackingSequence': { $exists: true } },
    })) as { n: number };

    // Total orders with packing data
    const totalWithPackingResult = (await prisma.$runCommandRaw({
      count: 'orders',
      query: { packing: { $exists: true, $ne: null } },
    })) as { n: number };

    console.log('📊 Field Status:');
    console.log(`   - Orders with packing.packingSequence (old): ${oldFieldResult.n}`);
    console.log(`   - Orders with packing.areaPackingSequence (new): ${newFieldResult.n}`);
    console.log(`   - Total orders with packing data: ${totalWithPackingResult.n}\n`);

    if (oldFieldResult.n > 0) {
      console.log('⚠️  Migration needed: Run without "verify" flag to migrate.\n');

      // Show sample orders with old field using find command
      const sampleResult = (await prisma.$runCommandRaw({
        find: 'orders',
        filter: { 'packing.packingSequence': { $exists: true } },
        projection: { orderNumber: 1, packing: 1 },
        limit: 5,
      })) as { cursor: { firstBatch: Array<{ orderNumber: string; packing: unknown }> } };

      console.log('📋 Sample orders with old field:');
      for (const order of sampleResult.cursor.firstBatch) {
        console.log(`   - ${order.orderNumber}: packing =`, JSON.stringify(order.packing, null, 2));
      }
    } else if (newFieldResult.n > 0) {
      console.log('✅ Migration appears complete. All orders use the correct field name.\n');

      // Show sample orders with new field to confirm
      const sampleResult = (await prisma.$runCommandRaw({
        find: 'orders',
        filter: { 'packing.areaPackingSequence': { $exists: true } },
        projection: { orderNumber: 1, packing: 1 },
        limit: 3,
      })) as { cursor: { firstBatch: Array<{ orderNumber: string; packing: unknown }> } };

      console.log('📋 Sample orders with new field:');
      for (const order of sampleResult.cursor.firstBatch) {
        console.log(`   - ${order.orderNumber}: packing =`, JSON.stringify(order.packing, null, 2));
      }
    } else {
      console.log('ℹ️  No orders have packing sequence data yet.\n');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

if (command === 'verify') {
  verify()
    .then(() => {
      console.log('\n✅ Verification complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification error:', error);
      process.exit(1);
    });
} else {
  console.log('\n🚀 MIGRATION MODE\n');
  console.log('⚠️  This will rename packing.packingSequence to packing.areaPackingSequence');
  console.log('⚠️  Run with "verify" flag first to check current status\n');

  migrate()
    .then(() => {
      console.log('\n✅ Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration error:', error);
      process.exit(1);
    });
}
