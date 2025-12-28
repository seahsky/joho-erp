# RBAC Implementation Guide

## Overview

This document provides a comprehensive guide for the modularized Role-Based Access Control (RBAC) system in the Joho ERP admin portal. The system provides granular permission control at the module + action level.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Portal (Frontend)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ PermissionGate  │  │ usePermission() │  │PermissionProvider│ │
│  │   Component     │  │     Hook        │  │    Context       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┴────────────────────┘            │
│                               │                                   │
│                    ┌──────────▼──────────┐                       │
│                    │  tRPC API Client    │                       │
└────────────────────┼─────────────────────┼───────────────────────┘
                     │                     │
┌────────────────────┼─────────────────────┼───────────────────────┐
│                    │   API Layer         │                       │
│           ┌────────▼─────────┐  ┌────────▼─────────┐            │
│           │ requirePermission│  │ Permission Router │            │
│           │   Middleware     │  │   (CRUD API)     │            │
│           └────────┬─────────┘  └────────┬─────────┘            │
│                    │                     │                       │
│           ┌────────▼─────────────────────▼─────────┐            │
│           │         Permission Service              │            │
│           │    (Caching + Permission Checks)        │            │
│           └────────────────────┬────────────────────┘            │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                    Database    │                                  │
│           ┌────────────────────▼────────────────────┐            │
│           │  Permission    │    RolePermission      │            │
│           │  (42 records)  │    (role mappings)     │            │
│           └─────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Frontend**: `PermissionProvider` fetches user permissions on mount
2. **UI Components**: Use `PermissionGate` or `usePermission()` for conditional rendering
3. **API Calls**: `requirePermission()` middleware validates permissions server-side
4. **Permission Service**: Checks database with 5-minute cache
5. **Database**: Stores `Permission` definitions and `RolePermission` mappings

---

## Complete Permission Matrix

### All 42 Permissions

| Permission Code | Module | Action | Description | Default Roles |
|-----------------|--------|--------|-------------|---------------|
| `dashboard:view` | dashboard | view | View dashboard analytics and overview | admin, sales, manager |
| `customers:view` | customers | view | View customer list and details | admin, sales, manager |
| `customers:create` | customers | create | Create new customers | admin, sales |
| `customers:edit` | customers | edit | Edit customer information | admin, sales, manager |
| `customers:delete` | customers | delete | Delete customers | admin |
| `customers:approve_credit` | customers | approve_credit | Approve customer credit applications | admin, manager |
| `customers:suspend` | customers | suspend | Suspend or reactivate customers | admin |
| `orders:view` | orders | view | View order list and details | admin, sales, manager |
| `orders:create` | orders | create | Create orders on behalf of customers | admin, sales |
| `orders:edit` | orders | edit | Edit order details | admin, sales |
| `orders:confirm` | orders | confirm | Confirm pending orders | admin, sales, manager |
| `orders:cancel` | orders | cancel | Cancel orders | admin, manager |
| `orders:approve_backorder` | orders | approve_backorder | Approve or reject backorders | admin, manager |
| `products:view` | products | view | View product catalog | admin, sales, manager, packer |
| `products:create` | products | create | Create new products | admin |
| `products:edit` | products | edit | Edit product information | admin, manager |
| `products:delete` | products | delete | Delete products | admin |
| `products:adjust_stock` | products | adjust_stock | Adjust product stock levels | admin, manager |
| `inventory:view` | inventory | view | View inventory levels and history | admin, manager |
| `inventory:adjust` | inventory | adjust | Make inventory adjustments | admin, manager |
| `pricing:view` | pricing | view | View customer-specific pricing | admin, sales, manager |
| `pricing:create` | pricing | create | Create pricing rules | admin, sales |
| `pricing:edit` | pricing | edit | Edit pricing rules | admin, sales, manager |
| `pricing:delete` | pricing | delete | Delete pricing rules | admin |
| `packing:view` | packing | view | View packing queue and status | admin, manager, packer |
| `packing:manage` | packing | manage | Manage packing sessions (pause/resume/reset) | admin, manager, packer |
| `deliveries:view` | deliveries | view | View delivery schedule and routes | admin, sales, manager, driver |
| `deliveries:manage` | deliveries | manage | Manage delivery assignments | admin, manager |
| `driver:view` | driver | view | View assigned deliveries | admin, driver |
| `driver:complete` | driver | complete | Complete deliveries | admin, driver |
| `driver:upload_pod` | driver | upload_pod | Upload proof of delivery | admin, driver |
| `settings:view` | settings | view | View settings | admin, sales, manager |
| `settings:edit` | settings | edit | Edit general settings | admin |
| `settings.users:view` | settings.users | view | View user list | admin |
| `settings.users:create` | settings.users | create | Invite new users | admin |
| `settings.users:edit` | settings.users | edit | Edit user roles | admin |
| `settings.users:delete` | settings.users | delete | Deactivate users | admin |
| `settings.company:view` | settings.company | view | View company information | admin, manager |
| `settings.company:edit` | settings.company | edit | Edit company information | admin |
| `settings.delivery:view` | settings.delivery | view | View delivery settings | admin, manager |
| `settings.delivery:edit` | settings.delivery | edit | Edit delivery settings | admin |
| `settings.integrations:view` | settings.integrations | view | View integrations | admin |
| `settings.integrations:edit` | settings.integrations | edit | Configure integrations | admin |
| `settings.notifications:view` | settings.notifications | view | View notification settings | admin |
| `settings.notifications:edit` | settings.notifications | edit | Edit notification settings | admin |
| `settings.xero:view` | settings.xero | view | View Xero sync status | admin, manager |
| `settings.xero:sync` | settings.xero | sync | Trigger Xero synchronization | admin |

