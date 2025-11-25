// Order Status Labels
export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  packing: 'Packing',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
} as const;

// Order Status Descriptions (for customer portal)
export const ORDER_STATUS_DESCRIPTIONS = {
  pending: 'Your order is being processed',
  confirmed: 'Order confirmed, preparing for packing',
  packing: 'Your order is being packed',
  ready_for_delivery: 'Order packed and ready for dispatch',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
} as const;

// Order Cancellation Eligibility
// Customers can only cancel orders in these statuses
// Once confirmed, they must contact admin to cancel
export const CUSTOMER_CANCELLABLE_STATUSES = ['pending'] as const;

// Admin/Sales can cancel orders in any of these statuses
// (with manager approval required for packing+ statuses)
export const ADMIN_CANCELLABLE_STATUSES = [
  'pending',
  'confirmed',
  'packing',
  'ready_for_delivery',
] as const;

// Product Unit Labels
export const PRODUCT_UNIT_LABELS = {
  kg: 'Kilogram',
  piece: 'Piece',
  box: 'Box',
  carton: 'Carton',
} as const;

// Australian States
export const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'ACT', label: 'Australian Capital Territory' },
] as const;

// Area Tags
export const AREA_TAGS = ['north', 'south', 'east', 'west'] as const;

// Area Tag Labels
export const AREA_TAG_LABELS = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
} as const;

// Default Company Settings
export const DEFAULT_COMPANY_SETTINGS = {
  defaultCurrency: 'AUD',
  taxRate: 0.1, // 10% GST
  lowStockThreshold: 10,
  orderCutoffTime: '14:00',
  timezone: 'Australia/Sydney',
  enableEmailNotifications: true,
} as const;

// User Roles
export const USER_ROLES = ['customer', 'admin', 'sales', 'packer', 'driver', 'manager'] as const;

// Role Permissions
export const ROLE_PERMISSIONS = {
  customer: {
    canViewOwnOrders: true,
    canPlaceOrders: true,
    canViewProducts: true,
    canManageProfile: true,
  },
  admin: {
    canManageCustomers: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageInventory: true,
    canManageSettings: true,
    canManagePricing: true,
    canAccessPacking: true,
    canAccessDelivery: true,
    canManageXero: true,
  },
  sales: {
    canViewCustomers: true,
    canUpdateCustomers: true,
    canManagePricing: true,
    canPlaceOrders: true,
    canViewOrders: true,
  },
  packer: {
    canAccessPacking: true,
  },
  driver: {
    canAccessDelivery: true,
  },
  manager: {
    canViewAll: true,
    canExportData: true,
  },
} as const;

// Stock Status Thresholds
export const STOCK_STATUS = {
  OK: 'ok',
  LOW: 'low',
  OUT: 'out',
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd MMMM yyyy',
  WITH_TIME: 'dd/MM/yyyy HH:mm',
  TIME_ONLY: 'HH:mm',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
} as const;
