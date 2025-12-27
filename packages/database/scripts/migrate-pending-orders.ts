/**
 * Migration Script: Migrate pending orders to new status values
 *
 * This script migrates existing orders with status='pending' to the new status values:
 * - Orders with backorderStatus='pending_approval' → status='awaiting_approval'
 * - Orders with backorderStatus='none' (or other) → status='confirmed'
 *
 * Usage:
 *   Dry run (preview only):  npx tsx packages/database/scripts/migrate-pending-orders.ts --dry-run
 *   Execute migration:       npx tsx packages/database/scripts/migrate-pending-orders.ts
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function migratePendingOrders() {
  console.log('🔄 Starting migration of pending orders...');
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('');
  }

  try {
    // Find all orders with status 'pending' (using raw query since enum value may not exist in Prisma types)
    const pendingOrders = await prisma.$runCommandRaw({
      find: 'Order',
      filter: { status: 'pending' },
    }) as { cursor: { firstBatch: Array<{ _id: { $oid: string }; orderNumber: string; backorderStatus: string }> } };

    const orders = pendingOrders.cursor?.firstBatch || [];

    if (orders.length === 0) {
      console.log('✅ No pending orders found. Migration complete.');
      return;
    }

    console.log(`📋 Found ${orders.length} orders with status 'pending'\n`);

    // Separate orders by backorder status
    const backorders = orders.filter(o => o.backorderStatus === 'pending_approval');
    const normalOrders = orders.filter(o => o.backorderStatus !== 'pending_approval');

    console.log(`  - ${backorders.length} backorders (pending_approval) → will become 'awaiting_approval'`);
    console.log(`  - ${normalOrders.length} normal orders → will become 'confirmed'\n`);

    // Migrate backorders to 'awaiting_approval'
    if (backorders.length > 0) {
      console.log(`\n📦 Backorders to migrate to 'awaiting_approval':`);
      backorders.forEach(o => console.log(`   - ${o.orderNumber}`));

      if (!isDryRun) {
        const backorderIds = backorders.map(o => o._id.$oid);

        await prisma.$runCommandRaw({
          update: 'Order',
          updates: [{
            q: {
              _id: { $in: backorderIds.map(id => ({ $oid: id })) },
              status: 'pending'
            },
            u: {
              $set: { status: 'awaiting_approval' },
              $push: {
                statusHistory: {
                  status: 'awaiting_approval',
                  changedAt: new Date(),
                  changedBy: 'system-migration',
                  notes: 'Migrated from pending status (backorder workflow update)',
                }
              }
            },
            multi: true
          }]
        });

        console.log(`✅ Migrated ${backorders.length} backorders to 'awaiting_approval'`);
      }
    }

    // Migrate normal orders to 'confirmed'
    if (normalOrders.length > 0) {
      console.log(`\n📋 Normal orders to migrate to 'confirmed':`);
      normalOrders.forEach(o => console.log(`   - ${o.orderNumber}`));

      if (!isDryRun) {
        const normalOrderIds = normalOrders.map(o => o._id.$oid);

        await prisma.$runCommandRaw({
          update: 'Order',
          updates: [{
            q: {
              _id: { $in: normalOrderIds.map(id => ({ $oid: id })) },
              status: 'pending'
            },
            u: {
              $set: { status: 'confirmed' },
              $push: {
                statusHistory: {
                  status: 'confirmed',
                  changedAt: new Date(),
                  changedBy: 'system-migration',
                  notes: 'Migrated from pending status (approval workflow removed)',
                }
              }
            },
            multi: true
          }]
        });

        console.log(`✅ Migrated ${normalOrders.length} normal orders to 'confirmed'`);
      }
    }

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN COMPLETE - Run without --dry-run to apply changes');
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePendingOrders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
