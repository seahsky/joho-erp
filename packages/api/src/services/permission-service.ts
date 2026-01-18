/**
 * Permission Service
 *
 * Provides permission checking functionality with caching for the RBAC system.
 */

import { prisma } from '@joho-erp/database';
import type { Permission, UserRole } from '@joho-erp/shared';
import { ALL_PERMISSIONS } from '@joho-erp/shared';

// Cache for role permissions (TTL: 5 minutes)
const permissionCache = new Map<string, { permissions: Permission[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all permissions for a role (with caching)
 */
export async function getRolePermissions(role: UserRole): Promise<Permission[]> {
  // Admin always has all permissions
  if (role === 'admin') {
    return ALL_PERMISSIONS;
  }

  // Check cache
  const cached = permissionCache.get(role);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  // Fetch from database
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role },
    include: {
      permission: {
        select: { code: true, isActive: true },
      },
    },
  });

  const permissions = rolePermissions
    .filter((rp) => rp.permission.isActive)
    .map((rp) => rp.permission.code as Permission);

  // Update cache
  permissionCache.set(role, { permissions, timestamp: Date.now() });

  return permissions;
}

/**
 * Check if a role has a specific permission
 */
export async function hasPermission(role: UserRole, permission: Permission): Promise<boolean> {
  if (role === 'admin') return true;

  const permissions = await getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has ANY of the specified permissions
 */
export async function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): Promise<boolean> {
  if (role === 'admin') return true;

  const rolePermissions = await getRolePermissions(role);
  return permissions.some((p) => rolePermissions.includes(p));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export async function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): Promise<boolean> {
  if (role === 'admin') return true;

  const rolePermissions = await getRolePermissions(role);
  return permissions.every((p) => rolePermissions.includes(p));
}

/**
 * Clear permission cache (call after permission updates)
 */
export function clearPermissionCache(role?: string): void {
  if (role) {
    permissionCache.delete(role);
  } else {
    permissionCache.clear();
  }
}

/**
 * Get all permissions for all roles (for admin UI)
 */
export async function getAllRolePermissions(): Promise<Record<string, Permission[]>> {
  const allRolePermissions = await prisma.rolePermission.findMany({
    include: {
      permission: {
        select: { code: true, isActive: true },
      },
    },
  });

  const result: Record<string, Permission[]> = {};

  for (const rp of allRolePermissions) {
    if (!rp.permission.isActive) continue;

    if (!result[rp.role]) {
      result[rp.role] = [];
    }
    result[rp.role].push(rp.permission.code as Permission);
  }

  return result;
}

/**
 * Get cache stats for debugging
 */
export function getPermissionCacheStats(): {
  size: number;
  entries: Array<{ role: string; age: number; count: number }>;
} {
  const now = Date.now();
  const entries: Array<{ role: string; age: number; count: number }> = [];

  for (const [role, cached] of permissionCache) {
    entries.push({
      role,
      age: Math.round((now - cached.timestamp) / 1000), // seconds
      count: cached.permissions.length,
    });
  }

  return {
    size: permissionCache.size,
    entries,
  };
}
