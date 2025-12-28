/**
 * Seed Script: Initialize RBAC permissions and role mappings
 *
 * This script:
 * 1. Creates all Permission records in the database
 * 2. Creates RolePermission mappings based on default role permissions
 *
 * Usage:
 *   Dry run (preview only):  npx tsx packages/database/scripts/seed-permissions.ts --dry-run
 *   Execute seeding:         npx tsx packages/database/scripts/seed-permissions.ts
 *   Force reseed:            npx tsx packages/database/scripts/seed-permissions.ts --force
 */

import { PrismaClient } from '../src/generated/prisma';
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  MODIFIABLE_ROLES,
} from '@joho-erp/shared';
import type { Permission } from '@joho-erp/shared';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

async function seedPermissions() {
  console.log('🔐 Starting RBAC permission seeding...');
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('');
  }

  try {
    // Check if permissions already exist
    const existingCount = await prisma.permission.count();
    if (existingCount > 0 && !isForce) {
      console.log(`ℹ️  Found ${existingCount} existing permissions.`);
      console.log('   Use --force to reseed all permissions.\n');

      // Just update role permissions
      await seedRolePermissions();
      return;
    }

    if (isForce && existingCount > 0) {
      console.log(`⚠️  Force mode: Deleting ${existingCount} existing permissions...\n`);
      if (!isDryRun) {
        await prisma.rolePermission.deleteMany({});
        await prisma.permission.deleteMany({});
      }
    }

    // Step 1: Create all permissions
    console.log('📝 Creating permission records...\n');

    const permissionsToCreate = ALL_PERMISSIONS.map((code) => {
      const def = PERMISSION_DEFINITIONS[code];
      return {
        code,
        module: def.module,
        action: def.action,
        description: def.description,
        isActive: true,
      };
    });

    if (!isDryRun) {
      // MongoDB doesn't support skipDuplicates, so use upserts
      for (const perm of permissionsToCreate) {
        await prisma.permission.upsert({
          where: { code: perm.code },
          update: {
            module: perm.module,
            action: perm.action,
            description: perm.description,
            isActive: perm.isActive,
          },
          create: perm,
        });
      }
    }

    console.log(`   ✅ Created ${permissionsToCreate.length} permissions\n`);

    // List permissions by module
    const moduleGroups = permissionsToCreate.reduce(
      (acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p.action);
        return acc;
      },
      {} as Record<string, string[]>
    );

    console.log('   Permissions by module:');
    for (const [module, actions] of Object.entries(moduleGroups)) {
      console.log(`   - ${module}: ${actions.join(', ')}`);
    }
    console.log('');

    // Step 2: Create role-permission mappings
    await seedRolePermissions();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedRolePermissions() {
  console.log('🔗 Creating role-permission mappings...\n');

  // Get all permission records with their IDs
  const permissionRecords = await prisma.permission.findMany({
    select: { id: true, code: true },
  });

  const permissionIdMap = new Map(permissionRecords.map((p) => [p.code, p.id]));

  // Process each role
  for (const role of MODIFIABLE_ROLES) {
    const permissions = DEFAULT_ROLE_PERMISSIONS[role];
    const validPermissions = permissions.filter((p) => permissionIdMap.has(p));

    if (!isDryRun) {
      // Delete existing mappings for this role
      await prisma.rolePermission.deleteMany({
        where: { role },
      });

      // Create new mappings
      await prisma.rolePermission.createMany({
        data: validPermissions.map((p) => ({
          role,
          permissionId: permissionIdMap.get(p)!,
          grantedBy: 'system-seed',
        })),
      });
    }

    console.log(`   ✅ ${role}: ${validPermissions.length} permissions assigned`);
  }

  // Admin note
  console.log(`\n   ℹ️  admin: All permissions (${ALL_PERMISSIONS.length}) - hardcoded superuser\n`);

  console.log('✨ Seeding complete!\n');
}

// Run the seeding
seedPermissions()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
