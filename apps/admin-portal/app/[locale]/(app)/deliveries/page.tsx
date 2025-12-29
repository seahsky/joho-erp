'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, Input, TableSkeleton } from '@joho-erp/ui';
import { MapPin, Navigation, CheckCircle, Package, Search, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { PermissionGate } from '@/components/permission-gate';
import { useTableSort } from '@joho-erp/shared/hooks';
import { RouteManifestDialog } from './components';

// Dynamically import Map component to avoid SSR issues
const DeliveryMap = dynamic(() => import('./delivery-map'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg" />,
});

export default function DeliveriesPage() {
  const t = useTranslations('deliveries');
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ready_for_delivery' | 'delivered' | ''>('');
  const [areaFilter, setAreaFilter] = useState<'north' | 'south' | 'east' | 'west' | ''>('');
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);
  const { sortBy, sortOrder } = useTableSort('deliverySequence', 'asc');

  // Fetch deliveries from database
  const { data, isLoading } = api.delivery.getAll.useQuery({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    areaTag: areaFilter || undefined,
    sortBy,
    sortOrder,
  });

  const deliveries = useMemo(() => data?.deliveries || [], [data?.deliveries]);

  // Auto-select the first delivery when data loads (already sorted by deliverySequence from API)
  useEffect(() => {
    if (deliveries.length > 0 && selectedDelivery === null) {
      setSelectedDelivery(deliveries[0].id);
    }
  }, [deliveries, selectedDelivery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready_for_delivery':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <PermissionGate permission="deliveries:view">
          <Button onClick={() => setManifestDialogOpen(true)} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            {t('printManifest')}
          </Button>
        </PermissionGate>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Delivery List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t('activeDeliveries')}</CardTitle>
              <CardDescription>{deliveries.length} {t('deliveriesInProgress')}</CardDescription>
              {/* Search and Filters */}
              <div className="pt-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ready_for_delivery' | 'delivered' | '')}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">{t('filters.allStatuses')}</option>
                    <option value="ready_for_delivery">{t('filters.readyForDelivery')}</option>
                    <option value="delivered">{t('filters.delivered')}</option>
                  </select>
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value as 'north' | 'south' | 'east' | 'west' | '')}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">{t('filters.allAreas')}</option>
                    <option value="north">{t('filters.north')}</option>
                    <option value="south">{t('filters.south')}</option>
                    <option value="east">{t('filters.east')}</option>
                    <option value="west">{t('filters.west')}</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              {isLoading ? (
                <TableSkeleton rows={4} columns={3} showMobileCards />
              ) : deliveries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noDeliveriesFound')}</p>
              ) : (
                deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedDelivery === delivery.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDelivery(delivery.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{delivery.customer}</p>
                      <p className="text-xs text-muted-foreground">{delivery.orderId}</p>
                    </div>
                    <Badge className={getStatusColor(delivery.status)}>
                      {delivery.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{delivery.address}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{delivery.items} {t('items')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      <span>{delivery.estimatedTime}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t('area')}: {delivery.areaTag.toUpperCase()}
                      {delivery.deliverySequence && ` • ${t('sequence')}: #${delivery.deliverySequence}`}
                    </span>
                    {delivery.status === 'ready_for_delivery' && (
                      <PermissionGate permission="deliveries:manage">
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('markAsDelivered')}
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('deliveryRoutes')}</CardTitle>
              <CardDescription>{t('realTimeTracking')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryMap
                deliveries={deliveries}
                selectedDelivery={selectedDelivery}
                emptyStateTitle={t('noDeliveriesAvailable')}
                emptyStateDescription={t('deliveriesWillAppear')}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Route Manifest Dialog */}
      <RouteManifestDialog
        open={manifestDialogOpen}
        onOpenChange={setManifestDialogOpen}
        selectedDate={new Date()}
        selectedArea={areaFilter || undefined}
      />
    </div>
  );
}