---

## Database Schema

### Prisma Models

Add to `/packages/database/prisma/schema.prisma`:

```prisma
// ============================================================================
// RBAC MODELS
// ============================================================================

// Permission definition - stores all available permissions in the system
model Permission {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  module      String   // e.g., "customers", "orders", "products"
  action      String   // e.g., "view", "create", "edit", "delete"
  code        String   @unique // e.g., "customers:view", "orders:create"
  description String?  // Human-readable description
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  rolePermissions RolePermission[]

  @@unique([module, action])
  @@index([module])
  @@index([isActive])
  @@map("permissions")
}

// Role-Permission mapping - which roles have which permissions
model RolePermission {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  role         String   // e.g., "admin", "sales", "manager"
  permissionId String   @db.ObjectId
  grantedAt    DateTime @default(now())
  grantedBy    String?  // User ID who granted the permission

  // Relations
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([role, permissionId])
  @@index([role])
  @@index([permissionId])
  @@map("role_permissions")
}
```

---

## TypeScript Types

### Permission Types

Create `/packages/shared/src/types/permissions.ts`:

```typescript
import type { UserRole } from './index';

// Module names as a const array
export const MODULES = [
  'dashboard',
  'customers',
  'orders',
  'products',
  'inventory',
  'pricing',
  'packing',
  'deliveries',
  'driver',
  'settings',
  'settings.users',
  'settings.company',
  'settings.delivery',
  'settings.integrations',
  'settings.notifications',
  'settings.xero',
] as const;

export type Module = (typeof MODULES)[number];

// Actions per module
export const MODULE_ACTIONS = {
  dashboard: ['view'] as const,
  customers: ['view', 'create', 'edit', 'delete', 'approve_credit', 'suspend'] as const,
  orders: ['view', 'create', 'edit', 'confirm', 'cancel', 'approve_backorder'] as const,
  products: ['view', 'create', 'edit', 'delete', 'adjust_stock'] as const,
  inventory: ['view', 'adjust'] as const,
  pricing: ['view', 'create', 'edit', 'delete'] as const,
  packing: ['view', 'manage'] as const,
  deliveries: ['view', 'manage'] as const,
  driver: ['view', 'complete', 'upload_pod'] as const,
  settings: ['view', 'edit'] as const,
  'settings.users': ['view', 'create', 'edit', 'delete'] as const,
  'settings.company': ['view', 'edit'] as const,
  'settings.delivery': ['view', 'edit'] as const,
  'settings.integrations': ['view', 'edit'] as const,
  'settings.notifications': ['view', 'edit'] as const,
  'settings.xero': ['view', 'sync'] as const,
} as const;

export type ModuleActions = typeof MODULE_ACTIONS;

// Generate permission code type dynamically
type PermissionCode<M extends Module> = `${M}:${ModuleActions[M][number]}`;

// All possible permission codes
export type Permission = {
  [M in Module]: PermissionCode<M>;
}[Module];

// Helper type for checking permissions
export type PermissionCheck = Permission | Permission[];

// Permission with metadata
export interface PermissionDefinition {
  code: Permission;
  module: Module;
  action: string;
  description: string;
}

// User permissions context
export interface UserPermissions {
  role: UserRole;
  permissions: Permission[];
  isAdmin: boolean;
}

// Re-export UserRole for convenience
export type { UserRole };
```

