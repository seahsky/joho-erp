import { LayoutDashboard, Users, Truck, Package, ShoppingBag, type LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
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
  },
  {
    id: 'customers',
    labelKey: 'customers',
    icon: Users,
    path: '/customers',
  },
  {
    id: 'orders',
    labelKey: 'orders',
    icon: ShoppingBag,
    path: '/orders',
  },
  {
    id: 'products',
    labelKey: 'products',
    icon: Package,
    path: '/products',
  },
  {
    id: 'deliveries',
    labelKey: 'deliveries',
    icon: Truck,
    path: '/deliveries',
  },
] as const;
