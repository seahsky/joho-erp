/**
 * Database Migration Script: Remove out_for_delivery status
 *
 * This script updates all orders with 'out_for_delivery' status to 'ready_for_delivery'
 * as part of simplifying the delivery workflow.
 *
 * IMPORTANT: Create a database backup before running this script!
 *
 * Usage:
 * ```
 * pnpm tsx packages/database/scripts/migrate-remove-out-for-delivery.ts
 * ```
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting order status migration (out_for_delivery → ready_for_delivery)...\n');

  try {
    // Find all orders with out_for_delivery status using raw MongoDB command
    console.log('📋 Finding orders with out_for_delivery status...');

    // Use $runCommandRaw to execute MongoDB find command
    const findResult = await prisma.$runCommandRaw({
      find: 'Order',
      filter: { status: 'out_for_delivery' }
    });

    const ordersToUpdate = (findResult as any).cursor?.firstBatch || [];
    console.log(`   Found ${ordersToUpdate.length} orders to migrate\n`);

    if (ordersToUpdate.length === 0) {
      console.log('✅ No orders to migrate. All done!');
      return;
    }

    // Display orders that will be updated
    console.log('Orders to update:');
    ordersToUpdate.forEach((order: any) => {
      console.log(`   - Order #${order.orderNumber} (${order.customerName})`);
    });
    console.log('');

    // Update orders using raw MongoDB command
    console.log('🔄 Updating orders...');
    const updateResult = await prisma.$runCommandRaw({
      update: 'Order',
      updates: [
        {
          q: { status: 'out_for_delivery' },
          u: {
            $set: { status: 'ready_for_delivery' },
            $push: {
              statusHistory: {
                status: 'ready_for_delivery',
                timestamp: new Date(),
                note: 'Migrated from out_for_delivery (workflow simplification)',
              }
            }
          },
          multi: true
        }
      ]
    });

    const modifiedCount = (updateResult as any).nModified || (updateResult as any).n || 0;
    console.log(`✅ Updated ${modifiedCount} orders\n`);

    // Verify no out_for_delivery orders remain
    const countResult = await prisma.$runCommandRaw({
      count: 'Order',
      query: { status: 'out_for_delivery' }
    });

    const remainingCount = (countResult as any).n || 0;

    if (remainingCount === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('   All out_for_delivery orders have been migrated to ready_for_delivery');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} orders still have out_for_delivery status`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✨ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
