import { LayoutDashboard, Users, Truck, Package, type LucideIcon } from 'lucide-react';

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
    id: 'deliveries',
    labelKey: 'deliveries',
    icon: Truck,
    path: '/deliveries',
  },
  {
    id: 'products',
    labelKey: 'products',
    icon: Package,
    path: '/products',
  },
] as const;
