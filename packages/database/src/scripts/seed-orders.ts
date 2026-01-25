/**
 * Database Seed Script: Create Test Orders
 *
 * This script creates one order for every customer in the database,
 * using existing products and respecting customer-specific pricing.
 *
 * Usage:
 *   pnpm db:seed-orders --dry-run              # Preview orders to be created
 *   pnpm db:seed-orders --count 10 --confirm   # Create orders for 10 customers
 *   pnpm db:seed-orders --confirm              # Create orders for all customers
 */

import { PrismaClient, OrderStatus } from '../generated/prisma';
import * as dotenv from 'dotenv';
import {
  createMoney,
  multiplyMoney,
  toCents,
  generateOrderNumber,
  calculateOrderTotals,
  isCustomPriceValid,
} from '@joho-erp/shared';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// ============================================================================
// Types
// ============================================================================

interface CustomerPricingData {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerWithPricing {
  id: string;
  businessName: string;
  clerkUserId: string;
  deliveryAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
    areaId: string | null;
    areaName: string | null;
    latitude: number | null;
    longitude: number | null;
    deliveryInstructions: string | null;
  };
  customerPricing: CustomerPricingData[];
}

interface ProductData {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  unit: string;
  applyGst: boolean;
  gstRate: number | null;
}

interface GeneratedOrderItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number; // in cents
  subtotal: number; // in cents
  applyGst: boolean;
  gstRate: number | null;
}

interface GeneratedOrder {
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: GeneratedOrderItem[];
  subtotal: number; // in cents
  taxAmount: number; // in cents
  totalAmount: number; // in cents
  deliveryAddress: CustomerWithPricing['deliveryAddress'];
  requestedDeliveryDate: Date;
  status: OrderStatus;
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy: string;
    changedByName: string | null;
    changedByEmail: string | null;
    notes: string | null;
  }>;
  orderedAt: Date;
  createdBy: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the next valid delivery date (skip Sundays)
 */
function getNextValidDeliveryDate(): Date {
  const date = new Date();
  // Add 1-3 days randomly
  date.setDate(date.getDate() + Math.floor(Math.random() * 3) + 1);

  // Skip Sunday (0)
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  // Set to 8:00 AM
  date.setHours(8, 0, 0, 0);

  return date;
}

/**
 * Get the effective price for a product considering customer-specific pricing
 */
function getEffectivePrice(
  product: ProductData,
  customerPricing: CustomerWithPricing['customerPricing']
): number {
  // Find custom pricing for this product
  const customPricing = customerPricing.find((cp) => cp.productId === product.id);

  if (customPricing && isCustomPriceValid(customPricing)) {
    return customPricing.customPrice;
  }

  return product.basePrice;
}

/**
 * Generate a random quantity based on unit type
 */
function generateQuantity(unit: string): number {
  if (unit.toLowerCase() === 'kg') {
    // For kg products: 0.5 - 5.0 kg with 0.5 increments
    const increments = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    return increments[Math.floor(Math.random() * increments.length)];
  }
  // For piece/box/carton: 1-10 units
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Generate order items for a customer
 */
function generateOrderItems(
  products: ProductData[],
  customerPricing: CustomerWithPricing['customerPricing']
): GeneratedOrderItem[] {
  // Select 1-5 random products
  const numItems = Math.floor(Math.random() * 5) + 1;
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
  const selectedProducts = shuffledProducts.slice(0, numItems);

  const items: GeneratedOrderItem[] = [];

  for (const product of selectedProducts) {
    const quantity = generateQuantity(product.unit);
    const unitPrice = getEffectivePrice(product, customerPricing);

    // Calculate subtotal using dinero
    const unitPriceMoney = createMoney(unitPrice);
    const subtotalMoney = multiplyMoney(unitPriceMoney, quantity);
    const subtotal = toCents(subtotalMoney);

    items.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      unit: product.unit,
      quantity,
      unitPrice,
      subtotal,
      applyGst: product.applyGst,
      gstRate: product.gstRate,
    });
  }

  return items;
}

/**
 * Generate an order for a customer
 */
