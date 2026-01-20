/**
 * Database Migration Script: Backfill Transaction References
 *
 * This script backfills `referenceType` and `referenceId` for old InventoryTransaction
 * records that were created before these fields were added.
 *
 * Problem: Stock restoration doesn't work for old orders because the query filters by
 * `referenceType: 'order'` and `referenceId: orderId`, but old transactions don't have
 * these fields populated.
 *
 * Solution: Parse the `notes` field to extract the order number, then look up the order
 * ID and update the transaction record.
 *
 * Old transaction notes patterns:
 * - "Stock consumed for packing: Order ORD-XXXX - ProductName"
 * - "Packing quantity adjustment for order ORD-XXXX: ProductName..."
 *
 * IMPORTANT: Create a database backup before running this script!
 *
 * Usage:
 * ```
 * pnpm tsx packages/database/scripts/backfill-transaction-references.ts
 * ```
 *
 * Dry run (preview changes without applying):
 * ```
 * pnpm tsx packages/database/scripts/backfill-transaction-references.ts --dry-run
 * ```
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

interface TransactionUpdate {
  transactionId: string;
  orderNumber: string;
  orderId: string;
  notes: string | null;
  type: string;
}

/**
 * Main migration function
 */
async function backfillTransactionReferences(dryRun: boolean = false) {
  console.log('🚀 Starting transaction references backfill...\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // ========================================================================
    // 1. FIND TRANSACTIONS MISSING REFERENCE FIELDS
    // ========================================================================
    console.log('📋 Finding transactions with missing referenceType...');

    // Find transactions that:
    // - Have null referenceType (created before the field was added)
    // - Have notes containing "Order" (indicating order-related transactions)
    // - Are of type 'sale' or 'adjustment' (the types we use for packing)
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        referenceType: null,
        notes: { contains: 'Order' },
        OR: [{ type: 'sale' }, { type: 'adjustment' }],
      },
      select: {
        id: true,
        type: true,
        adjustmentType: true,
        notes: true,
        productId: true,
        quantity: true,
        createdAt: true,
      },
    });

    console.log(`   Found ${transactions.length} transactions to process\n`);

    if (transactions.length === 0) {
      console.log('✅ No transactions need backfilling. All good!\n');
      return;
    }

    // ========================================================================
    // 2. BUILD ORDER NUMBER → ORDER ID LOOKUP MAP
    // ========================================================================
    console.log('🗺️  Building order lookup map...');

    const orders = await prisma.order.findMany({
      select: { id: true, orderNumber: true },
    });

    const orderMap = new Map(orders.map((o) => [o.orderNumber, o.id]));
    console.log(`   Loaded ${orders.length} orders into lookup map\n`);

    // ========================================================================
    // 3. PROCESS TRANSACTIONS
    // ========================================================================
    console.log('🔄 Processing transactions...\n');

    const updates: TransactionUpdate[] = [];
    const skipped: { id: string; reason: string; notes: string | null }[] = [];

    for (const txn of transactions) {
      // Extract order number from notes
      // Patterns:
      // - "Stock consumed for packing: Order ORD-1234 - ProductName"
      // - "Packing quantity adjustment for order ORD-1234: ProductName"
      // - "Order ORD-1234" (generic)
      const match = txn.notes?.match(/[Oo]rder\s+(ORD-\d+)/);

      if (!match) {
        skipped.push({
          id: txn.id,
          reason: 'No order number found in notes',
          notes: txn.notes,
        });
        continue;
      }

      const orderNumber = match[1];
      const orderId = orderMap.get(orderNumber);

      if (!orderId) {
        skipped.push({
          id: txn.id,
          reason: `Order ${orderNumber} not found in database`,
          notes: txn.notes,
        });
        continue;
      }

      updates.push({
        transactionId: txn.id,
        orderNumber,
        orderId,
        notes: txn.notes,
        type: txn.type,
      });
    }

    // ========================================================================
    // 4. APPLY UPDATES
    // ========================================================================
    if (updates.length > 0) {
      console.log(`📝 ${dryRun ? 'Would update' : 'Updating'} ${updates.length} transactions:\n`);

      for (const update of updates) {
        if (dryRun) {
          console.log(
            `   [DRY RUN] txn ${update.transactionId} → ${update.orderNumber} (${update.orderId})`
          );
        } else {
          await prisma.inventoryTransaction.update({
            where: { id: update.transactionId },
            data: {
              referenceType: 'order',
              referenceId: update.orderId,
            },
          });
          console.log(`   ✅ Updated txn ${update.transactionId} → ${update.orderNumber}`);
        }
      }
    }

    // ========================================================================
    // 5. REPORT SKIPPED TRANSACTIONS
    // ========================================================================
    if (skipped.length > 0) {
      console.log(`\n⚠️  Skipped ${skipped.length} transactions:\n`);

      for (const skip of skipped.slice(0, 10)) {
        // Show first 10
        console.log(`   - txn ${skip.id}: ${skip.reason}`);
        if (skip.notes) {
          console.log(`     Notes: "${skip.notes.substring(0, 80)}..."`);
        }
      }

      if (skipped.length > 10) {
        console.log(`   ... and ${skipped.length - 10} more`);
      }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total transactions found:    ${transactions.length}`);
    console.log(`   ${dryRun ? 'Would update' : 'Updated'}:                   ${updates.length}`);
    console.log(`   Skipped:                     ${skipped.length}`);

    if (dryRun) {
      console.log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✨ Backfill completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Pick an old order that was previously marked ready');
      console.log('   2. Reset it - verify stock is restored');
      console.log('   3. Mark ready again - verify stock is consumed');
      console.log('   4. Reset again - verify no double-counting');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify function - check which transactions are missing references
 */
async function verify() {
  console.log('🔍 Verifying transaction references...\n');

  try {
    const missingReferences = await prisma.inventoryTransaction.count({
      where: {
        referenceType: null,
        notes: { contains: 'Order' },
        OR: [{ type: 'sale' }, { type: 'adjustment' }],
      },
    });

    const hasReferences = await prisma.inventoryTransaction.count({
      where: {
        referenceType: 'order',
      },
    });

    console.log('📊 Transaction reference status:');
    console.log(`   - Transactions with referenceType='order': ${hasReferences}`);
    console.log(`   - Transactions missing referenceType (order-related): ${missingReferences}`);

    if (missingReferences === 0) {
      console.log('\n✅ All order-related transactions have references backfilled!');
    } else {
      console.log(
        '\n⚠️  Some transactions still need backfilling. Run the migration to fix them.'
      );
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
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

if (command === 'verify' || command === '--verify') {
  verify()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
} else if (command === '--dry-run' || command === 'dry-run') {
  backfillTransactionReferences(true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  console.log('\n⚠️  IMPORTANT: Make sure you have created a database backup!');
  console.log('⚠️  This will update existing InventoryTransaction records.\n');

  backfillTransactionReferences(false)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