Update `/packages/shared/src/types/index.ts`:

```typescript
// Add at the end of the file
export * from './permissions';
```

---

## Permission Constants

Create `/packages/shared/src/constants/permissions.ts`:

```typescript
import type { Permission, UserRole } from '../types/permissions';

// Complete permission definitions with descriptions
export const PERMISSION_DEFINITIONS: Record<
  Permission,
  { module: string; action: string; description: string }
> = {
  'dashboard:view': { module: 'dashboard', action: 'view', description: 'View dashboard analytics and overview' },

  // Customers
  'customers:view': { module: 'customers', action: 'view', description: 'View customer list and details' },
  'customers:create': { module: 'customers', action: 'create', description: 'Create new customers' },
  'customers:edit': { module: 'customers', action: 'edit', description: 'Edit customer information' },
  'customers:delete': { module: 'customers', action: 'delete', description: 'Delete customers' },
  'customers:approve_credit': { module: 'customers', action: 'approve_credit', description: 'Approve customer credit applications' },
  'customers:suspend': { module: 'customers', action: 'suspend', description: 'Suspend or reactivate customers' },

  // Orders
  'orders:view': { module: 'orders', action: 'view', description: 'View order list and details' },
  'orders:create': { module: 'orders', action: 'create', description: 'Create orders on behalf of customers' },
  'orders:edit': { module: 'orders', action: 'edit', description: 'Edit order details' },
  'orders:confirm': { module: 'orders', action: 'confirm', description: 'Confirm pending orders' },
  'orders:cancel': { module: 'orders', action: 'cancel', description: 'Cancel orders' },
  'orders:approve_backorder': { module: 'orders', action: 'approve_backorder', description: 'Approve or reject backorders' },

  // Products
  'products:view': { module: 'products', action: 'view', description: 'View product catalog' },
  'products:create': { module: 'products', action: 'create', description: 'Create new products' },
  'products:edit': { module: 'products', action: 'edit', description: 'Edit product information' },
  'products:delete': { module: 'products', action: 'delete', description: 'Delete products' },
  'products:adjust_stock': { module: 'products', action: 'adjust_stock', description: 'Adjust product stock levels' },

  // Inventory
  'inventory:view': { module: 'inventory', action: 'view', description: 'View inventory levels and history' },
  'inventory:adjust': { module: 'inventory', action: 'adjust', description: 'Make inventory adjustments' },

  // Pricing
  'pricing:view': { module: 'pricing', action: 'view', description: 'View customer-specific pricing' },
  'pricing:create': { module: 'pricing', action: 'create', description: 'Create pricing rules' },
  'pricing:edit': { module: 'pricing', action: 'edit', description: 'Edit pricing rules' },
  'pricing:delete': { module: 'pricing', action: 'delete', description: 'Delete pricing rules' },

  // Packing
  'packing:view': { module: 'packing', action: 'view', description: 'View packing queue and status' },
  'packing:manage': { module: 'packing', action: 'manage', description: 'Manage packing sessions (pause/resume/reset)' },

  // Deliveries
  'deliveries:view': { module: 'deliveries', action: 'view', description: 'View delivery schedule and routes' },
  'deliveries:manage': { module: 'deliveries', action: 'manage', description: 'Manage delivery assignments' },

  // Driver
  'driver:view': { module: 'driver', action: 'view', description: 'View assigned deliveries' },
  'driver:complete': { module: 'driver', action: 'complete', description: 'Complete deliveries' },
  'driver:upload_pod': { module: 'driver', action: 'upload_pod', description: 'Upload proof of delivery' },

  // Settings
  'settings:view': { module: 'settings', action: 'view', description: 'View settings' },
  'settings:edit': { module: 'settings', action: 'edit', description: 'Edit general settings' },

  // Settings sub-modules
  'settings.users:view': { module: 'settings.users', action: 'view', description: 'View user list' },
  'settings.users:create': { module: 'settings.users', action: 'create', description: 'Invite new users' },
  'settings.users:edit': { module: 'settings.users', action: 'edit', description: 'Edit user roles' },
  'settings.users:delete': { module: 'settings.users', action: 'delete', description: 'Deactivate users' },

  'settings.company:view': { module: 'settings.company', action: 'view', description: 'View company information' },
  'settings.company:edit': { module: 'settings.company', action: 'edit', description: 'Edit company information' },

  'settings.delivery:view': { module: 'settings.delivery', action: 'view', description: 'View delivery settings' },
  'settings.delivery:edit': { module: 'settings.delivery', action: 'edit', description: 'Edit delivery settings' },

  'settings.integrations:view': { module: 'settings.integrations', action: 'view', description: 'View integrations' },
  'settings.integrations:edit': { module: 'settings.integrations', action: 'edit', description: 'Configure integrations' },

  'settings.notifications:view': { module: 'settings.notifications', action: 'view', description: 'View notification settings' },
  'settings.notifications:edit': { module: 'settings.notifications', action: 'edit', description: 'Edit notification settings' },

  'settings.xero:view': { module: 'settings.xero', action: 'view', description: 'View Xero sync status' },
  'settings.xero:sync': { module: 'settings.xero', action: 'sync', description: 'Trigger Xero synchronization' },
};

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.keys(PERMISSION_DEFINITIONS) as Permission[], // Admin gets all permissions

  sales: [
    'dashboard:view',
    'customers:view',
    'customers:create',
    'customers:edit',
    'orders:view',
    'orders:create',
    'orders:edit',
    'products:view',
    'pricing:view',
    'pricing:create',
    'pricing:edit',
    'deliveries:view',
    'settings:view',
  ],

  manager: [
    'dashboard:view',
    'customers:view',
    'customers:edit',
    'customers:approve_credit',
    'orders:view',
    'orders:confirm',
    'orders:cancel',
    'orders:approve_backorder',
    'products:view',
    'products:edit',
    'products:adjust_stock',
    'inventory:view',
    'inventory:adjust',
    'pricing:view',
    'pricing:edit',
    'packing:view',
    'packing:manage',
    'deliveries:view',
    'deliveries:manage',
    'settings:view',
    'settings.company:view',
    'settings.delivery:view',
    'settings.xero:view',
  ],

  packer: [
    'packing:view',
    'packing:manage',
    'orders:view',
    'products:view',
  ],

  driver: [
    'driver:view',
    'driver:complete',
    'driver:upload_pod',
    'deliveries:view',
  ],

  customer: [], // Customers use customer portal, no admin permissions
};

// All permission codes as an array (useful for seeding)
export const ALL_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS) as Permission[];

// Helper to get permissions by module
export function getPermissionsByModule(module: string): Permission[] {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${module}:`));
}

