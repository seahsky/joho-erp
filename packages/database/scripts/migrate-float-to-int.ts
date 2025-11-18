/**
 * Database Migration Script: Convert Float (dollars) to Int (cents)
 *
 * This script converts all monetary values from Float (dollars) to Int (cents)
 * to support the dinero.js implementation and eliminate floating-point precision errors.
 *
 * IMPORTANT: Create a database backup before running this script!
 *
 * Usage:
 * ```
 * pnpm tsx packages/database/scripts/migrate-float-to-int.ts
 * ```
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Convert dollars to cents
 * @param dollarValue - Value in dollars (e.g., 25.50)
 * @returns Value in cents (e.g., 2550)
 */
function dollarsToCents(dollarValue: number | null | undefined): number {
  if (dollarValue === null || dollarValue === undefined) {
    return 0;
  }
  return Math.round(dollarValue * 100);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting monetary value migration (Float → Int)...\n');

  try {
    // ========================================================================
    // 1. MIGRATE PRODUCTS
    // ========================================================================
    console.log('📦 Migrating Product basePrice...');
    const products = await prisma.product.findMany({
      select: { id: true, basePrice: true },
    });

    console.log(`   Found ${products.length} products to migrate`);

    for (const product of products) {
      const basePriceCents = dollarsToCents(product.basePrice as any);

      await prisma.product.update({
        where: { id: product.id },
        data: { basePrice: basePriceCents },
      });
    }

    console.log(`   ✅ Migrated ${products.length} products\n`);

    // ========================================================================
    // 2. MIGRATE CUSTOMER PRICING
    // ========================================================================
    console.log('💰 Migrating CustomerPricing customPrice...');
    const customerPricing = await prisma.customerPricing.findMany({
      select: { id: true, customPrice: true },
    });

    console.log(`   Found ${customerPricing.length} customer pricing records to migrate`);

    for (const pricing of customerPricing) {
      const customPriceCents = dollarsToCents(pricing.customPrice as any);

      await prisma.customerPricing.update({
        where: { id: pricing.id },
        data: { customPrice: customPriceCents },
      });
    }

    console.log(`   ✅ Migrated ${customerPricing.length} customer pricing records\n`);

    // ========================================================================
    // 3. MIGRATE ORDERS
    // ========================================================================
    console.log('📋 Migrating Order totals and items...');
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        subtotal: true,
        taxAmount: true,
        totalAmount: true,
        items: true,
      },
    });

    console.log(`   Found ${orders.length} orders to migrate`);

    for (const order of orders) {
      const subtotalCents = dollarsToCents(order.subtotal as any);
      const taxAmountCents = dollarsToCents(order.taxAmount as any);
      const totalAmountCents = dollarsToCents(order.totalAmount as any);

      // Migrate order items
      const migratedItems = order.items.map((item: any) => ({
        ...item,
        unitPrice: dollarsToCents(item.unitPrice),
        subtotal: dollarsToCents(item.subtotal),
      }));

      await prisma.order.update({
        where: { id: order.id },
        data: {
          subtotal: subtotalCents,
          taxAmount: taxAmountCents,
          totalAmount: totalAmountCents,
          items: migratedItems,
        },
      });
    }

    console.log(`   ✅ Migrated ${orders.length} orders\n`);

    // ========================================================================
    // 4. MIGRATE CUSTOMER CREDIT APPLICATIONS
    // ========================================================================
    console.log('🏦 Migrating Customer creditApplication...');
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        creditApplication: true,
      },
    });

    console.log(`   Found ${customers.length} customers to migrate`);

    for (const customer of customers) {
      const creditApp = customer.creditApplication as any;

      const migratedCreditApp = {
        ...creditApp,
        requestedCreditLimit: creditApp.requestedCreditLimit
          ? dollarsToCents(creditApp.requestedCreditLimit)
          : null,
        forecastPurchase: creditApp.forecastPurchase
          ? dollarsToCents(creditApp.forecastPurchase)
          : null,
        creditLimit: dollarsToCents(creditApp.creditLimit),
      };

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          creditApplication: migratedCreditApp,
        },
      });
    }

    console.log(`   ✅ Migrated ${customers.length} customer credit applications\n`);

    // ========================================================================
    // MIGRATION SUMMARY
    // ========================================================================
    console.log('✨ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Products migrated: ${products.length}`);
    console.log(`   - Customer pricing records migrated: ${customerPricing.length}`);
    console.log(`   - Orders migrated: ${orders.length}`);
    console.log(`   - Customer credit applications migrated: ${customers.length}`);
    console.log('\n🎉 All monetary values have been converted from Float (dollars) to Int (cents)');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Rollback function (convert cents back to dollars)
 * Use this if you need to reverse the migration
 */
async function rollback() {
  console.log('🔄 Starting rollback (Int → Float)...\n');
  console.log('⚠️  WARNING: This will convert all monetary values back to Float (dollars)');
  console.log('⚠️  This operation cannot be undone!\n');

  try {
    // Products
    console.log('📦 Rolling back Product basePrice...');
    const products = await prisma.product.findMany({
      select: { id: true, basePrice: true },
    });

    for (const product of products) {
      const basePriceDollars = (product.basePrice as number) / 100;
      await prisma.product.update({
        where: { id: product.id },
        data: { basePrice: basePriceDollars as any },
      });
    }
    console.log(`   ✅ Rolled back ${products.length} products\n`);

    // Customer Pricing
    console.log('💰 Rolling back CustomerPricing...');
    const customerPricing = await prisma.customerPricing.findMany({
      select: { id: true, customPrice: true },
    });

    for (const pricing of customerPricing) {
      const customPriceDollars = (pricing.customPrice as number) / 100;
      await prisma.customerPricing.update({
        where: { id: pricing.id },
        data: { customPrice: customPriceDollars as any },
      });
    }
    console.log(`   ✅ Rolled back ${customerPricing.length} customer pricing records\n`);

    // Orders
    console.log('📋 Rolling back Orders...');
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        subtotal: true,
        taxAmount: true,
        totalAmount: true,
        items: true,
      },
    });

    for (const order of orders) {
      const subtotalDollars = (order.subtotal as number) / 100;
      const taxAmountDollars = (order.taxAmount as number) / 100;
      const totalAmountDollars = (order.totalAmount as number) / 100;

      const rolledBackItems = order.items.map((item: any) => ({
        ...item,
        unitPrice: item.unitPrice / 100,
        subtotal: item.subtotal / 100,
      }));

      await prisma.order.update({
        where: { id: order.id },
        data: {
          subtotal: subtotalDollars as any,
          taxAmount: taxAmountDollars as any,
          totalAmount: totalAmountDollars as any,
          items: rolledBackItems,
        },
      });
    }
    console.log(`   ✅ Rolled back ${orders.length} orders\n`);

    // Customers
    console.log('🏦 Rolling back Customer credit applications...');
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        creditApplication: true,
      },
    });

    for (const customer of customers) {
      const creditApp = customer.creditApplication as any;

      const rolledBackCreditApp = {
        ...creditApp,
        requestedCreditLimit: creditApp.requestedCreditLimit
          ? creditApp.requestedCreditLimit / 100
          : null,
        forecastPurchase: creditApp.forecastPurchase ? creditApp.forecastPurchase / 100 : null,
        creditLimit: creditApp.creditLimit / 100,
      };

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          creditApplication: rolledBackCreditApp,
        },
      });
    }
    console.log(`   ✅ Rolled back ${customers.length} customer credit applications\n`);

    console.log('✨ Rollback completed successfully!');
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
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

if (command === 'rollback') {
  console.log('\n⚠️  ROLLBACK MODE\n');
  rollback()
    .then(() => {
      console.log('\n✅ Rollback complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Rollback error:', error);
      process.exit(1);
    });
} else {
  console.log('\n🚀 MIGRATION MODE\n');
  console.log('⚠️  IMPORTANT: Make sure you have created a database backup!');
  console.log('⚠️  This will convert all Float monetary values to Int (cents)\n');

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
