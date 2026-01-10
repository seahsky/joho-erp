/**
 * Database Cleanup Script
 *
 * Removes old records from:
 * - AuditLog (90+ days old)
 * - SystemLog (60+ days old)
 * - RouteOptimization (30+ days old)
 *
 * Usage:
 *   npx tsx packages/database/scripts/cleanup-old-data.ts [--dry-run] [--force]
 *
 * Flags:
 *   --dry-run: Preview what would be deleted without actual deletion
 *   --force: Skip confirmation prompt
 *
 * Examples:
 *   # Preview what would be deleted (recommended first run)
 *   npx tsx packages/database/scripts/cleanup-old-data.ts --dry-run
 *
 *   # Interactive cleanup (prompts for confirmation)
 *   npx tsx packages/database/scripts/cleanup-old-data.ts
 *
 *   # Automated cleanup (no prompt)
 *   npx tsx packages/database/scripts/cleanup-old-data.ts --force
 */

import { PrismaClient } from '../src/generated/prisma';
import * as readline from 'readline';

// Retention periods in days
const AUDIT_LOG_RETENTION_DAYS = 90;
const SYSTEM_LOG_RETENTION_DAYS = 60;
const ROUTE_OPTIMIZATION_RETENTION_DAYS = 30;

// CLI flags
const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

const prisma = new PrismaClient();

/**
 * Calculate the cutoff date for retention
 * @param daysAgo Number of days in the past
 * @returns Date object set to start of day
 */
function getRetentionCutoffDate(daysAgo: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  cutoff.setHours(0, 0, 0, 0); // Start of day
  return cutoff;
}

/**
 * Prompt user for confirmation before deletion
 * @param summary Summary of records to be deleted
 * @returns Promise resolving to true if user confirms
 */
async function confirmCleanup(summary: string): Promise<boolean> {
  if (isForce) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `\n${summary}\n\n⚠️  This will PERMANENTLY delete these records. Continue? (yes/no): `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Clean up old AuditLog records
 * @param cutoffDate Date before which records should be deleted
 * @returns Number of records deleted
 */
async function cleanupAuditLogs(cutoffDate: Date): Promise<number> {
  console.log(`\nℹ️  Cleaning AuditLog records older than ${cutoffDate.toISOString()}...`);

  // Count first
  const count = await prisma.auditLog.count({
    where: {
      timestamp: { lt: cutoffDate }
    }
  });

  console.log(`   Found ${count.toLocaleString()} records to delete`);

  if (count === 0) {
    console.log('   ✅ No records to delete');
    return 0;
  }

  if (isDryRun) {
    console.log('   🔍 DRY RUN: Would delete these records');
    return count;
  }

  // Perform deletion
  const result = await prisma.auditLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  });

  console.log(`   ✅ Deleted ${result.count.toLocaleString()} records`);
  return result.count;
}

/**
 * Clean up old SystemLog records
 * @param cutoffDate Date before which records should be deleted
 * @returns Number of records deleted
 */
async function cleanupSystemLogs(cutoffDate: Date): Promise<number> {
  console.log(`\nℹ️  Cleaning SystemLog records older than ${cutoffDate.toISOString()}...`);

  const count = await prisma.systemLog.count({
    where: {
      timestamp: { lt: cutoffDate }
    }
  });

  console.log(`   Found ${count.toLocaleString()} records to delete`);

  if (count === 0) {
    console.log('   ✅ No records to delete');
    return 0;
  }

  if (isDryRun) {
    console.log('   🔍 DRY RUN: Would delete these records');
    return count;
  }

  const result = await prisma.systemLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  });

  console.log(`   ✅ Deleted ${result.count.toLocaleString()} records`);
  return result.count;
}

/**
 * Clean up old RouteOptimization records
 * @param cutoffDate Date before which records should be deleted
 * @returns Number of records deleted
 */