// Helper to check if a permission code is valid
export function isValidPermission(code: string): code is Permission {
  return code in PERMISSION_DEFINITIONS;
}
```

Update `/packages/shared/src/constants/index.ts`:

```typescript
// Add at the end of the file
export * from './permissions';
```

---

## Backend Implementation

### Permission Service

Create `/packages/api/src/services/permission-service.ts`:

```typescript
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
export async function hasAnyPermission(role: UserRole, permissions: Permission[]): Promise<boolean> {
  if (role === 'admin') return true;

  const rolePermissions = await getRolePermissions(role);
  return permissions.some((p) => rolePermissions.includes(p));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export async function hasAllPermissions(role: UserRole, permissions: Permission[]): Promise<boolean> {
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
```

### tRPC Middleware

Add to `/packages/api/src/trpc.ts`:

```typescript
import type { Permission } from '@joho-erp/shared';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './services/permission-service';

// ... existing code ...

/**
 * Permission-based middleware factory
 * Checks if user has a specific permission
 */
export const requirePermission = (permission: Permission) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.userRole) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const allowed = await hasPermission(ctx.userRole, permission);

    if (!allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to access this resource',
      });
    }

    return next({ ctx });
  });
};

/**
 * Requires ANY of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.userRole) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const allowed = await hasAnyPermission(ctx.userRole, permissions);

    if (!allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to access this resource',
      });
    }

    return next({ ctx });
  });
};

/**
 * Requires ALL of the specified permissions
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.userRole) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const allowed = await hasAllPermissions(ctx.userRole, permissions);

    if (!allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to access this resource',
      });
    }

    return next({ ctx });
  });
};
```

### Permission Router

Create `/packages/api/src/routers/permission.ts`:

```typescript
import { z } from 'zod';
import { router, isAdmin, protectedProcedure } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import {
  getRolePermissions,
  getAllRolePermissions,
  clearPermissionCache,
} from '../services/permission-service';
import { ALL_PERMISSIONS, PERMISSION_DEFINITIONS, isValidPermission } from '@joho-erp/shared';
import type { Permission } from '@joho-erp/shared';

export const permissionRouter = router({
  // Get current user's permissions
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const permissions = await getRolePermissions(ctx.userRole);
    return {
      role: ctx.userRole,
      permissions,
      isAdmin: ctx.userRole === 'admin',
    };
  }),

  // Get all permissions with definitions (for admin UI)
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

  // Get role-permission matrix (for admin UI)
  getRolePermissionMatrix: isAdmin.query(async () => {
    const rolePermissions = await getAllRolePermissions();
    const allPermissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    // Group permissions by module
    const moduleGroups: Record<string, typeof allPermissions> = {};
    for (const perm of allPermissions) {
      if (!moduleGroups[perm.module]) {
        moduleGroups[perm.module] = [];
      }
      moduleGroups[perm.module].push(perm);
    }

    return {
      roles: ['admin', 'sales', 'manager', 'packer', 'driver'] as const,
      modules: moduleGroups,
      rolePermissions,
    };
  }),

  // Update permissions for a role
  updateRolePermissions: isAdmin
    .input(
      z.object({
        role: z.enum(['sales', 'manager', 'packer', 'driver']), // Cannot modify admin
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
        await tx.rolePermission.createMany({
          data: permissionRecords.map((p) => ({
            role,
            permissionId: p.id,
            grantedBy: ctx.userId,
          })),
        });
      });

      // Clear cache for this role
      clearPermissionCache(role);

      return { success: true, permissionsUpdated: permissions.length };
    }),

  // Toggle single permission for a role
  togglePermission: isAdmin
    .input(
      z.object({
        role: z.enum(['sales', 'manager', 'packer', 'driver']),
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
          message: 'Permission not found',
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
});
```

---

## Frontend Implementation

### Permission Provider

Create `/apps/admin-portal/components/permission-provider.tsx`:

```tsx
'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Permission, UserPermissions } from '@joho-erp/shared';
import { api } from '@/trpc/client';

interface PermissionContextValue {
  permissions: Permission[];
  role: string;
  isAdmin: boolean;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = api.permission.getMyPermissions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions: data?.permissions ?? [],
      role: data?.role ?? 'customer',
      isAdmin: data?.isAdmin ?? false,
      isLoading,
      hasPermission: (permission: Permission) => {
        if (data?.isAdmin) return true;
        return data?.permissions.includes(permission) ?? false;
      },
      hasAnyPermission: (permissions: Permission[]) => {
        if (data?.isAdmin) return true;
        return permissions.some((p) => data?.permissions.includes(p)) ?? false;
      },
      hasAllPermissions: (permissions: Permission[]) => {
        if (data?.isAdmin) return true;
        return permissions.every((p) => data?.permissions.includes(p)) ?? false;
      },
    }),
    [data, isLoading]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermission(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

// Convenience hook for checking a single permission
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission, isLoading } = usePermission();
  if (isLoading) return false; // Default to no access while loading
  return hasPermission(permission);
}
```

### Permission Gate Component

Create `/apps/admin-portal/components/permission-gate.tsx`:

```tsx
'use client';

import type { Permission } from '@joho-erp/shared';
import { usePermission } from './permission-provider';

interface PermissionGateProps {
  /** Single permission or array of permissions */
  permission: Permission | Permission[];
  /** If true, requires ALL permissions. If false, requires ANY permission */
  requireAll?: boolean;
  /** Fallback content when permission is denied */
  fallback?: React.ReactNode;
  /** Children to render when permitted */
  children: React.ReactNode;
  /** If true, shows loading state while checking permissions */
  showLoading?: boolean;
}

