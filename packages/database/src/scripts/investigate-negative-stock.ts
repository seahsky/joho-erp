/**
 * Investigate Negative Stock Script
 *
 * Finds all products with negative currentStock and traces the transaction trail
 * to determine the root cause.
 *
 * Usage:
 *   pnpm --filter @joho-erp/database tsx src/scripts/investigate-negative-stock.ts
 */

import { PrismaClient } from '../generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
  console.log('='.repeat(80));
  console.log('NEGATIVE STOCK INVESTIGATION REPORT');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Step 1: Find all products with negative stock
  const negativeProducts = await prisma.product.findMany({
    where: { currentStock: { lt: 0 } },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      parentProductId: true,
      estimatedLossPercentage: true,
      status: true,
    },
    orderBy: { currentStock: 'asc' },
  });

  if (negativeProducts.length === 0) {
    console.log('\n✅ No products with negative stock found.');
    return;
  }

  console.log(`\n🔴 Found ${negativeProducts.length} product(s) with negative stock:\n`);

  for (const product of negativeProducts) {
    console.log('-'.repeat(80));
    console.log(`Product: ${product.name} (SKU: ${product.sku})`);
    console.log(`  ID: ${product.id}`);
    console.log(`  Current Stock: ${product.currentStock}`);
    console.log(`  Status: ${product.status}`);
    console.log(`  Parent Product ID: ${product.parentProductId || 'None (root product)'}`);
    console.log(`  Loss Percentage: ${product.estimatedLossPercentage ?? 'N/A'}`);

    // Step 2: Pull recent inventory transactions
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        adjustmentType: true,
        quantity: true,
        previousStock: true,
        newStock: true,
        createdAt: true,
        referenceType: true,
        referenceId: true,
        notes: true,
        reversedAt: true,
        createdBy: true,
      },
    });

    console.log(`\n  📋 Recent Transactions (last ${transactions.length}):`);
    if (transactions.length === 0) {
      console.log('    ⚠️  No transactions found — stock may have been set directly or via subproduct recalculation.');
    } else {
      for (const tx of transactions) {
        const reversed = tx.reversedAt ? ' [REVERSED]' : '';
        console.log(
          `    ${tx.createdAt.toISOString()} | ` +
          `${tx.type}${tx.adjustmentType ? ':' + tx.adjustmentType : ''} | ` +
          `qty: ${tx.quantity >= 0 ? '+' : ''}${tx.quantity} | ` +
          `stock: ${tx.previousStock} → ${tx.newStock}${reversed}`
        );
        if (tx.notes) {
          console.log(`      Notes: ${tx.notes}`);
        }
        if (tx.referenceId) {
          console.log(`      Ref: ${tx.referenceType}:${tx.referenceId}`);
        }
      }

      // Find the first transaction that resulted in negative stock
      const firstNegative = [...transactions].reverse().find(tx => tx.newStock < 0);
      if (firstNegative) {
        console.log(`\n  ⚠️  First transaction going negative:`);
        console.log(`    Date: ${firstNegative.createdAt.toISOString()}`);
        console.log(`    Type: ${firstNegative.type}${firstNegative.adjustmentType ? ':' + firstNegative.adjustmentType : ''}`);
        console.log(`    Stock: ${firstNegative.previousStock} → ${firstNegative.newStock}`);
        if (firstNegative.notes) console.log(`    Notes: ${firstNegative.notes}`);
      }
    }

    // Step 3: Check parent-child relationships
    if (product.parentProductId) {
      const parent = await prisma.product.findUnique({
        where: { id: product.parentProductId },
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          estimatedLossPercentage: true,
        },
      });

      if (parent) {
        console.log(`\n  👆 Parent Product: ${parent.name} (SKU: ${parent.sku})`);
        console.log(`    Parent Stock: ${parent.currentStock}`);
        console.log(`    Parent Loss %: ${parent.estimatedLossPercentage ?? 'N/A'}`);

        // Check if parent is also negative
        if (parent.currentStock < 0) {
          console.log(`    🔴 Parent also has NEGATIVE stock! Root cause likely in parent.`);
        }

        // Expected subproduct stock based on parent
        const effectiveLoss = product.estimatedLossPercentage ?? parent.estimatedLossPercentage ?? 0;
        const expectedStock = Math.round(parent.currentStock * (1 - effectiveLoss / 100) * 100) / 100;
        console.log(`    Expected subproduct stock (from parent): ${expectedStock}`);
        if (Math.abs(expectedStock - product.currentStock) > 0.01) {
          console.log(`    ⚠️  Mismatch between expected (${expectedStock}) and actual (${product.currentStock})`);
        }

        // Pull parent's recent transactions too
        const parentTxns = await prisma.inventoryTransaction.findMany({
          where: { productId: parent.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            type: true,
            adjustmentType: true,
            quantity: true,
            previousStock: true,
            newStock: true,
            createdAt: true,
            notes: true,
            reversedAt: true,
          },
        });

        if (parentTxns.length > 0) {
          console.log(`\n  📋 Parent's Recent Transactions (last ${parentTxns.length}):`);
          for (const ptx of parentTxns) {
            const reversed = ptx.reversedAt ? ' [REVERSED]' : '';
            console.log(
              `    ${ptx.createdAt.toISOString()} | ` +
              `${ptx.type}${ptx.adjustmentType ? ':' + ptx.adjustmentType : ''} | ` +
              `qty: ${ptx.quantity >= 0 ? '+' : ''}${ptx.quantity} | ` +
              `stock: ${ptx.previousStock} → ${ptx.newStock}${reversed}`
            );
          }
        }
      } else {
        console.log(`\n  ⚠️  Parent product ${product.parentProductId} NOT FOUND (deleted?)`);
      }
    } else {
      // Root product — check if it has subproducts affected
      const subproducts = await prisma.product.findMany({
        where: { parentProductId: product.id },
        select: { id: true, name: true, currentStock: true, estimatedLossPercentage: true },
      });

      if (subproducts.length > 0) {
        console.log(`\n  👇 This root product has ${subproducts.length} subproduct(s):`);
        for (const sub of subproducts) {
          const flag = sub.currentStock < 0 ? ' 🔴 NEGATIVE' : '';
          console.log(`    - ${sub.name}: stock=${sub.currentStock}, loss=${sub.estimatedLossPercentage ?? 'N/A'}%${flag}`);
        }
      }
    }
  }

  // Step 4: Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const rootNegatives = negativeProducts.filter(p => !p.parentProductId);
  const subNegatives = negativeProducts.filter(p => p.parentProductId);

  console.log(`Total negative-stock products: ${negativeProducts.length}`);
  console.log(`  Root products: ${rootNegatives.length}`);
  console.log(`  Subproducts: ${subNegatives.length}`);

  if (subNegatives.length > 0) {
    // Check how many have negative parents
    const parentIds = [...new Set(subNegatives.map(p => p.parentProductId!))];
    const parents = await prisma.product.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, currentStock: true },
    });

    const negativeParents = parents.filter(p => p.currentStock < 0);
    console.log(`\n  Subproducts with negative parents: ${negativeParents.length}`);
    console.log(`  Subproducts with non-negative parents: ${subNegatives.length - negativeParents.length}`);
  }

  console.log('\nLikely root causes:');
  if (subNegatives.length > 0) {
    console.log('  - Subproduct recalculation propagated negative parent stock (no floor guard)');
  }
  if (rootNegatives.length > 0) {
    console.log('  - Direct stock consumption exceeded available stock (missing validation)');
    console.log('  - Possible race condition in concurrent packing operations');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
