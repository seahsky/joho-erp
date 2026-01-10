/**
 * Database Reset Script
 *
 * ⚠️  DANGER: This script will DELETE ALL operational data from the database!
 *
 * DELETES:
 * - All Products
 * - All Customers
 * - All Orders
 * - All Inventory Transactions
 * - All Route Optimizations
 * - All Packing Sessions
 * - All Customer Pricing
 * - All Xero Sync Jobs
 * - All Audit Logs
 * - All System Logs
 * - All Areas & Suburb Mappings
 * - All Driver Area Assignments
 * - All Categories
 *
 * KEEPS:
 * - Permissions & RolePermissions (RBAC setup)
 * - Company Settings
 *
 * Usage:
 *   npx tsx packages/database/scripts/reset-database.ts [--dry-run] [--force]
 *
 * Flags:
 *   --dry-run: Preview what would be deleted without actual deletion
 *   --force: Skip all confirmation prompts (DANGEROUS!)
 *
 * Examples:
 *   # Preview what would be deleted (ALWAYS RUN THIS FIRST!)
 *   npx tsx packages/database/scripts/reset-database.ts --dry-run
 *
 *   # Interactive reset with triple confirmation
 *   npx tsx packages/database/scripts/reset-database.ts
 *
 *   # Automated reset (DANGEROUS - skips all confirmations)
 *   npx tsx packages/database/scripts/reset-database.ts --force
 */

import { PrismaClient } from '../src/generated/prisma';
import * as readline from 'readline';

// CLI flags
const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

const prisma = new PrismaClient();

/**
 * Prompt user to type a confirmation phrase
 * @param phrase The phrase that must be typed exactly
 * @returns Promise resolving to true if phrase matches
 */
async function requireTypedConfirmation(phrase: string): Promise<boolean> {
  if (isForce) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `\n⚠️  To confirm, type exactly: ${phrase}\n> `,
      (answer) => {
        rl.close();
        resolve(answer === phrase);
      }
    );
  });
}

/**
 * Prompt user for yes/no confirmation
 * @param message The confirmation message
 * @returns Promise resolving to true if user confirms
 */
