// User Roles
export type UserRole = 'customer' | 'admin' | 'sales' | 'packer' | 'driver' | 'manager';

// Area Model Interface (configurable delivery areas)
export interface Area {
  id: string;
  name: string;           // Lowercase identifier: "north", "east-1"
  displayName: string;    // Human-readable: "North", "East 1"
  colorVariant: string;   // Badge color: "info", "success", "warning", "default", "secondary"
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Area with usage counts (for admin management)
export interface AreaWithCounts extends Area {
  _count: {
    suburbMappings: number;
    driverAssignments: number;
  };
}

// Order Status
export type OrderStatus =
  | 'awaiting_approval' // For backorders requiring admin approval
  | 'confirmed'
  | 'packing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

// Product Status
export type ProductStatus = 'active' | 'discontinued' | 'out_of_stock';


// Stock Status (customer-facing, does not reveal exact counts)
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Product Category
export type ProductCategory = 'Beef' | 'Pork' | 'Chicken' | 'Lamb' | 'Processed';

// Customer Status
export type CustomerStatus = 'active' | 'suspended' | 'closed';

// Credit Application Status
export type CreditApplicationStatus = 'pending' | 'approved' | 'rejected';

// Product Unit
export type ProductUnit = 'kg' | 'piece' | 'box' | 'carton';

// Inventory Transaction Type
export type InventoryTransactionType = 'sale' | 'adjustment' | 'return';

// Adjustment Type (for manual stock changes)
export type AdjustmentType = 'stock_received' | 'stock_count_correction' | 'damaged_goods' | 'expired_stock';

// Proof of Delivery Type
export type PODType = 'signature' | 'photo';

// Clerk Metadata for Customer
export interface CustomerMetadata {
  role: 'customer';
  customerId: string;
  approvalStatus: CreditApplicationStatus;
  creditLimit: number;
  areaId?: string | null;
  areaName?: string | null;
}

// Clerk Metadata for Admin
export interface AdminMetadata {
  role: 'admin';
  department: string;
}

// Clerk Metadata for Sales
export interface SalesMetadata {
  role: 'sales';
  department: string;
}

// Clerk Metadata for Packer
export interface PackerMetadata {
  role: 'packer';
  department: string;
}

// Clerk Metadata for Driver
export interface DriverMetadata {
  role: 'driver';
  department: string;
  vehicleNumber?: string;
}

// Clerk Metadata for Manager
export interface ManagerMetadata {
  role: 'manager';
  department: string;
}

// Union type for all user metadata
export type UserMetadata =
  | CustomerMetadata
  | AdminMetadata
  | SalesMetadata
  | PackerMetadata
  | DriverMetadata
  | ManagerMetadata;

// Address Interface
export interface Address {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  deliveryInstructions?: string;
}

// Delivery Address with Area
export interface DeliveryAddress extends Address {
  areaId?: string | null;    // Reference to Area model (null = unassigned)
  areaName?: string | null;  // Denormalized area name for display (e.g., "north", "east-1")
  latitude?: number;
  longitude?: number;
}

// Permission types
export * from './permissions';

// Table types (sorting, filtering)
export * from './table';