function generateOrder(customer: CustomerWithPricing, products: ProductData[]): GeneratedOrder {
  const orderNumber = generateOrderNumber();
  const items = generateOrderItems(products, customer.customerPricing);
  const orderedAt = new Date();

  // Calculate totals using the shared utility (handles per-item GST)
  const totals = calculateOrderTotals(items);

  const statusHistory = [
    {
      status: 'confirmed',
      changedAt: orderedAt,
      changedBy: 'seed_script',
      changedByName: 'Seed Script',
      changedByEmail: null,
      notes: 'Order created by seed script',
    },
  ];

  return {
    orderNumber,
    customerId: customer.id,
    customerName: customer.businessName,
    items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    deliveryAddress: customer.deliveryAddress,
    requestedDeliveryDate: getNextValidDeliveryDate(),
    status: OrderStatus.confirmed,
    statusHistory,
    orderedAt,
    createdBy: customer.clerkUserId,
  };
}

// ============================================================================
// Main Script
// ============================================================================

function printUsage(): void {
  console.log(`
Database Seed Script: Create Test Orders

Creates one order for every customer in the database, using existing
products and respecting customer-specific pricing.

Usage:
  pnpm db:seed-orders --dry-run              Preview orders to be created
  pnpm db:seed-orders --count 10 --confirm   Create orders for 10 customers
  pnpm db:seed-orders --confirm              Create orders for all customers

Flags:
  --dry-run     Preview orders without creating them
  --confirm     Execute the seeding (required for safety)
  --count N     Limit to N customers (default: all active customers)
  --help        Show this help message

Features:
  - Respects customer-specific pricing (CustomerPricing)
  - Uses validated effective date ranges
  - Per-item GST calculation
  - Realistic quantity generation based on unit type
  - Proper delivery date scheduling (excludes Sundays)
`);
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function printOrderPreview(order: GeneratedOrder, index: number): void {
  console.log(`
  ─────────────────────────────────────────────────────────
  Order #${index + 1}: ${order.orderNumber}
  ─────────────────────────────────────────────────────────
  Customer:      ${order.customerName}
  Delivery:      ${order.deliveryAddress.suburb}, ${order.deliveryAddress.state}
  Delivery Date: ${order.requestedDeliveryDate.toDateString()}

  Items (${order.items.length}):
${order.items
  .map(
    (item) =>
      `    - ${item.sku}: ${item.productName}
      ${item.quantity} ${item.unit} @ ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.subtotal)}${item.applyGst ? ' +GST' : ''}`
  )
  .join('\n')}

  Subtotal:      ${formatCurrency(order.subtotal)}
  GST:           ${formatCurrency(order.taxAmount)}
  Total:         ${formatCurrency(order.totalAmount)}
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const isDryRun = args.includes('--dry-run');
  const isConfirmed = args.includes('--confirm');
  const showHelp = args.includes('--help') || args.includes('-h');

  // Parse count argument
  const countIndex = args.indexOf('--count');
  const countArg = countIndex !== -1 && args[countIndex + 1] ? parseInt(args[countIndex + 1], 10) : null;

  if (countArg !== null && (isNaN(countArg) || countArg < 1)) {
    console.error('\n  Error: --count must be a positive number\n');
    process.exit(1);
  }

  // Show help if requested or no valid arguments
  if (showHelp || (!isDryRun && !isConfirmed)) {
    printUsage();
    process.exit(showHelp ? 0 : 1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('   DATABASE SEED: Create Test Orders');
  console.log('='.repeat(60));

  try {
    // Connect to database
    console.log('\nConnecting to database...');
    await prisma.$connect();
    console.log('Connected successfully.');

    // Fetch active customers with their custom pricing
    console.log('\nFetching active customers...');
    const customersQuery = {
      where: { status: 'active' as const },
      include: {
        customerPricing: {
          select: {
            id: true,
            customerId: true,
            productId: true,
            customPrice: true,
            effectiveFrom: true,
            effectiveTo: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      take: countArg ?? undefined,
    };

    const customers = (await prisma.customer.findMany(customersQuery)) as unknown as CustomerWithPricing[];
    console.log(`  Found ${customers.length} active customers${countArg ? ` (limited to ${countArg})` : ''}`);

    if (customers.length === 0) {
      console.log('\n  No active customers found. Run seed-customers first.\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Fetch active products (exclude subproducts)
    console.log('\nFetching active products...');
    const products = (await prisma.product.findMany({
      where: {
        status: 'active',
        parentProductId: null, // Exclude subproducts
      },
      select: {
        id: true,
        sku: true,
        name: true,
        basePrice: true,
        unit: true,
        applyGst: true,
        gstRate: true,
      },
    })) as ProductData[];
    console.log(`  Found ${products.length} active products`);

    if (products.length === 0) {
      console.log('\n  No active products found. Please seed products first.\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Check existing orders
    const existingCount = await prisma.order.count();
    console.log(`  Existing orders in database: ${existingCount}`);

    // Generate orders
    console.log(`\nGenerating ${customers.length} orders...`);
    const orders: GeneratedOrder[] = [];

    for (const customer of customers) {
      const order = generateOrder(customer, products);
      orders.push(order);
    }

    // Preview orders
    if (isDryRun) {
      console.log('\n' + '─'.repeat(60));
      console.log('  DRY RUN MODE - No changes will be made');
      console.log('─'.repeat(60));

      for (let i = 0; i < Math.min(orders.length, 3); i++) {
        printOrderPreview(orders[i], i);
      }

      if (orders.length > 3) {
        console.log(`\n  ... and ${orders.length - 3} more orders`);
      }

      // Summary statistics
      const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0);
      const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const avgOrderValue = Math.round(totalValue / orders.length);
      const ordersWithGst = orders.filter((o) => o.taxAmount > 0).length;

      // Check how many orders have custom pricing applied
      let customPricingCount = 0;
      for (const order of orders) {
        const customer = customers.find((c) => c.id === order.customerId);
        if (customer) {
          for (const item of order.items) {
            const customPricing = customer.customerPricing.find((cp) => cp.productId === item.productId);
            if (customPricing && isCustomPriceValid(customPricing)) {
              customPricingCount++;
              break; // Count customer once if they have any custom pricing
            }
          }
        }
      }

      console.log('\n  Summary:');
      console.log(`    Orders to create:       ${orders.length}`);
      console.log(`    Total items:            ${totalItems} (avg ${(totalItems / orders.length).toFixed(1)} per order)`);
      console.log(`    Total value:            ${formatCurrency(totalValue)}`);
      console.log(`    Average order value:    ${formatCurrency(avgOrderValue)}`);
      console.log(`    Orders with GST:        ${ordersWithGst}/${orders.length}`);
      console.log(`    With custom pricing:    ${customPricingCount}/${orders.length}`);
      console.log('\n  Run with --confirm to create these orders.\n');

      await prisma.$disconnect();
      process.exit(0);
    }

    // Create orders
    console.log('\n' + '─'.repeat(60));
    console.log('  CREATING ORDERS');
    console.log('─'.repeat(60));

    let created = 0;

    for (const order of orders) {
      await prisma.order.create({
        data: {
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          items: order.items,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          requestedDeliveryDate: order.requestedDeliveryDate,
          status: order.status,
          statusHistory: order.statusHistory,
          orderedAt: order.orderedAt,
          createdBy: order.createdBy,
        },
      });

      created++;
      console.log(
        `  [${created}/${orders.length}] Created: ${order.orderNumber} for ${order.customerName} (${formatCurrency(order.totalAmount)})`
      );
    }

    // Success summary
    const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    console.log('\n' + '='.repeat(60));
    console.log('   SEEDING COMPLETED');
    console.log('='.repeat(60));
    console.log(`\n  - Created: ${created} orders`);
    console.log(`  - Total value: ${formatCurrency(totalValue)}`);
    console.log(`  - Total orders in database: ${existingCount + created}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('   SEEDING FAILED');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`\n  Error: ${error.message}`);
      if (error.stack) {
        console.error(`\n  Stack trace:\n${error.stack}`);
      }
    } else {
      console.error('\n  Unknown error:', error);
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
main();
