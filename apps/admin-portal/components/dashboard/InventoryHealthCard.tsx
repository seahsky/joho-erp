'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@joho-erp/ui';
import { Package, AlertTriangle, Calendar, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  lowStockThreshold: number;
  unit: string;
}

interface ExpiringItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productUnit: string;
  quantityRemaining: number;
  expiryDate: Date | null;
  daysUntilExpiry: number;
  isExpired: boolean;
}

interface InventoryHealthCardProps {
  healthPercentage: number;
  lowStockCount: number;
  lowStockItems?: LowStockItem[];
  expiringCount: number;
  expiringItems?: ExpiringItem[];
  outOfStockCount: number;
  isLoading?: boolean;
}

export function InventoryHealthCard({
  healthPercentage,
  lowStockCount,
  lowStockItems = [],
  expiringCount,
  expiringItems = [],
  outOfStockCount,
  isLoading,
}: InventoryHealthCardProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const [expandedSection, setExpandedSection] = useState<'lowStock' | 'expiring' | null>(null);

  const getHealthStatus = () => {
    if (healthPercentage >= 80) return { label: t('inventoryHealth.good'), color: 'success' };
    if (healthPercentage >= 50) return { label: t('inventoryHealth.warning'), color: 'warning' };
    return { label: t('inventoryHealth.critical'), color: 'destructive' };
  };

  const healthStatus = getHealthStatus();

  const toggleSection = (section: 'lowStock' | 'expiring') => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

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

  const hasAlerts = lowStockCount > 0 || expiringCount > 0 || outOfStockCount > 0;

  return (
    <div className="inventory-health-card">
      <div className="inventory-health-header">
        <span className="inventory-health-title">{t('inventoryHealth.title')}</span>
        <Link href="/inventory" className="inventory-health-view-all">
          {t('inventoryHealth.viewInventory')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="inventory-health-content">
        {/* Health Progress Bar */}
        <div className="inventory-health-progress">
          <div className="inventory-health-progress-header">
            <span className="text-sm">{t('inventoryHealth.stockLevel')}</span>
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
          <div className="inventory-health-percentage">
            {t('inventoryHealth.wellStockedPercentage', { percentage: healthPercentage })}
          </div>
        </div>

        {/* Alerts Section */}
        <div className="inventory-health-alerts">
          {!hasAlerts ? (
            <div className="inventory-health-all-clear">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{t('inventoryHealth.allHealthy')}</span>
            </div>
          ) : (
            <>
              {/* Low Stock Section */}
              {lowStockCount > 0 && (
                <div className="inventory-alert-section">
                  <button
                    className="inventory-health-alert inventory-health-alert-warning"
                    onClick={() => toggleSection('lowStock')}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span className="inventory-health-alert-count">{lowStockCount}</span>
                    <span className="inventory-health-alert-label">{t('inventoryHealth.lowStockLabel')}</span>
                    <ChevronDown
                      className={`h-3 w-3 ml-auto transition-transform ${
                        expandedSection === 'lowStock' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedSection === 'lowStock' && lowStockItems.length > 0 && (
                    <div className="inventory-alert-details">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          className="inventory-detail-item"
                          onClick={() => router.push(`/products/${item.id}`)}
                        >
                          <span className="font-medium truncate">{item.name}</span>
                          <span className="text-muted-foreground text-xs">{item.sku}</span>
                          <span className="text-warning text-xs">
                            {item.currentStock} / {item.lowStockThreshold} {item.unit}
                          </span>
                        </button>
                      ))}
                      {lowStockCount > 5 && (
                        <Link href="/inventory?stockFilter=low" className="inventory-view-more">
                          {t('inventoryHealth.viewMore', { count: lowStockCount })}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Expiring This Week Section */}
              {expiringCount > 0 && (
                <div className="inventory-alert-section">
                  <button
                    className="inventory-health-alert inventory-health-alert-destructive"
                    onClick={() => toggleSection('expiring')}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="inventory-health-alert-count">{expiringCount}</span>
                    <span className="inventory-health-alert-label">{t('inventoryHealth.expiringLabel')}</span>
                    <ChevronDown
                      className={`h-3 w-3 ml-auto transition-transform ${
                        expandedSection === 'expiring' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedSection === 'expiring' && expiringItems.length > 0 && (
                    <div className="inventory-alert-details">
                      {expiringItems.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          className="inventory-detail-item"
                          onClick={() => router.push(`/inventory?batchId=${item.id}`)}
                        >
                          <span className="font-medium truncate">{item.productName}</span>
                          <span className="text-muted-foreground text-xs">{item.productSku}</span>
                          <span className={item.isExpired ? 'text-destructive text-xs' : 'text-warning text-xs'}>
                            {item.isExpired
                              ? t('expiringInventory.expiredDays', { days: Math.abs(item.daysUntilExpiry) })
                              : t('expiringInventory.expiresIn', { days: item.daysUntilExpiry })}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {item.quantityRemaining} {item.productUnit}
                          </span>
                        </button>
                      ))}
                      {expiringCount > 5 && (
                        <Link href="/inventory?expiryFilter=alert" className="inventory-view-more">
                          {t('inventoryHealth.viewMore', { count: expiringCount })}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Out of Stock Section (not collapsible, just navigates) */}
              {outOfStockCount > 0 && (
                <button
                  className="inventory-health-alert inventory-health-alert-destructive"
                  onClick={() => router.push('/inventory?stockFilter=out')}
                >
                  <Package className="h-4 w-4" />
                  <span className="inventory-health-alert-count">{outOfStockCount}</span>
                  <span className="inventory-health-alert-label">{t('inventoryHealth.outOfStockLabel')}</span>
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
