// Seed validation utilities
import { prisma } from './prisma';

/**
 * Validation utilities for seed data integrity
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalOrders?: number;
    totalCustomers?: number;
    totalProducts?: number;
    totalPricing?: number;
    totalInventoryTransactions?: number;
    orphanedOrders?: number;
    orphanedOrderItems?: number;
    orphanedPricing?: number;
    orphanedInventoryTransactions?: number;
  };
}

/**
 * Validate that all Order.customerId references exist in Customer table
 */
async function validateOrderCustomers(): Promise<{ errors: string[]; warnings: string[]; orphanCount: number }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all orders
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true, customerId: true },
  });

  // Get all customer IDs
  const customers = await prisma.customer.findMany({
    select: { id: true },
  });
  const customerIds = new Set(customers.map(c => c.id));

  // Find orphaned orders
  const orphanedOrders = orders.filter(order => !customerIds.has(order.customerId));

  if (orphanedOrders.length > 0) {
    errors.push(`Found ${orphanedOrders.length} orders with non-existent customers:`);
    orphanedOrders.forEach(order => {
      errors.push(`  - Order ${order.orderNumber} (${order.id}) references customer ${order.customerId}`);
    });
  }

  return { errors, warnings, orphanCount: orphanedOrders.length };
}

/**
 * Validate that all OrderItem.productId references exist in Product table
 */
async function validateOrderItems(): Promise<{ errors: string[]; warnings: string[]; orphanCount: number }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all orders with items
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true, items: true },
  });

  // Get all product IDs
  const products = await prisma.product.findMany({
    select: { id: true },
  });
  const productIds = new Set(products.map(p => p.id));

  // Find orphaned order items
  let orphanCount = 0;
  for (const order of orders) {
    for (const item of order.items) {
      if (!productIds.has(item.productId)) {
        errors.push(`  - Order ${order.orderNumber} item references non-existent product ${item.productId} (SKU: ${item.sku})`);
        orphanCount++;
      }
    }
  }

  if (orphanCount > 0) {
    errors.unshift(`Found ${orphanCount} order items with non-existent products:`);
  }

  return { errors, warnings, orphanCount };
}

/**
 * Validate that all CustomerPricing references exist
 */
async function validateCustomerPricing(): Promise<{ errors: string[]; warnings: string[]; orphanCount: number }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all pricing records
  const pricingRecords = await prisma.customerPricing.findMany({
    select: { id: true, customerId: true, productId: true },
  });

  // Get all customer and product IDs
  const customers = await prisma.customer.findMany({ select: { id: true } });
  const products = await prisma.product.findMany({ select: { id: true } });
  const customerIds = new Set(customers.map(c => c.id));
  const productIds = new Set(products.map(p => p.id));

  // Find orphaned pricing records
  let orphanCount = 0;
  for (const pricing of pricingRecords) {
    if (!customerIds.has(pricing.customerId)) {
      errors.push(`  - Pricing ${pricing.id} references non-existent customer ${pricing.customerId}`);
      orphanCount++;
    }
    if (!productIds.has(pricing.productId)) {
      errors.push(`  - Pricing ${pricing.id} references non-existent product ${pricing.productId}`);
      orphanCount++;
    }
  }

  if (orphanCount > 0) {
    errors.unshift(`Found ${orphanCount} customer pricing records with invalid references:`);
  }

  return { errors, warnings, orphanCount };
}

/**
 * Validate that all InventoryTransaction.productId references exist
 */
async function validateInventoryTransactions(): Promise<{ errors: string[]; warnings: string[]; orphanCount: number }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all inventory transactions
  const transactions = await prisma.inventoryTransaction.findMany({
    select: { id: true, productId: true, type: true, referenceId: true },
  });

  // Get all product IDs
  const products = await prisma.product.findMany({ select: { id: true } });
  const productIds = new Set(products.map(p => p.id));

  // Find orphaned transactions
  let orphanCount = 0;
  for (const transaction of transactions) {
    if (!productIds.has(transaction.productId)) {
      errors.push(`  - Transaction ${transaction.id} (${transaction.type}) references non-existent product ${transaction.productId}`);
      orphanCount++;
    }
  }

  if (orphanCount > 0) {
    errors.unshift(`Found ${orphanCount} inventory transactions with non-existent products:`);
  }

  // Warning: Check for sale transactions with invalid order references
  const orders = await prisma.order.findMany({ select: { id: true } });
  const orderIds = new Set(orders.map(o => o.id));

  const saleTransactions = transactions.filter(t => t.type === 'sale' && t.referenceId);
  let invalidOrderReferences = 0;
  for (const transaction of saleTransactions) {
    if (transaction.referenceId && !orderIds.has(transaction.referenceId)) {
      warnings.push(`  - Sale transaction ${transaction.id} references non-existent order ${transaction.referenceId}`);
      invalidOrderReferences++;
    }
  }

  if (invalidOrderReferences > 0) {
    warnings.unshift(`Found ${invalidOrderReferences} sale transactions with invalid order references (soft references):`);
  }

  return { errors, warnings, orphanCount };
}

