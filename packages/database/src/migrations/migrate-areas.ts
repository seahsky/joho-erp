/**
 * Migration Script: Migrate Area Data from AreaTag Enum to Area Model
 *
 * This script migrates existing data to use the new Area model:
 * 1. Creates Area records for existing area tags (north, south, east, west)
 * 2. Updates SuburbAreaMapping with areaId from areaTag
 * 3. Updates DriverAreaAssignment with areaId from areaTag
 * 4. Updates Customer.deliveryAddress with areaId and areaName
 * 5. Updates Order.deliveryAddress with areaId and areaName
 *
 * Usage:
 *   Dry run (preview only):  npx tsx packages/database/src/migrations/migrate-areas.ts --dry-run
 *   Execute migration:       npx tsx packages/database/src/migrations/migrate-areas.ts
 */

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

// Area configurations matching the seed data
const areaConfigs = [
  { name: 'north', displayName: 'North', colorVariant: 'info', sortOrder: 1 },
  { name: 'south', displayName: 'South', colorVariant: 'success', sortOrder: 2 },
  { name: 'east', displayName: 'East', colorVariant: 'warning', sortOrder: 3 },
  { name: 'west', displayName: 'West', colorVariant: 'default', sortOrder: 4 },
];

async function migrateAreas() {
  console.log('🔄 Starting migration of area data to new Area model...');
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('');
  }

  try {
    // Step 1: Create or get existing Area records
    console.log('📍 Step 1: Creating/verifying Area records...');
    const areaMap = new Map<string, string>();

    for (const config of areaConfigs) {
      const existing = await prisma.area.findUnique({
        where: { name: config.name },
      });

      if (existing) {
        console.log(`   ✓ Area '${config.name}' already exists (ID: ${existing.id})`);
        areaMap.set(config.name, existing.id);
      } else if (isDryRun) {
        console.log(`   - Would create area '${config.name}'`);
        areaMap.set(config.name, `dry-run-${config.name}`);
      } else {
        const created = await prisma.area.create({
          data: config,
        });
        console.log(`   ✓ Created area '${config.name}' (ID: ${created.id})`);
        areaMap.set(config.name, created.id);
      }
    }
    console.log('');

    // Step 2: Update SuburbAreaMapping
    console.log('📍 Step 2: Updating SuburbAreaMapping records...');
    const suburbMappings = await prisma.suburbAreaMapping.findMany({
      where: {
        areaTag: { not: null },
        areaId: null,
      },
    });

    console.log(`   Found ${suburbMappings.length} suburb mappings to update`);

    if (!isDryRun && suburbMappings.length > 0) {
      let updatedSuburbs = 0;
      for (const mapping of suburbMappings) {
        const areaId = areaMap.get(mapping.areaTag as string);
        if (areaId) {
          await prisma.suburbAreaMapping.update({
            where: { id: mapping.id },
            data: { areaId },
          });
          updatedSuburbs++;
        }
      }
      console.log(`   ✓ Updated ${updatedSuburbs} suburb mappings`);
    }
    console.log('');

    // Step 3: Update DriverAreaAssignment
    console.log('📍 Step 3: Updating DriverAreaAssignment records...');
    const driverAssignments = await prisma.driverAreaAssignment.findMany({
      where: {
        areaTag: { not: null },
        areaId: null,
      },
    });

    console.log(`   Found ${driverAssignments.length} driver assignments to update`);

    if (!isDryRun && driverAssignments.length > 0) {
      let updatedAssignments = 0;
      for (const assignment of driverAssignments) {
        const areaId = areaMap.get(assignment.areaTag as string);
        if (areaId) {
          await prisma.driverAreaAssignment.update({
            where: { id: assignment.id },
            data: { areaId },
          });
          updatedAssignments++;
        }
      }
      console.log(`   ✓ Updated ${updatedAssignments} driver assignments`);
    }
    console.log('');

    // Step 4: Update Customer.deliveryAddress
    console.log('📍 Step 4: Updating Customer deliveryAddress records...');

    // Use raw MongoDB query to find customers with areaTag but without areaId
    const customersResult = await prisma.$runCommandRaw({
      find: 'Customer',
      filter: {
        'deliveryAddress.areaTag': { $ne: null },
        $or: [
          { 'deliveryAddress.areaId': null },
          { 'deliveryAddress.areaId': { $exists: false } },
        ],
      },
    }) as { cursor: { firstBatch: Array<{ _id: { $oid: string }; deliveryAddress: { areaTag: string } }> } };

    const customers = customersResult.cursor?.firstBatch || [];
    console.log(`   Found ${customers.length} customers to update`);

    if (!isDryRun && customers.length > 0) {
      for (const customer of customers) {
        const areaTag = customer.deliveryAddress?.areaTag;
        const areaId = areaMap.get(areaTag);
        if (areaId) {
          await prisma.$runCommandRaw({
            update: 'Customer',
            updates: [{
              q: { _id: { $oid: customer._id.$oid } },
              u: {
                $set: {
                  'deliveryAddress.areaId': areaId,
                  'deliveryAddress.areaName': areaTag,
                },
              },
            }],
          });
        }
      }
      console.log(`   ✓ Updated ${customers.length} customers`);
    }
    console.log('');

    // Step 5: Update Order.deliveryAddress
    console.log('📍 Step 5: Updating Order deliveryAddress records...');

    const ordersResult = await prisma.$runCommandRaw({
      find: 'Order',
      filter: {
        'deliveryAddress.areaTag': { $ne: null },
        $or: [
          { 'deliveryAddress.areaId': null },
          { 'deliveryAddress.areaId': { $exists: false } },
        ],
      },
    }) as { cursor: { firstBatch: Array<{ _id: { $oid: string }; orderNumber: string; deliveryAddress: { areaTag: string } }> } };

    const orders = ordersResult.cursor?.firstBatch || [];
    console.log(`   Found ${orders.length} orders to update`);

    if (!isDryRun && orders.length > 0) {
      for (const order of orders) {
        const areaTag = order.deliveryAddress?.areaTag;
        const areaId = areaMap.get(areaTag);
        if (areaId) {
          await prisma.$runCommandRaw({
            update: 'Order',
            updates: [{
              q: { _id: { $oid: order._id.$oid } },
              u: {
                $set: {
                  'deliveryAddress.areaId': areaId,
                  'deliveryAddress.areaName': areaTag,
                },
              },
            }],
          });
        }
      }
      console.log(`   ✓ Updated ${orders.length} orders`);
    }
    console.log('');

    // Step 6: Update Order.customDeliveryAddress (if exists)
    console.log('📍 Step 6: Updating Order customDeliveryAddress records...');

    const ordersWithCustomAddress = await prisma.$runCommandRaw({
      find: 'Order',
      filter: {
        'customDeliveryAddress.areaTag': { $ne: null },
        $or: [
          { 'customDeliveryAddress.areaId': null },
          { 'customDeliveryAddress.areaId': { $exists: false } },
        ],
      },
    }) as { cursor: { firstBatch: Array<{ _id: { $oid: string }; orderNumber: string; customDeliveryAddress: { areaTag: string } }> } };

    const ordersCustom = ordersWithCustomAddress.cursor?.firstBatch || [];
    console.log(`   Found ${ordersCustom.length} orders with custom delivery address to update`);

    if (!isDryRun && ordersCustom.length > 0) {
      for (const order of ordersCustom) {
        const areaTag = order.customDeliveryAddress?.areaTag;
        const areaId = areaMap.get(areaTag);
        if (areaId) {
          await prisma.$runCommandRaw({
            update: 'Order',
            updates: [{
              q: { _id: { $oid: order._id.$oid } },
              u: {
                $set: {
                  'customDeliveryAddress.areaId': areaId,
                  'customDeliveryAddress.areaName': areaTag,
                },
              },
            }],
          });
        }
      }
      console.log(`   ✓ Updated ${ordersCustom.length} orders with custom delivery address`);
    }
    console.log('');

    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   - Areas: ${areaConfigs.length} (created/verified)`);
    console.log(`   - Suburb Mappings: ${suburbMappings.length} updated`);
    console.log(`   - Driver Assignments: ${driverAssignments.length} updated`);
    console.log(`   - Customers: ${customers.length} updated`);
    console.log(`   - Orders (delivery address): ${orders.length} updated`);
    console.log(`   - Orders (custom address): ${ordersCustom.length} updated`);
    console.log('');

    if (isDryRun) {
      console.log('⚠️  DRY RUN COMPLETE - Run without --dry-run to apply changes');
    } else {
      console.log('🎉 Migration completed successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateAreas()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
