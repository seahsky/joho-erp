// Order Status Types - matches Prisma OrderStatus enum
export const ORDER_STATUSES = ['awaiting_approval', 'confirmed', 'packing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'] as const;

// Order Status Translation Keys - use with t('statusBadges.{key}')
export const ORDER_STATUS_KEYS = {
  awaiting_approval: 'statusBadges.awaiting_approval',
  confirmed: 'statusBadges.confirmed',
  packing: 'statusBadges.packing',
  ready_for_delivery: 'statusBadges.ready_for_delivery',
  out_for_delivery: 'statusBadges.out_for_delivery',
  delivered: 'statusBadges.delivered',
  cancelled: 'statusBadges.cancelled',
} as const;

// Order Status Description Keys - use with t('orderStatusDescriptions.{key}')
export const ORDER_STATUS_DESCRIPTION_KEYS = {
  awaiting_approval: 'orderStatusDescriptions.awaiting_approval',
  confirmed: 'orderStatusDescriptions.confirmed',
  packing: 'orderStatusDescriptions.packing',
  ready_for_delivery: 'orderStatusDescriptions.ready_for_delivery',
  out_for_delivery: 'orderStatusDescriptions.out_for_delivery',
  delivered: 'orderStatusDescriptions.delivered',
  cancelled: 'orderStatusDescriptions.cancelled',
} as const;

// @deprecated Use ORDER_STATUS_KEYS with translations instead
export const ORDER_STATUS_LABELS = {
  awaiting_approval: 'Awaiting Approval',
  confirmed: 'Confirmed',
  packing: 'Packing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
} as const;

// @deprecated Use ORDER_STATUS_DESCRIPTION_KEYS with translations instead
export const ORDER_STATUS_DESCRIPTIONS = {
  awaiting_approval: 'Your order is awaiting approval',
  confirmed: 'Order confirmed, preparing for packing',
  packing: 'Your order is being packed',
  ready_for_delivery: 'Order packed and ready for dispatch',
  out_for_delivery: 'Your order is out for delivery',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
} as const;

// Order Cancellation Eligibility
// Customers can only cancel orders in these statuses
// Once confirmed, they must contact admin to cancel
export const CUSTOMER_CANCELLABLE_STATUSES = ['awaiting_approval'] as const;

// Admin/Sales can cancel orders in any of these statuses
// (with manager approval required for packing+ statuses)
export const ADMIN_CANCELLABLE_STATUSES = [
  'awaiting_approval',
  'confirmed',
  'packing',
  'ready_for_delivery',
] as const;

// Product Unit Types
export const PRODUCT_UNITS = ['kg', 'piece', 'box', 'carton'] as const;

// Product Unit Translation Keys - use with t('productUnits.{key}')
export const PRODUCT_UNIT_KEYS = {
  kg: 'productUnits.kg',
  piece: 'productUnits.piece',
  box: 'productUnits.box',
  carton: 'productUnits.carton',
} as const;

// @deprecated Use PRODUCT_UNIT_KEYS with translations instead
export const PRODUCT_UNIT_LABELS = {
  kg: 'Kilogram',
  piece: 'Piece',
  box: 'Box',
  carton: 'Carton',
} as const;

// Australian States - values are abbreviations (not translated), labels need translation
export const AUSTRALIAN_STATE_VALUES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const;

// Australian State Translation Keys - use with t('australianStates.{value}')
export const AUSTRALIAN_STATE_KEYS = {
  NSW: 'australianStates.NSW',
  VIC: 'australianStates.VIC',
  QLD: 'australianStates.QLD',
  SA: 'australianStates.SA',
  WA: 'australianStates.WA',
  TAS: 'australianStates.TAS',
  NT: 'australianStates.NT',
  ACT: 'australianStates.ACT',
} as const;

// @deprecated Use AUSTRALIAN_STATE_KEYS with translations instead
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

// Area Color Variants - available colors for area badges
export const AREA_COLOR_VARIANTS = ['info', 'success', 'warning', 'default', 'secondary'] as const;
export type AreaColorVariant = (typeof AREA_COLOR_VARIANTS)[number];

// Default area configs (for seeding/migration)
export const DEFAULT_AREA_CONFIGS = [
  { name: 'north', displayName: 'North', colorVariant: 'info' as AreaColorVariant },
  { name: 'south', displayName: 'South', colorVariant: 'success' as AreaColorVariant },
  { name: 'east', displayName: 'East', colorVariant: 'warning' as AreaColorVariant },
  { name: 'west', displayName: 'West', colorVariant: 'default' as AreaColorVariant },
] as const;

// Area Tags - @deprecated Use Area model instead
/** @deprecated Use Area model and AREA_COLOR_VARIANTS instead */
export const AREA_TAGS = ['north', 'south', 'east', 'west'] as const;

// Area Tag Translation Keys - use with t('areaTags.{key}')
// Note: For new areas, translations are stored in the Area.displayName field
export const AREA_TAG_KEYS = {
  north: 'areaTags.north',
  south: 'areaTags.south',
  east: 'areaTags.east',
  west: 'areaTags.west',
} as const;

// @deprecated Use Area.displayName instead
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

// Days of Week (for SMS reminders)
export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// Days of Week Translation Keys - use with t('days.{key}')
export const DAY_OF_WEEK_KEYS = {
  monday: 'days.monday',
  tuesday: 'days.tuesday',
  wednesday: 'days.wednesday',
  thursday: 'days.thursday',
  friday: 'days.friday',
  saturday: 'days.saturday',
  sunday: 'days.sunday',
} as const;

// SMS Settings Defaults
export const DEFAULT_SMS_TEMPLATE =
  'Hi {customerName}, reminder from {companyName} to place your order for this week.';

export const DEFAULT_SMS_SEND_TIME = '09:00';

// API Error Codes
export * from './errors';

// Permission Constants
export * from './permissions';