async function cleanupRouteOptimizations(cutoffDate: Date): Promise<number> {
  console.log(`\nℹ️  Cleaning RouteOptimization records older than ${cutoffDate.toISOString()}...`);

  const count = await prisma.routeOptimization.count({
    where: {
      deliveryDate: { lt: cutoffDate }
    }
  });

  console.log(`   Found ${count.toLocaleString()} records to delete`);

  if (count === 0) {
    console.log('   ✅ No records to delete');
    return 0;
  }

  if (isDryRun) {
    console.log('   🔍 DRY RUN: Would delete these records');
    return count;
  }

  const result = await prisma.routeOptimization.deleteMany({
    where: {
      deliveryDate: { lt: cutoffDate }
    }
  });

  console.log(`   ✅ Deleted ${result.count.toLocaleString()} records`);
  return result.count;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Database Cleanup Script

Removes old records from:
  • AuditLog (${AUDIT_LOG_RETENTION_DAYS}+ days old)
  • SystemLog (${SYSTEM_LOG_RETENTION_DAYS}+ days old)
  • RouteOptimization (${ROUTE_OPTIMIZATION_RETENTION_DAYS}+ days old)

Usage:
  npx tsx packages/database/scripts/cleanup-old-data.ts [options]

Options:
  --dry-run    Preview what would be deleted without actual deletion
  --force      Skip confirmation prompt
  --help, -h   Display this help message

Examples:
  # Preview what would be deleted (recommended first run)
  npx tsx packages/database/scripts/cleanup-old-data.ts --dry-run

  # Interactive cleanup (prompts for confirmation)
  npx tsx packages/database/scripts/cleanup-old-data.ts

  # Automated cleanup (no prompt)
  npx tsx packages/database/scripts/cleanup-old-data.ts --force

Retention Policy:
  AuditLog:           ${AUDIT_LOG_RETENTION_DAYS} days
  SystemLog:          ${SYSTEM_LOG_RETENTION_DAYS} days
  RouteOptimization:  ${ROUTE_OPTIMIZATION_RETENTION_DAYS} days
`);
}

/**
 * Main cleanup function
 */
async function cleanup() {
  if (showHelp) {
    displayHelp();
    return;
  }

  const startTime = Date.now();

  console.log('🚀 Starting Database Cleanup');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`   Date: ${new Date().toISOString()}`);

  try {
    // Calculate cutoff dates
    const auditLogCutoff = getRetentionCutoffDate(AUDIT_LOG_RETENTION_DAYS);
    const systemLogCutoff = getRetentionCutoffDate(SYSTEM_LOG_RETENTION_DAYS);
    const routeOptimizationCutoff = getRetentionCutoffDate(ROUTE_OPTIMIZATION_RETENTION_DAYS);

    console.log('\n📅 Cutoff Dates:');
    console.log(`   • AuditLog: ${auditLogCutoff.toISOString()} (${AUDIT_LOG_RETENTION_DAYS} days ago)`);
    console.log(`   • SystemLog: ${systemLogCutoff.toISOString()} (${SYSTEM_LOG_RETENTION_DAYS} days ago)`);
    console.log(`   • RouteOptimization: ${routeOptimizationCutoff.toISOString()} (${ROUTE_OPTIMIZATION_RETENTION_DAYS} days ago)`);

    // Count records to be deleted
    console.log('\n📊 Counting records to delete...');

    const auditLogCount = await prisma.auditLog.count({
      where: { timestamp: { lt: auditLogCutoff } }
    });

    const systemLogCount = await prisma.systemLog.count({
      where: { timestamp: { lt: systemLogCutoff } }
    });

    const routeOptimizationCount = await prisma.routeOptimization.count({
      where: { deliveryDate: { lt: routeOptimizationCutoff } }
    });

    const totalRecords = auditLogCount + systemLogCount + routeOptimizationCount;

    // Display summary
    const summary = [
      '📋 Cleanup Summary:',
      `   • AuditLog: ${auditLogCount.toLocaleString()} records (>${AUDIT_LOG_RETENTION_DAYS} days)`,
      `   • SystemLog: ${systemLogCount.toLocaleString()} records (>${SYSTEM_LOG_RETENTION_DAYS} days)`,
      `   • RouteOptimization: ${routeOptimizationCount.toLocaleString()} records (>${ROUTE_OPTIMIZATION_RETENTION_DAYS} days)`,
      `   • Total: ${totalRecords.toLocaleString()} records`
    ].join('\n');

    console.log(`\n${summary}`);

    if (totalRecords === 0) {
      console.log('\n✅ No records to clean up. Database is already clean!');
      return;
    }

    // Get confirmation if not dry-run and not force
    if (!isDryRun && !await confirmCleanup(summary)) {
      console.log('\n❌ Cleanup cancelled by user');
      process.exit(0);
    }

    // Perform cleanup
    console.log('\n🧹 Starting cleanup operations...');

    const deletedCounts = {
      auditLog: await cleanupAuditLogs(auditLogCutoff),
      systemLog: await cleanupSystemLogs(systemLogCutoff),
      routeOptimization: await cleanupRouteOptimizations(routeOptimizationCutoff)
    };

    const totalDeleted = deletedCounts.auditLog + deletedCounts.systemLog + deletedCounts.routeOptimization;
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Cleanup ${isDryRun ? 'Preview' : 'Complete'}!`);
    console.log(`   Total records ${isDryRun ? 'would be' : ''} deleted: ${totalDeleted.toLocaleString()}`);
    console.log(`   Time elapsed: ${elapsedTime}s`);
    if (isDryRun) {
      console.log('\n   ℹ️  This was a dry run. No records were actually deleted.');
      console.log('   Run without --dry-run to perform actual deletion.');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
cleanup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
