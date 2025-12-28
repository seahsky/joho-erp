import type { Permission, UserRole } from '../types/permissions';

// Complete permission definitions with descriptions
export const PERMISSION_DEFINITIONS: Record<
  Permission,
  { module: string; action: string; description: string }
> = {
  'dashboard:view': {
    module: 'dashboard',
    action: 'view',
    description: 'View dashboard analytics and overview',
  },

  // Customers
  'customers:view': {
    module: 'customers',
    action: 'view',
    description: 'View customer list and details',
  },
  'customers:create': {
    module: 'customers',
    action: 'create',
    description: 'Create new customers',
  },
  'customers:edit': {
    module: 'customers',
    action: 'edit',
    description: 'Edit customer information',
  },
  'customers:delete': {
    module: 'customers',
    action: 'delete',
    description: 'Delete customers',
  },
  'customers:approve_credit': {
    module: 'customers',
    action: 'approve_credit',
    description: 'Approve customer credit applications',
  },
  'customers:suspend': {
    module: 'customers',
    action: 'suspend',
    description: 'Suspend or reactivate customers',
  },

  // Orders
  'orders:view': {
    module: 'orders',
    action: 'view',
    description: 'View order list and details',
  },
  'orders:create': {
    module: 'orders',
    action: 'create',
    description: 'Create orders on behalf of customers',
  },
  'orders:edit': { module: 'orders', action: 'edit', description: 'Edit order details' },
  'orders:confirm': {
    module: 'orders',
    action: 'confirm',
    description: 'Confirm pending orders',
  },
  'orders:cancel': { module: 'orders', action: 'cancel', description: 'Cancel orders' },
  'orders:approve_backorder': {
    module: 'orders',
    action: 'approve_backorder',
    description: 'Approve or reject backorders',
  },

  // Products
  'products:view': {
    module: 'products',
    action: 'view',
    description: 'View product catalog',
  },
  'products:create': {
    module: 'products',
    action: 'create',
    description: 'Create new products',
  },
  'products:edit': {
    module: 'products',
    action: 'edit',
    description: 'Edit product information',
  },
  'products:delete': {
    module: 'products',
    action: 'delete',
    description: 'Delete products',
  },
  'products:adjust_stock': {
    module: 'products',
    action: 'adjust_stock',
    description: 'Adjust product stock levels',
  },

  // Inventory
  'inventory:view': {
    module: 'inventory',
    action: 'view',
    description: 'View inventory levels and history',
  },
  'inventory:adjust': {
    module: 'inventory',
    action: 'adjust',
    description: 'Make inventory adjustments',
  },

  // Pricing
  'pricing:view': {
    module: 'pricing',
    action: 'view',
    description: 'View customer-specific pricing',
  },
  'pricing:create': {
    module: 'pricing',
    action: 'create',
    description: 'Create pricing rules',
  },
  'pricing:edit': {
    module: 'pricing',
    action: 'edit',
    description: 'Edit pricing rules',
  },
  'pricing:delete': {
    module: 'pricing',
    action: 'delete',
    description: 'Delete pricing rules',
  },

  // Packing
  'packing:view': {
    module: 'packing',
    action: 'view',
    description: 'View packing queue and status',
  },
  'packing:manage': {
    module: 'packing',
    action: 'manage',
    description: 'Manage packing sessions (pause/resume/reset)',
  },

  // Deliveries
  'deliveries:view': {
    module: 'deliveries',
    action: 'view',
    description: 'View delivery schedule and routes',
  },
  'deliveries:manage': {
    module: 'deliveries',
    action: 'manage',
    description: 'Manage delivery assignments',
  },

  // Driver
  'driver:view': {
    module: 'driver',
    action: 'view',
    description: 'View assigned deliveries',
  },
  'driver:complete': {
    module: 'driver',
    action: 'complete',
    description: 'Complete deliveries',
  },
  'driver:upload_pod': {
    module: 'driver',
    action: 'upload_pod',
    description: 'Upload proof of delivery',
  },

  // Settings
  'settings:view': { module: 'settings', action: 'view', description: 'View settings' },
  'settings:edit': {
    module: 'settings',
    action: 'edit',
    description: 'Edit general settings',
  },

  // Settings sub-modules
  'settings.users:view': {
    module: 'settings.users',
    action: 'view',
    description: 'View user list',
  },
  'settings.users:create': {
    module: 'settings.users',
    action: 'create',
    description: 'Invite new users',
  },
  'settings.users:edit': {
    module: 'settings.users',
    action: 'edit',
    description: 'Edit user roles',
  },
  'settings.users:delete': {
    module: 'settings.users',
    action: 'delete',
    description: 'Deactivate users',
  },

  'settings.company:view': {
    module: 'settings.company',
    action: 'view',
    description: 'View company information',
  },
  'settings.company:edit': {
    module: 'settings.company',
    action: 'edit',
    description: 'Edit company information',
  },

  'settings.delivery:view': {
    module: 'settings.delivery',
    action: 'view',
    description: 'View delivery settings',
  },
  'settings.delivery:edit': {
    module: 'settings.delivery',
    action: 'edit',
    description: 'Edit delivery settings',
  },

  'settings.integrations:view': {
    module: 'settings.integrations',
    action: 'view',
    description: 'View integrations',
  },
  'settings.integrations:edit': {
    module: 'settings.integrations',
    action: 'edit',
    description: 'Configure integrations',
  },

  'settings.notifications:view': {
    module: 'settings.notifications',
    action: 'view',
    description: 'View notification settings',
  },
  'settings.notifications:edit': {
    module: 'settings.notifications',
    action: 'edit',
    description: 'Edit notification settings',
  },

  'settings.xero:view': {
    module: 'settings.xero',
    action: 'view',
    description: 'View Xero sync status',
  },
  'settings.xero:sync': {
    module: 'settings.xero',
    action: 'sync',
    description: 'Trigger Xero synchronization',
  },
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

  packer: ['packing:view', 'packing:manage', 'orders:view', 'products:view'],

  driver: ['driver:view', 'driver:complete', 'driver:upload_pod', 'deliveries:view'],

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

// Internal roles (excluding customer)
export const INTERNAL_ROLES = ['admin', 'sales', 'manager', 'packer', 'driver'] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

// Modifiable roles (can change permissions, excluding admin)
export const MODIFIABLE_ROLES = ['sales', 'manager', 'packer', 'driver'] as const;
export type ModifiableRole = (typeof MODIFIABLE_ROLES)[number];
