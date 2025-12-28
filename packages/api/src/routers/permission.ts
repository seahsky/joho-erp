/**
 * Permission Router
 *
 * Provides API endpoints for managing RBAC permissions.
 */

import { z } from 'zod';
import { router, isAdmin, protectedProcedure } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import {
  getRolePermissions,
  getAllRolePermissions,
  clearPermissionCache,
} from '../services/permission-service';
import { isValidPermission, MODIFIABLE_ROLES, INTERNAL_ROLES } from '@joho-erp/shared';
import type { Permission } from '@joho-erp/shared';

export const permissionRouter = router({
  /**
   * Get current user's permissions
   *
   * Returns the list of permissions for the authenticated user.
   * Used by the frontend to check permissions client-side.
   */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await getRolePermissions(ctx.userRole);
    return {
      role: ctx.userRole,
      permissions,
      isAdmin: ctx.userRole === 'admin',
    };
  }),

  /**
   * Get all available permissions with definitions
   *
   * Returns all permissions in the system with their metadata.
   * Admin only - used for the permission management UI.
   */
  getAllPermissions: isAdmin.query(async () => {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id,
      code: p.code as Permission,
      module: p.module,
      action: p.action,
      description: p.description,
    }));
  }),

  /**
   * Get role-permission matrix
   *
   * Returns a matrix of all roles and their permissions.
   * Admin only - used for the permission management UI.
   */
  getRolePermissionMatrix: isAdmin.query(async () => {
    const rolePermissions = await getAllRolePermissions();
    const allPermissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group permissions by module
    const moduleGroups: Record<
      string,
      Array<{
        id: string;
        code: string;
        module: string;
        action: string;
        description: string | null;
      }>
    > = {};

    for (const perm of allPermissions) {
      if (!moduleGroups[perm.module]) {
        moduleGroups[perm.module] = [];
      }
      moduleGroups[perm.module].push({
        id: perm.id,
        code: perm.code,
        module: perm.module,
        action: perm.action,
        description: perm.description,
      });
    }

    return {
      roles: INTERNAL_ROLES,
      modules: moduleGroups,
      rolePermissions,
    };
  }),

  /**
   * Update permissions for a role
   *
   * Bulk updates all permissions for a specific role.
   * Admin only.
   */
  updateRolePermissions: isAdmin
    .input(
      z.object({
        role: z.enum(MODIFIABLE_ROLES), // Cannot modify admin
        permissions: z.array(z.string()), // Permission codes
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { role, permissions } = input;

      // Validate all permission codes
      const invalidCodes = permissions.filter((p) => !isValidPermission(p));
      if (invalidCodes.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid permission codes: ${invalidCodes.join(', ')}`,
        });
      }

      // Get permission IDs
      const permissionRecords = await prisma.permission.findMany({
        where: { code: { in: permissions } },
        select: { id: true, code: true },
      });

      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing role permissions
        await tx.rolePermission.deleteMany({
          where: { role },
        });

        // Create new role permissions
        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map((p) => ({
              role,
              permissionId: p.id,
              grantedBy: ctx.userId,
            })),
          });
        }
      });

      // Clear cache for this role
      clearPermissionCache(role);

      return { success: true, permissionsUpdated: permissions.length };
    }),

  /**
   * Toggle single permission for a role
   *
   * Enables or disables a single permission for a role.
   * Admin only.
   */
  togglePermission: isAdmin
    .input(
      z.object({
        role: z.enum(MODIFIABLE_ROLES),
        permissionCode: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { role, permissionCode, enabled } = input;

      if (!isValidPermission(permissionCode)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid permission code',
        });
      }

      const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
      });

      if (!permission) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Permission not found in database. Run the seed script first.',
        });
      }

      if (enabled) {
        // Grant permission
        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role,
              permissionId: permission.id,
            },
          },
          update: {
            grantedBy: ctx.userId,
            grantedAt: new Date(),
          },
          create: {
            role,
            permissionId: permission.id,
            grantedBy: ctx.userId,
          },
        });
      } else {
        // Revoke permission
        await prisma.rolePermission.deleteMany({
          where: {
            role,
            permissionId: permission.id,
          },
        });
      }

      // Clear cache
      clearPermissionCache(role);

      return { success: true };
    }),

  /**
   * Reset role permissions to defaults
   *
   * Resets all permissions for a role to the default values.
   * Admin only.
   */
  resetRoleToDefaults: isAdmin
    .input(
      z.object({
        role: z.enum(MODIFIABLE_ROLES),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { role } = input;

      // Get default permissions for this role
      const { DEFAULT_ROLE_PERMISSIONS } = await import('@joho-erp/shared');
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role];

      // Get permission IDs
      const permissionRecords = await prisma.permission.findMany({
        where: { code: { in: defaultPerms } },
        select: { id: true, code: true },
      });

      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing role permissions
        await tx.rolePermission.deleteMany({
          where: { role },
        });

        // Create default role permissions
        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map((p) => ({
              role,
              permissionId: p.id,
              grantedBy: ctx.userId,
            })),
          });
        }
      });

      // Clear cache
      clearPermissionCache(role);

      return { success: true, permissionsReset: defaultPerms.length };
    }),
});
