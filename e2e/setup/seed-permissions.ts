import type { PrismaClient } from '@joho-erp/database';
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} from '@joho-erp/shared';

/**
 * Seeds Permission and RolePermission records.
 * This is critical — the PermissionProvider component queries `permission.getMyPermissions`
 * on page load. Without seeded permissions, all <PermissionGate> components hide their children.
 */
export async function seedPermissions(prisma: PrismaClient) {
  // Create all permission records
  const permissionRecords: Record<string, string> = {};

  for (const code of ALL_PERMISSIONS) {
    const def = PERMISSION_DEFINITIONS[code];
    const record = await prisma.permission.create({
      data: {
        module: def.module,
        action: def.action,
        code,
        description: def.description,
        isActive: true,
      },
    });
    permissionRecords[code] = record.id;
  }

  // Create role-permission mappings for all roles
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permCode of permissions) {
      const permissionId = permissionRecords[permCode];
      if (permissionId) {
        await prisma.rolePermission.create({
          data: {
            role,
            permissionId,
            grantedBy: 'e2e-setup',
          },
        });
      }
    }
  }

  console.log(
    `[E2E Setup] Seeded ${ALL_PERMISSIONS.length} permissions and ` +
    `${Object.entries(DEFAULT_ROLE_PERMISSIONS).reduce((acc, [, perms]) => acc + perms.length, 0)} role-permission mappings.`
  );
}
