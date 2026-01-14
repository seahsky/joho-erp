'use client';

import { useRouter } from 'next/navigation';
import { Skeleton } from '@joho-erp/ui';
import { Package, AlertTriangle, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface InventoryHealthCardProps {
  healthPercentage: number;
  lowStockCount: number;
  expiringCount: number;
  outOfStockCount: number;
  isLoading?: boolean;
}

export function InventoryHealthCard({
  healthPercentage,
  lowStockCount,
  expiringCount,
  outOfStockCount,
  isLoading,
}: InventoryHealthCardProps) {
  const router = useRouter();

  const getHealthStatus = () => {
    if (healthPercentage >= 80) return { label: 'Good', color: 'success' };
    if (healthPercentage >= 50) return { label: 'Warning', color: 'warning' };
    return { label: 'Critical', color: 'destructive' };
  };

  const healthStatus = getHealthStatus();

  const alerts = [
    {
      label: 'Low Stock Items',
      count: lowStockCount,
      icon: AlertTriangle,
      href: '/inventory?stockFilter=low',
      color: 'warning',
    },
    {
      label: 'Expiring This Week',
      count: expiringCount,
      icon: Calendar,
      href: '/inventory?expiryFilter=alert',
      color: 'destructive',
    },
    {
      label: 'Out of Stock',
      count: outOfStockCount,
      icon: Package,
      href: '/inventory?stockFilter=out',
      color: 'destructive',
    },
  ];

  const activeAlerts = alerts.filter((alert) => alert.count > 0);

  if (isLoading) {
    return (
      <div className="inventory-health-card">
        <div className="inventory-health-header">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="inventory-health-content">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-24 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-health-card">
      <div className="inventory-health-header">
        <span className="inventory-health-title">Inventory Health</span>
        <Link href="/inventory" className="inventory-health-view-all">
          View Inventory <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="inventory-health-content">
        {/* Health Progress Bar */}
        <div className="inventory-health-progress">
          <div className="inventory-health-progress-header">
            <span className="text-sm">Stock Level</span>
            <span className={`inventory-health-status inventory-health-status-${healthStatus.color}`}>
              {healthStatus.label}
            </span>
          </div>
          {/* Simple progress bar implementation */}
          <div className="inventory-health-bar-container">
            <div
              className={`inventory-health-bar-fill inventory-health-bar-fill-${healthStatus.color}`}
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
          <div className="inventory-health-percentage">{healthPercentage}% of products well-stocked</div>
        </div>

        {/* Alerts Section */}
        <div className="inventory-health-alerts">
          {activeAlerts.length === 0 ? (
            <div className="inventory-health-all-clear">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>All inventory is healthy</span>
            </div>
          ) : (
            activeAlerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <button
                  key={alert.label}
                  className={`inventory-health-alert inventory-health-alert-${alert.color}`}
                  onClick={() => router.push(alert.href)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="inventory-health-alert-count">{alert.count}</span>
                  <span className="inventory-health-alert-label">{alert.label}</span>
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
