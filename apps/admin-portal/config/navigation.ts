import { LayoutDashboard, Users, Truck, Package, ShoppingBag, DollarSign, PackageCheck, Navigation, Warehouse, type LucideIcon } from 'lucide-react';
import type { Permission } from '@joho-erp/shared';

export interface NavigationItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
  permission: Permission;
}

/**
 * Admin portal navigation configuration
 * Each item requires a translation key in the 'navigation' namespace
 */
export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    permission: 'dashboard:view',
  },
  {
    id: 'customers',
    labelKey: 'customers',
    icon: Users,
    path: '/customers',
    permission: 'customers:view',
  },
  {
    id: 'orders',
    labelKey: 'orders',
    icon: ShoppingBag,
    path: '/orders',
    permission: 'orders:view',
  },
  {
    id: 'packing',
    labelKey: 'packing',
    icon: PackageCheck,
    path: '/packing',
    permission: 'packing:view',
  },
  {
    id: 'products',
    labelKey: 'products',
    icon: Package,
    path: '/products',
    permission: 'products:view',
  },
  {
    id: 'inventory',
    labelKey: 'inventory',
    icon: Warehouse,
    path: '/inventory',
    permission: 'inventory:view',
  },
  {
    id: 'pricing',
    labelKey: 'pricing',
    icon: DollarSign,
    path: '/pricing',
    permission: 'pricing:view',
  },
  {
    id: 'deliveries',
    labelKey: 'deliveries',
    icon: Truck,
    path: '/deliveries',
    permission: 'deliveries:view',
  },
  {
    id: 'driver',
    labelKey: 'driver',
    icon: Navigation,
    path: '/driver',
    permission: 'driver:view',
  },
];
