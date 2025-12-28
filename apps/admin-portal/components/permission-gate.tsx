'use client';

import type { Permission } from '@joho-erp/shared';
import { usePermission } from './permission-provider';

interface PermissionGateProps {
  /** Single permission or array of permissions */
  permission: Permission | Permission[];
  /** If true, requires ALL permissions. If false (default), requires ANY permission */
  requireAll?: boolean;
  /** Fallback content when permission is denied */
  fallback?: React.ReactNode;
  /** Children to render when permitted */
  children: React.ReactNode;
  /** If true, shows a skeleton loading state while checking permissions */
  showLoading?: boolean;
}

/**
 * PermissionGate - Conditional rendering based on user permissions
 *
 * Wraps UI elements that should only be visible to users with specific permissions.
 *
 * @example
 * // Single permission
 * <PermissionGate permission="customers:create">
 *   <Button onClick={handleCreate}>Add Customer</Button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (ANY - default)
 * <PermissionGate permission={['orders:confirm', 'orders:cancel']}>
 *   <OrderActionsDropdown />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (ALL required)
 * <PermissionGate permission={['settings:view', 'settings:edit']} requireAll>
 *   <SettingsForm />
 * </PermissionGate>
 *
 * @example
 * // With fallback content
 * <PermissionGate
 *   permission="products:edit"
 *   fallback={<span className="text-muted-foreground">View only</span>}
 * >
 *   <Button>Edit Product</Button>
 * </PermissionGate>
 */
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

/**
 * Inverse of PermissionGate - shows content when user DOESN'T have the permission
 *
 * Useful for showing alternative content or read-only views.
 *
 * @example
 * <WithoutPermission permission="products:edit">
 *   <p className="text-muted-foreground">You don't have permission to edit products.</p>
 * </WithoutPermission>
 */
export function WithoutPermission({
  permission,
  requireAll = false,
  children,
}: Omit<PermissionGateProps, 'fallback' | 'showLoading'>) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermission();

  if (isLoading) {
    return null;
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

  // Show children only if user DOESN'T have access
  if (hasAccess) {
    return null;
  }

  return <>{children}</>;
}
