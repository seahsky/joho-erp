/**
 * Database Migration Script: Fix parentProductId Field
 *
 * This script sets parentProductId = null on all existing products that don't have
 * the field set. This is necessary because:
 *
 * 1. The subproduct feature added a new optional field `parentProductId` to Product
 * 2. Existing products don't have this field (it's undefined/missing in MongoDB)
 * 3. The query filter `{ parentProductId: null }` doesn't match documents where
 *    the field doesn't exist, only where it's explicitly null
 * 4. This caused all existing products to be filtered out in both portals
 *
 * Usage:
 * ```
 * pnpm tsx packages/database/scripts/fix-parent-product-id.ts
 * ```
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting parentProductId field migration...\n');

  try {
    // First, let's count how many products are affected
    console.log('📊 Checking current product state...');

    // Count all products
    const totalProducts = await prisma.product.count();
    console.log(`   Total products in database: ${totalProducts}`);

    // Count products with parentProductId explicitly set to null
    const productsWithNullParent = await prisma.product.count({
      where: { parentProductId: null },
    });
    console.log(`   Products matching parentProductId = null: ${productsWithNullParent}`);

    // Count subproducts (products with a parent)
    const subproducts = await prisma.product.count({
      where: { parentProductId: { not: null } },
    });
    console.log(`   Subproducts (with parent): ${subproducts}`);

    // Products without the field are those not matching either query
    const productsWithoutField = totalProducts - productsWithNullParent - subproducts;
    console.log(`   Products without parentProductId field (estimated): ${productsWithoutField}\n`);

    if (productsWithoutField === 0) {
      console.log('✅ No migration needed - all products already have parentProductId field set.');
      return;
    }

    // ========================================================================
    // RUN THE MIGRATION USING MONGODB COMMAND
    // ========================================================================
    console.log('🔧 Running MongoDB updateMany command...');
    console.log('   Setting parentProductId = null where field does not exist...\n');

    const result = await prisma.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: { parentProductId: { $exists: false } },
          u: { $set: { parentProductId: null } },
          multi: true,
        },
      ],
    });

    console.log('📋 MongoDB command result:', JSON.stringify(result, null, 2));

    // ========================================================================
    // VERIFY THE MIGRATION
    // ========================================================================
    console.log('\n📊 Verifying migration...');

    const afterMigrationWithNullParent = await prisma.product.count({
      where: { parentProductId: null },
    });
    console.log(`   Products matching parentProductId = null: ${afterMigrationWithNullParent}`);

    const afterMigrationSubproducts = await prisma.product.count({
      where: { parentProductId: { not: null } },
    });
    console.log(`   Subproducts (with parent): ${afterMigrationSubproducts}`);

    const totalAfter = afterMigrationWithNullParent + afterMigrationSubproducts;
    console.log(`   Total products accounted for: ${totalAfter}/${totalProducts}`);

    // ========================================================================
    // MIGRATION SUMMARY
    // ========================================================================
    console.log('\n✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Products updated: ${(result as any).n || (result as any).nModified || 'see result above'}`);
    console.log(`   - Top-level products (parentProductId = null): ${afterMigrationWithNullParent}`);
    console.log(`   - Subproducts (with parent): ${afterMigrationSubproducts}`);
    console.log('\n🎉 Products should now be visible in both admin and customer portals!');
    console.log('\nNext steps:');
    console.log('   1. Check admin portal /products - should see all products');
    console.log('   2. Check customer portal /products - should see active products in stock');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// SCRIPT EXECUTION
// ============================================================================

console.log('\n🔧 FIX PARENT PRODUCT ID MIGRATION\n');
console.log('This script sets parentProductId = null on existing products');
console.log('that are missing the field (introduced with subproduct feature).\n');

migrate()
  .then(() => {
    console.log('\n✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  });