async function confirmAction(message: string): Promise<boolean> {
  if (isForce) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `\n${message} (yes/no): `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Count all records that will be deleted
 */
async function countAllRecords() {
  console.log('📊 Counting records...');

  const counts = {
    // Main operational data
    products: await prisma.product.count(),
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    inventoryTransactions: await prisma.inventoryTransaction.count(),
    customerPricing: await prisma.customerPricing.count(),

    // Delivery & routing
    routeOptimizations: await prisma.routeOptimization.count(),
    packingSessions: await prisma.packingSession.count(),
    areas: await prisma.area.count(),
    suburbAreaMappings: await prisma.suburbAreaMapping.count(),
    driverAreaAssignments: await prisma.driverAreaAssignment.count(),

    // Configuration
    categories: await prisma.category.count(),

    // Integration & jobs
    xeroSyncJobs: await prisma.xeroSyncJob.count(),

    // Logs
    auditLogs: await prisma.auditLog.count(),
    systemLogs: await prisma.systemLog.count(),
  };

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return { counts, total };
}

/**
 * Display summary of what will be deleted
 */
function displaySummary(counts: Record<string, number>, total: number) {
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  DATABASE RESET SUMMARY');
  console.log('='.repeat(60));

  console.log('\n🗑️  WILL BE DELETED:');
  console.log('\n  Main Operational Data:');
  console.log(`    • Products:               ${counts.products.toLocaleString()}`);
  console.log(`    • Customers:              ${counts.customers.toLocaleString()}`);
  console.log(`    • Orders:                 ${counts.orders.toLocaleString()}`);
  console.log(`    • Inventory Transactions: ${counts.inventoryTransactions.toLocaleString()}`);
  console.log(`    • Customer Pricing:       ${counts.customerPricing.toLocaleString()}`);

  console.log('\n  Delivery & Routing:');
  console.log(`    • Route Optimizations:    ${counts.routeOptimizations.toLocaleString()}`);
  console.log(`    • Packing Sessions:       ${counts.packingSessions.toLocaleString()}`);
  console.log(`    • Areas:                  ${counts.areas.toLocaleString()}`);
  console.log(`    • Suburb Mappings:        ${counts.suburbAreaMappings.toLocaleString()}`);
  console.log(`    • Driver Assignments:     ${counts.driverAreaAssignments.toLocaleString()}`);

  console.log('\n  Configuration:');
  console.log(`    • Categories:             ${counts.categories.toLocaleString()}`);

  console.log('\n  Integration & Jobs:');
  console.log(`    • Xero Sync Jobs:         ${counts.xeroSyncJobs.toLocaleString()}`);

  console.log('\n  Logs:');
  console.log(`    • Audit Logs:             ${counts.auditLogs.toLocaleString()}`);
  console.log(`    • System Logs:            ${counts.systemLogs.toLocaleString()}`);

  console.log('\n' + '-'.repeat(60));
  console.log(`  📊 TOTAL RECORDS: ${total.toLocaleString()}`);
  console.log('-'.repeat(60));

  console.log('\n✅ WILL BE KEPT:');
  console.log('    • Permissions & RolePermissions (RBAC)');
  console.log('    • Company Settings');

  console.log('\n' + '='.repeat(60));
}

/**
 * Delete all operational data
 */
async function deleteAllData() {
  console.log('\n🗑️  Starting database reset...\n');

  const deletedCounts: Record<string, number> = {};

  // Delete in order to respect foreign key constraints
  // (although MongoDB doesn't enforce them, it's good practice)

  // 1. Delete dependent data first
  console.log('ℹ️  Deleting packing sessions...');
  const packingSessions = await prisma.packingSession.deleteMany({});
  deletedCounts.packingSessions = packingSessions.count;
  console.log(`   ✅ Deleted ${packingSessions.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting route optimizations...');
  const routeOptimizations = await prisma.routeOptimization.deleteMany({});
  deletedCounts.routeOptimizations = routeOptimizations.count;
  console.log(`   ✅ Deleted ${routeOptimizations.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting driver area assignments...');
  const driverAreaAssignments = await prisma.driverAreaAssignment.deleteMany({});
  deletedCounts.driverAreaAssignments = driverAreaAssignments.count;
  console.log(`   ✅ Deleted ${driverAreaAssignments.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting suburb area mappings...');
  const suburbAreaMappings = await prisma.suburbAreaMapping.deleteMany({});
  deletedCounts.suburbAreaMappings = suburbAreaMappings.count;
  console.log(`   ✅ Deleted ${suburbAreaMappings.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting areas...');
  const areas = await prisma.area.deleteMany({});
  deletedCounts.areas = areas.count;
  console.log(`   ✅ Deleted ${areas.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting customer pricing...');
  const customerPricing = await prisma.customerPricing.deleteMany({});
  deletedCounts.customerPricing = customerPricing.count;
  console.log(`   ✅ Deleted ${customerPricing.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting inventory transactions...');
  const inventoryTransactions = await prisma.inventoryTransaction.deleteMany({});
  deletedCounts.inventoryTransactions = inventoryTransactions.count;
  console.log(`   ✅ Deleted ${inventoryTransactions.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting orders...');
  const orders = await prisma.order.deleteMany({});
  deletedCounts.orders = orders.count;
  console.log(`   ✅ Deleted ${orders.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting customers...');
  const customers = await prisma.customer.deleteMany({});
  deletedCounts.customers = customers.count;
  console.log(`   ✅ Deleted ${customers.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting products...');
  const products = await prisma.product.deleteMany({});
  deletedCounts.products = products.count;
  console.log(`   ✅ Deleted ${products.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting categories...');
  const categories = await prisma.category.deleteMany({});
  deletedCounts.categories = categories.count;
  console.log(`   ✅ Deleted ${categories.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting Xero sync jobs...');
  const xeroSyncJobs = await prisma.xeroSyncJob.deleteMany({});
  deletedCounts.xeroSyncJobs = xeroSyncJobs.count;
  console.log(`   ✅ Deleted ${xeroSyncJobs.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting audit logs...');
  const auditLogs = await prisma.auditLog.deleteMany({});
  deletedCounts.auditLogs = auditLogs.count;
  console.log(`   ✅ Deleted ${auditLogs.count.toLocaleString()} records`);

  console.log('ℹ️  Deleting system logs...');
  const systemLogs = await prisma.systemLog.deleteMany({});
  deletedCounts.systemLogs = systemLogs.count;
  console.log(`   ✅ Deleted ${systemLogs.count.toLocaleString()} records`);

  return deletedCounts;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
⚠️  Database Reset Script - DESTRUCTIVE OPERATION

This script will DELETE ALL operational data from the database!

What will be DELETED:
  • All Products, Customers, Orders
  • All Inventory Transactions
  • All Route Optimizations, Packing Sessions
  • All Areas, Suburbs, Driver Assignments
  • All Categories
  • All Customer Pricing
  • All Xero Sync Jobs
  • All Audit Logs, System Logs

What will be KEPT:
  • Permissions & RolePermissions (RBAC)
  • Company Settings

Usage:
  npx tsx packages/database/scripts/reset-database.ts [options]

Options:
  --dry-run    Preview what would be deleted without actual deletion
  --force      Skip all confirmation prompts (DANGEROUS!)
  --help, -h   Display this help message

Examples:
  # Preview what would be deleted (ALWAYS RUN THIS FIRST!)
  npx tsx packages/database/scripts/reset-database.ts --dry-run

  # Interactive reset with triple confirmation
  npx tsx packages/database/scripts/reset-database.ts

  # Automated reset (DANGEROUS - skips all confirmations)
  npx tsx packages/database/scripts/reset-database.ts --force

⚠️  WARNING: This operation is IRREVERSIBLE. Always backup your database first!
`);
}

/**
 * Main reset function
 */
async function reset() {
  if (showHelp) {
    displayHelp();
    return;
  }

  const startTime = Date.now();

  console.log('🚀 Starting Database Reset');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : '⚠️  LIVE - WILL DELETE DATA!'}`);
  console.log(`   Date: ${new Date().toISOString()}`);

  try {
    // Count all records
    const { counts, total } = await countAllRecords();

    // Display summary
    displaySummary(counts, total);

    if (total === 0) {
      console.log('\n✅ Database is already empty. Nothing to delete!');
      return;
    }

    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. No records were actually deleted.');
      console.log('   Run without --dry-run to perform actual deletion.');
      return;
    }

    // Triple confirmation for safety
    console.log('\n⚠️  WARNING: This operation is IRREVERSIBLE!');
    console.log('⚠️  Make sure you have a backup if you need one!');

    // Confirmation 1: Type phrase
    console.log('\n📝 CONFIRMATION 1/3:');
    if (!await requireTypedConfirmation('DELETE ALL DATA')) {
      console.log('\n❌ Reset cancelled. Phrase did not match.');
      process.exit(0);
    }

    // Confirmation 2: Understand consequences
    console.log('\n📝 CONFIRMATION 2/3:');
    const understood = await confirmAction(
      `Do you understand that ${total.toLocaleString()} records will be PERMANENTLY deleted?`
    );
    if (!understood) {
      console.log('\n❌ Reset cancelled by user');
      process.exit(0);
    }

    // Confirmation 3: Final confirmation
    console.log('\n📝 CONFIRMATION 3/3:');
    const finalConfirm = await confirmAction(
      '🔴 FINAL CONFIRMATION: Are you absolutely sure you want to proceed?'
    );
    if (!finalConfirm) {
      console.log('\n❌ Reset cancelled by user');
      process.exit(0);
    }

    // Perform deletion
    console.log('\n🔥 Proceeding with database reset...');
    const deletedCounts = await deleteAllData();

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database Reset Complete!');
    console.log(`   Total records deleted: ${totalDeleted.toLocaleString()}`);
    console.log(`   Time elapsed: ${elapsedTime}s`);
    console.log('\n   The database has been reset to a fresh state.');
    console.log('   Permissions and Company settings have been preserved.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
reset()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
