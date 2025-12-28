'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Permission } from '@joho-erp/shared';
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

/**
 * Hook to access permission context
 *
 * @throws Error if used outside PermissionProvider
 */
export function usePermission(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Convenience hook for checking a single permission
 *
 * @param permission - The permission code to check
 * @returns boolean - True if user has the permission
 *
 * @example
 * const canEdit = useHasPermission('products:edit');
 * if (canEdit) { ... }
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission, isLoading } = usePermission();
  if (isLoading) return false; // Default to no access while loading
  return hasPermission(permission);
}

/**
 * Convenience hook for checking any of multiple permissions
 *
 * @param permissions - Array of permission codes
 * @returns boolean - True if user has any of the permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission, isLoading } = usePermission();
  if (isLoading) return false;
  return hasAnyPermission(permissions);
}

/**
 * Convenience hook for checking all of multiple permissions
 *
 * @param permissions - Array of permission codes
 * @returns boolean - True if user has all of the permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions, isLoading } = usePermission();
  if (isLoading) return false;
  return hasAllPermissions(permissions);
}
