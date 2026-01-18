/**
 * Database Reset Script: Clear Transactional Data
 *
 * This script clears transactional data (inventory, orders, deliveries) while
 * preserving master data (customers, products, settings).
 *
 * Usage:
 *   pnpm db:reset-transactional --dry-run    # Preview what will be deleted
 *   pnpm db:reset-transactional --confirm    # Execute the reset
 */

import { PrismaClient } from '../generated/prisma';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Tables to clear (in deletion order for referential integrity)
const TABLES_TO_CLEAR = [
  'BatchConsumption',
  'InventoryBatch',
  'InventoryTransaction',
  'PackingSession',
  'RouteOptimization',
  'XeroSyncJob',
  'Order',
] as const;

// Tables to preserve (informational only)
const TABLES_TO_PRESERVE = [
  'Customer',
  'Product',
  'Supplier',
  'ProductSupplier',
  'Category',
  'Area',
  'SuburbAreaMapping',
  'DriverAreaAssignment',
  'Company',
  'Permission',
  'RolePermission',
  'AuditLog',
  'SystemLog',
] as const;

interface TableCounts {
  tableName: string;
  count: number;
}

/**
 * Get record counts for all tables to be cleared
 */
async function getTableCounts(): Promise<TableCounts[]> {
  const counts: TableCounts[] = [];

  counts.push({ tableName: 'BatchConsumption', count: await prisma.batchConsumption.count() });
  counts.push({ tableName: 'InventoryBatch', count: await prisma.inventoryBatch.count() });
  counts.push({ tableName: 'InventoryTransaction', count: await prisma.inventoryTransaction.count() });
  counts.push({ tableName: 'PackingSession', count: await prisma.packingSession.count() });
  counts.push({ tableName: 'RouteOptimization', count: await prisma.routeOptimization.count() });
  counts.push({ tableName: 'XeroSyncJob', count: await prisma.xeroSyncJob.count() });
  counts.push({ tableName: 'Order', count: await prisma.order.count() });

  return counts;
}

/**
 * Get counts of preserved tables for verification
 */
async function getPreservedTableCounts(): Promise<TableCounts[]> {
  const counts: TableCounts[] = [];

  counts.push({ tableName: 'Customer', count: await prisma.customer.count() });
  counts.push({ tableName: 'Product', count: await prisma.product.count() });
  counts.push({ tableName: 'Supplier', count: await prisma.supplier.count() });
  counts.push({ tableName: 'ProductSupplier', count: await prisma.productSupplier.count() });
  counts.push({ tableName: 'Category', count: await prisma.category.count() });
  counts.push({ tableName: 'Area', count: await prisma.area.count() });
  counts.push({ tableName: 'SuburbAreaMapping', count: await prisma.suburbAreaMapping.count() });
  counts.push({ tableName: 'DriverAreaAssignment', count: await prisma.driverAreaAssignment.count() });
  counts.push({ tableName: 'Company', count: await prisma.company.count() });
  counts.push({ tableName: 'Permission', count: await prisma.permission.count() });
  counts.push({ tableName: 'RolePermission', count: await prisma.rolePermission.count() });
  counts.push({ tableName: 'AuditLog', count: await prisma.auditLog.count() });
  counts.push({ tableName: 'SystemLog', count: await prisma.systemLog.count() });

  return counts;
}

/**
 * Print table counts in a formatted way
 */
function printTableCounts(counts: TableCounts[], title: string): void {
  console.log(`\n${title}`);
  console.log('─'.repeat(40));

  const maxNameLength = Math.max(...counts.map((c) => c.tableName.length));
  const totalRecords = counts.reduce((sum, c) => sum + c.count, 0);

  for (const { tableName, count } of counts) {
    const padding = ' '.repeat(maxNameLength - tableName.length);
    const countStr = count.toString().padStart(8);
    console.log(`  ${tableName}${padding}  ${countStr} records`);
  }

  console.log('─'.repeat(40));
  console.log(`  ${'Total'.padEnd(maxNameLength)}  ${totalRecords.toString().padStart(8)} records`);
}

/**
 * Delete all transactional data in the correct order
 */
async function deleteTransactionalData(): Promise<void> {
  console.log('\nDeleting transactional data in dependency order...\n');

  // Step 1: BatchConsumption (depends on InventoryBatch & InventoryTransaction)
  const batchConsumptionCount = await prisma.batchConsumption.count();
  await prisma.batchConsumption.deleteMany({});
  console.log(`  [1/7] BatchConsumption      ✓ Deleted ${batchConsumptionCount} records`);

  // Step 2: InventoryBatch (stock batches for FIFO tracking)
  const inventoryBatchCount = await prisma.inventoryBatch.count();
  await prisma.inventoryBatch.deleteMany({});
  console.log(`  [2/7] InventoryBatch        ✓ Deleted ${inventoryBatchCount} records`);

  // Step 3: InventoryTransaction (stock movement records)
  const inventoryTransactionCount = await prisma.inventoryTransaction.count();
  await prisma.inventoryTransaction.deleteMany({});
  console.log(`  [3/7] InventoryTransaction  ✓ Deleted ${inventoryTransactionCount} records`);

  // Step 4: PackingSession (active packing sessions)
  const packingSessionCount = await prisma.packingSession.count();
  await prisma.packingSession.deleteMany({});
  console.log(`  [4/7] PackingSession        ✓ Deleted ${packingSessionCount} records`);

  // Step 5: RouteOptimization (delivery route optimization data)
  const routeOptimizationCount = await prisma.routeOptimization.count();
  await prisma.routeOptimization.deleteMany({});
  console.log(`  [5/7] RouteOptimization     ✓ Deleted ${routeOptimizationCount} records`);

  // Step 6: XeroSyncJob (pending Xero sync operations)
  const xeroSyncJobCount = await prisma.xeroSyncJob.count();
  await prisma.xeroSyncJob.deleteMany({});
  console.log(`  [6/7] XeroSyncJob           ✓ Deleted ${xeroSyncJobCount} records`);

  // Step 7: Order (includes embedded Packing, Delivery, OrderItems)
  const orderCount = await prisma.order.count();
  await prisma.order.deleteMany({});
  console.log(`  [7/7] Order                 ✓ Deleted ${orderCount} records`);
}

