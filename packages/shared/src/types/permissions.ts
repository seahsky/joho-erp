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

// All possible permission codes as a union type
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