export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
  showLoading = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermission();

  if (isLoading) {
    return showLoading ? <div className="animate-pulse bg-muted h-8 w-24 rounded" /> : null;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  let hasAccess: boolean;
  if (permissions.length === 1) {
    hasAccess = hasPermission(permissions[0]);
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissions);
  } else {
    hasAccess = hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

---

## Usage Examples

### Protecting API Endpoints

```typescript
// Before (role-based)
create: isAdmin.input(...).mutation(...)

// After (permission-based)
create: requirePermission('products:create').input(...).mutation(...)
```

### Protecting UI Buttons

```tsx
import { PermissionGate } from '@/components/permission-gate';

// Single permission
<PermissionGate permission="customers:create">
  <Button onClick={handleCreate}>
    <Plus className="w-4 h-4 mr-2" />
    Add Customer
  </Button>
</PermissionGate>

// Multiple permissions (ANY)
<PermissionGate permission={['orders:confirm', 'orders:cancel']}>
  <OrderActionsDropdown />
</PermissionGate>

// Multiple permissions (ALL required)
<PermissionGate permission={['settings:view', 'settings:edit']} requireAll>
  <SettingsForm />
</PermissionGate>
```

### Conditional Table Columns

```tsx
import { useHasPermission, usePermission } from '@/components/permission-provider';

function CustomerTable() {
  const canEdit = useHasPermission('customers:edit');
  const canDelete = useHasPermission('customers:delete');

  const columns = useMemo(() => {
    const baseColumns = [
      { id: 'name', header: 'Name', ... },
      { id: 'email', header: 'Email', ... },
    ];

    if (canEdit || canDelete) {
      baseColumns.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <DropdownMenu>
            {canEdit && <DropdownMenuItem>Edit</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem>Delete</DropdownMenuItem>}
          </DropdownMenu>
        ),
      });
    }

    return baseColumns;
  }, [canEdit, canDelete]);

  return <DataTable columns={columns} data={customers} />;
}
```

### Protecting Navigation

```tsx
const navItems = [
  { path: '/dashboard', permission: 'dashboard:view' as const, label: 'Dashboard' },
  { path: '/customers', permission: 'customers:view' as const, label: 'Customers' },
  { path: '/orders', permission: 'orders:view' as const, label: 'Orders' },
  // ...
];

{navItems.map((item) => (
  <PermissionGate key={item.path} permission={item.permission}>
    <NavLink to={item.path}>{item.label}</NavLink>
  </PermissionGate>
))}
```

---

## Default Role Permissions

### Admin
All 42 permissions (full system access)

### Sales
- `dashboard:view`
- `customers:view`, `customers:create`, `customers:edit`
- `orders:view`, `orders:create`, `orders:edit`
- `products:view`
- `pricing:view`, `pricing:create`, `pricing:edit`
- `deliveries:view`
- `settings:view`

### Manager
- `dashboard:view`
- `customers:view`, `customers:edit`, `customers:approve_credit`
- `orders:view`, `orders:confirm`, `orders:cancel`, `orders:approve_backorder`
- `products:view`, `products:edit`, `products:adjust_stock`
- `inventory:view`, `inventory:adjust`
- `pricing:view`, `pricing:edit`
- `packing:view`, `packing:manage`
- `deliveries:view`, `deliveries:manage`
- `settings:view`, `settings.company:view`, `settings.delivery:view`, `settings.xero:view`

### Packer
- `packing:view`, `packing:manage`
- `orders:view`
- `products:view`

### Driver
- `driver:view`, `driver:complete`, `driver:upload_pod`
- `deliveries:view`

---

## Migration Checklist

### Step 1: Database
- [ ] Add Permission and RolePermission models to schema.prisma
- [ ] Run `pnpm prisma generate`
- [ ] Run `pnpm prisma db push`

### Step 2: Shared Package
- [ ] Create `/packages/shared/src/types/permissions.ts`
- [ ] Create `/packages/shared/src/constants/permissions.ts`
- [ ] Update exports in index files
- [ ] Build shared package: `pnpm --filter @joho-erp/shared build`

### Step 3: Seeding
- [ ] Create seed script
- [ ] Run seed script to populate permissions

### Step 4: API Package
- [ ] Create permission service
- [ ] Add middleware to trpc.ts
- [ ] Create permission router
- [ ] Register router in root.ts
- [ ] Build API package: `pnpm --filter @joho-erp/api build`

### Step 5: Admin Portal
- [ ] Create PermissionProvider
- [ ] Create PermissionGate
- [ ] Add provider to layout
- [ ] Create permission management page
- [ ] Add i18n translations

### Step 6: Router Migration
- [ ] Migrate customer router
- [ ] Migrate order router
- [ ] Migrate product router
- [ ] Migrate pricing router
- [ ] Migrate packing router
- [ ] Migrate delivery router
- [ ] Migrate settings routers

### Step 7: UI Integration
- [ ] Add gates to products page
- [ ] Add gates to customers page
- [ ] Add gates to orders page
- [ ] Add gates to all other pages
- [ ] Add gates to navigation

### Step 8: Testing
- [ ] Test all role/permission combinations
- [ ] Verify cache invalidation works
- [ ] Test permission management UI

---

## i18n Keys

Add to `/apps/admin-portal/messages/en.json`:

```json
{
  "settings": {
    "permissions": {
      "title": "Permission Management",
      "description": "Configure role-based access permissions",
      "selectRole": "Select Role",
      "adminNote": "Administrator role has all permissions by default and cannot be modified.",
      "permissionsInModule": "permissions",
      "save": "Save Changes",
      "reset": "Reset",
      "saveSuccess": "Permissions updated successfully",
      "saveError": "Failed to update permissions",
      "modules": {
        "dashboard": "Dashboard",
        "customers": "Customers",
        "orders": "Orders",
        "products": "Products",
        "inventory": "Inventory",
        "pricing": "Pricing",
        "packing": "Packing",
        "deliveries": "Deliveries",
        "driver": "Driver",
        "settings": "Settings",
        "settings.users": "User Management",
        "settings.company": "Company Settings",
        "settings.delivery": "Delivery Settings",
        "settings.integrations": "Integrations",
        "settings.notifications": "Notifications",
        "settings.xero": "Xero Integration"
      },
      "actions": {
        "view": "View",
        "create": "Create",
        "edit": "Edit",
        "delete": "Delete",
        "manage": "Manage",
        "sync": "Sync",
        "approve_credit": "Approve Credit",
        "suspend": "Suspend",
        "confirm": "Confirm",
        "cancel": "Cancel",
        "approve_backorder": "Approve Backorder",
        "adjust_stock": "Adjust Stock",
        "adjust": "Adjust",
        "complete": "Complete",
        "upload_pod": "Upload POD"
      },
      "roles": {
        "admin": "Administrator",
        "sales": "Sales",
        "manager": "Manager",
        "packer": "Packer",
        "driver": "Driver"
      }
    }
  }
}
```