/**
 * Reset Product.currentStock to 0 for all products
 */
async function resetProductStock(): Promise<number> {
  const result = await prisma.product.updateMany({
    data: {
      currentStock: 0,
    },
  });

  return result.count;
}

/**
 * Check if we're running against a production database
 */
function isProduction(): boolean {
  const mongoUri = process.env.MONGODB_URI || '';
  const nodeEnv = process.env.NODE_ENV || '';

  // Check common production indicators
  const productionIndicators = [
    mongoUri.includes('production'),
    mongoUri.includes('prod.'),
    mongoUri.includes('.prod'),
    nodeEnv === 'production',
    // Add any other production indicators specific to your setup
  ];

  return productionIndicators.some(Boolean);
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Database Reset Script: Clear Transactional Data

This script clears transactional data while preserving master data.

Tables to be CLEARED:
${TABLES_TO_CLEAR.map((t) => `  - ${t}`).join('\n')}

Tables to be PRESERVED:
${TABLES_TO_PRESERVE.map((t) => `  - ${t}`).join('\n')}

Post-clear actions:
  - Reset Product.currentStock to 0

Usage:
  pnpm db:reset-transactional --dry-run    Preview what will be deleted
  pnpm db:reset-transactional --confirm    Execute the reset

Flags:
  --dry-run     Show what would be deleted without making changes
  --confirm     Execute the reset (required for safety)
  --help        Show this help message
`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const isDryRun = args.includes('--dry-run');
  const isConfirmed = args.includes('--confirm');
  const showHelp = args.includes('--help') || args.includes('-h');

  // Show help if requested or no arguments provided
  if (showHelp || (!isDryRun && !isConfirmed)) {
    printUsage();
    process.exit(showHelp ? 0 : 1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('   DATABASE RESET: Clear Transactional Data');
  console.log('='.repeat(60));

  // Check for production environment
  if (isProduction()) {
    console.log('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log('!  WARNING: Detected PRODUCTION database environment!       !');
    console.log('!  This operation will DELETE data permanently.             !');
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

    if (!isConfirmed) {
      console.log('\n  Use --confirm flag to proceed with production database.');
      console.log('  This is a safety measure to prevent accidental data loss.\n');
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  try {
    // Connect and verify
    console.log('\nConnecting to database...');
    await prisma.$connect();
    console.log('Connected successfully.');

    // Get current record counts
    const tableCounts = await getTableCounts();
    const preservedCounts = await getPreservedTableCounts();

    printTableCounts(tableCounts, 'Tables to be CLEARED:');
    printTableCounts(preservedCounts, 'Tables to be PRESERVED:');

    // Check total records to delete
    const totalToDelete = tableCounts.reduce((sum, c) => sum + c.count, 0);

    if (totalToDelete === 0) {
      console.log('\nNo records to delete. Transactional tables are already empty.');
      await prisma.$disconnect();
      process.exit(0);
    }

    if (isDryRun) {
      console.log('\n' + '─'.repeat(60));
      console.log('  DRY RUN MODE - No changes will be made');
      console.log('─'.repeat(60));
      console.log(`\n  Would delete ${totalToDelete} records across ${TABLES_TO_CLEAR.length} tables.`);
      console.log('  Would reset currentStock to 0 for all products.\n');
      console.log('  Run with --confirm to execute the reset.\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Execute the reset
    console.log('\n' + '─'.repeat(60));
    console.log('  EXECUTING RESET');
    console.log('─'.repeat(60));

    // Delete transactional data
    await deleteTransactionalData();

    // Reset product stock
    console.log('\nResetting Product.currentStock to 0...');
    const productsUpdated = await resetProductStock();
    console.log(`  ✓ Reset currentStock to 0 for ${productsUpdated} products`);

    // Verify deletion
    console.log('\nVerifying deletion...');
    const postDeleteCounts = await getTableCounts();
    const remainingRecords = postDeleteCounts.reduce((sum, c) => sum + c.count, 0);

    if (remainingRecords > 0) {
      console.error('\n  ERROR: Some records were not deleted!');
      printTableCounts(postDeleteCounts, 'Remaining records:');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('  ✓ All transactional data has been cleared');

    // Verify preserved data
    console.log('\nVerifying preserved data...');
    const postPreservedCounts = await getPreservedTableCounts();
    printTableCounts(postPreservedCounts, 'Preserved tables (unchanged):');

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('   RESET COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`\n  - Deleted ${totalToDelete} records from ${TABLES_TO_CLEAR.length} tables`);
    console.log(`  - Reset currentStock to 0 for ${productsUpdated} products`);
    console.log('  - Preserved all master data tables\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('   RESET FAILED');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`\n  Error: ${error.message}`);
      if (error.stack) {
        console.error(`\n  Stack trace:\n${error.stack}`);
      }
    } else {
      console.error('\n  Unknown error:', error);
    }

    console.error('\n  The database may be in an inconsistent state.');
    console.error('  Please review the error and check your data.\n');

    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
main();