/**
 * Run all validations and return comprehensive results
 */
export async function validateSeedData(): Promise<ValidationResult> {
  console.log('🔍 Validating seed data relationships...\n');

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Get counts
  const [orderCount, customerCount, productCount, pricingCount, transactionCount] = await Promise.all([
    prisma.order.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.customerPricing.count(),
    prisma.inventoryTransaction.count(),
  ]);

  console.log('📊 Current database state:');
  console.log(`   - Customers: ${customerCount}`);
  console.log(`   - Products: ${productCount}`);
  console.log(`   - Orders: ${orderCount}`);
  console.log(`   - Customer Pricing: ${pricingCount}`);
  console.log(`   - Inventory Transactions: ${transactionCount}\n`);

  // Run validations
  const [orderValidation, itemValidation, pricingValidation, transactionValidation] = await Promise.all([
    validateOrderCustomers(),
    validateOrderItems(),
    validateCustomerPricing(),
    validateInventoryTransactions(),
  ]);

  // Collect errors and warnings
  allErrors.push(...orderValidation.errors);
  allErrors.push(...itemValidation.errors);
  allErrors.push(...pricingValidation.errors);
  allErrors.push(...transactionValidation.errors);

  allWarnings.push(...orderValidation.warnings);
  allWarnings.push(...itemValidation.warnings);
  allWarnings.push(...pricingValidation.warnings);
  allWarnings.push(...transactionValidation.warnings);

  const isValid = allErrors.length === 0;

  return {
    isValid,
    errors: allErrors,
    warnings: allWarnings,
    stats: {
      totalOrders: orderCount,
      totalCustomers: customerCount,
      totalProducts: productCount,
      totalPricing: pricingCount,
      totalInventoryTransactions: transactionCount,
      orphanedOrders: orderValidation.orphanCount,
      orphanedOrderItems: itemValidation.orphanCount,
      orphanedPricing: pricingValidation.orphanCount,
      orphanedInventoryTransactions: transactionValidation.orphanCount,
    },
  };
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  if (result.isValid) {
    console.log('✅ All relationship validations passed!');
    console.log('   No orphaned records found.\n');
  } else {
    console.log('❌ Validation failed! Found orphaned records:\n');

    if (result.errors.length > 0) {
      console.log('🔴 ERRORS:');
      result.errors.forEach(error => console.log(error));
      console.log('');
    }
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.forEach(warning => console.log(warning));
    console.log('');
  }

  console.log('📊 Summary:');
  console.log(`   - Total Customers: ${result.stats.totalCustomers}`);
  console.log(`   - Total Products: ${result.stats.totalProducts}`);
  console.log(`   - Total Orders: ${result.stats.totalOrders}`);
  console.log(`   - Total Customer Pricing: ${result.stats.totalPricing}`);
  console.log(`   - Total Inventory Transactions: ${result.stats.totalInventoryTransactions}`);
  console.log('');
  console.log(`   - Orphaned Orders: ${result.stats.orphanedOrders || 0}`);
  console.log(`   - Orphaned Order Items: ${result.stats.orphanedOrderItems || 0}`);
  console.log(`   - Orphaned Pricing Records: ${result.stats.orphanedPricing || 0}`);
  console.log(`   - Orphaned Inventory Transactions: ${result.stats.orphanedInventoryTransactions || 0}`);
  console.log('');

  console.log('='.repeat(80) + '\n');
}

/**
 * Check for existing data before seeding
 */
export async function checkExistingData(): Promise<boolean> {
  const [orderCount, customerCount, productCount] = await Promise.all([
    prisma.order.count(),
    prisma.customer.count(),
    prisma.product.count(),
  ]);

  const hasData = orderCount > 0 || customerCount > 0 || productCount > 0;

  if (hasData) {
    console.log('⚠️  Existing data detected:');
    console.log(`   - Customers: ${customerCount}`);
    console.log(`   - Products: ${productCount}`);
    console.log(`   - Orders: ${orderCount}\n`);
  }

  return hasData;
}
