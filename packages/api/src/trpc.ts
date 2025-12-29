import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import { ZodError } from 'zod';
import superjson from 'superjson';
import type { Permission } from '@joho-erp/shared';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './services/permission-service';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected Procedure - Requires Authentication
 *
 * Ensures the user is authenticated before allowing access to the endpoint.
 * Throws UNAUTHORIZED error if no userId is present in context.
 *
 * Context includes:
 * - userId: Clerk user ID (guaranteed to be non-null)
 * - sessionId: Clerk session ID
 * - userRole: User's role from Clerk metadata (defaults to 'customer')
 * - userName: User's display name (firstName + lastName from Clerk)
 *
 * This is the base for all authenticated endpoints. Use this when:
 * - Any authenticated user should have access
 * - Role-specific access is not required
 * - Endpoint implements its own authorization logic
 *
 * For role-based access control, use hasRole() middleware or
 * the pre-configured role middlewares (isAdmin, isAdminOrSales, etc.)
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      userRole: ctx.userRole,
      userName: ctx.userName,
    },
  });
});

/**
 * RBAC Middleware Factory
 *
 * Role Hierarchy:
 * - admin: Full system access (all endpoints)
 * - sales: Customer management, orders, pricing, deliveries
 * - manager: Similar to sales, with additional analytics access
 * - packer: Packing interface, stock management
 * - driver: Delivery management and updates
 * - customer: Own profile and orders only (default for registered users)
 *
 * Roles are stored in Clerk's publicMetadata under the 'role' key.
 * If no role is specified, users are treated as 'customer' by default.
 *
 * Security Model:
 * - All endpoints require authentication (protectedProcedure base)
 * - Role checks use allowlist approach (explicit role required)
 * - Admin role bypasses all role checks (superuser access)
 * - Error messages are generic to prevent role enumeration
 *
 * @param allowedRoles - Array of roles that are permitted to access the endpoint
 * @returns Middleware that enforces role-based access control
 *
 * @example
 * // Only admins can access
 * export const adminProcedure = hasRole(['admin']);
 *
 * // Admins and sales can access
 * export const salesProcedure = hasRole(['admin', 'sales']);
 */
export const hasRole = (allowedRoles: string[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    // Get user's role from context (defaults to 'customer' if not set)
    const userRole = ctx.userRole || 'customer';

    // Admin role always has access (superuser bypass)
    if (userRole === 'admin') {
      return next({
        ctx: {
          ...ctx,
          userRole,
        },
      });
    }

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(userRole)) {
      // Generic error message to prevent role enumeration attacks
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to access this resource'
      });
    }

    // User has required role, proceed with request
    return next({
      ctx: {
        ...ctx,
        userRole,
      },
    });
  });
};

// Specific role middlewares for common use cases
// These combine the hasRole factory with commonly used role combinations
export const isAdmin = hasRole(['admin']);
export const isAdminOrSales = hasRole(['admin', 'sales']);
export const isAdminOrSalesOrManager = hasRole(['admin', 'sales', 'manager']);
export const isPacker = hasRole(['packer', 'admin']);
export const isDriver = hasRole(['driver', 'admin']);

// ============================================================================
// PERMISSION-BASED MIDDLEWARE (New granular access control)
// ============================================================================

/**
 * Permission-based middleware factory
 *
 * Checks if the user has a specific permission from the database.
 * Admin role bypasses all permission checks (superuser access).
 *
 * @param permission - The permission code to check (e.g., 'products:create')
 * @returns Middleware that enforces permission-based access control
 *
 * @example
 * // Only users with 'products:create' permission can access
 * create: requirePermission('products:create').input(...).mutation(...)
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
 *
 * @param permissions - Array of permission codes
 * @returns Middleware that allows access if user has any of the permissions
 *
 * @example
 * // Users with either 'orders:confirm' OR 'orders:cancel' can access
 * updateStatus: requireAnyPermission(['orders:confirm', 'orders:cancel']).input(...)
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
 *
 * @param permissions - Array of permission codes
 * @returns Middleware that allows access only if user has all permissions
 *
 * @example
 * // Users must have BOTH 'settings:view' AND 'settings:edit' to access
 * updateSettings: requireAllPermissions(['settings:view', 'settings:edit']).input(...)
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

// Export UserRole type for use in route handlers
export type { UserRole } from './context';

// Export Permission type for use in route handlers
export type { Permission } from '@joho-erp/shared';
