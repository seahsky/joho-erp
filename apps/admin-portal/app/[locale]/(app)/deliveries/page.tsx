'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, TableSkeleton, StatusBadge, type StatusType, useToast, Badge, Input } from '@joho-erp/ui';
import { MapPin, Navigation, CheckCircle, Package, FileText, Users, Clock, Calendar, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { PermissionGate } from '@/components/permission-gate';
import { useTableSort } from '@joho-erp/shared/hooks';
import { RouteManifestDialog, DriverFilter, AutoAssignDialog, MarkDeliveredDialog } from './components';
import { StatsBar, FilterBar, type StatItem } from '@/components/operations';

// Dynamically import Map component to avoid SSR issues
const DeliveryMap = dynamic(() => import('./delivery-map'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg" />,
});

export default function DeliveriesPage() {
  const t = useTranslations('deliveries');
  const tPacking = useTranslations('packing');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const utils = api.useUtils();
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ready_for_delivery' | 'delivered' | ''>('');
  const [areaFilter, setAreaFilter] = useState<string>(''); // Now uses areaId
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);
  const [autoAssignDialogOpen, setAutoAssignDialogOpen] = useState(false);
  const [markDeliveredDialog, setMarkDeliveredDialog] = useState<{
    open: boolean;
    delivery: { id: string; orderId: string; customer: string; packedAt?: Date | null } | null;
  }>({ open: false, delivery: null });
  const { sortBy, sortOrder } = useTableSort('deliverySequence', 'asc');

  // Date selector state for filtering by packing date (using local timezone)
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [deliveryDate, setDeliveryDate] = useState<Date>(today);

  // Date helper functions
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const utcDate = new Date(Date.UTC(year, month, day));

    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(utcDate);
  };

  // Date change handler - creates local midnight
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    setDeliveryDate(newDate);
  };

  // Date input value helper - uses local timezone methods
  const dateInputValue = useMemo(() => {
    const year = deliveryDate.getFullYear();
    const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
    const day = String(deliveryDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [deliveryDate]);

  // End of day timestamp for date filtering (23:59:59.999 local time)
  const deliveryDateEnd = useMemo(() => {
    const endOfDay = new Date(deliveryDate.getTime());
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }, [deliveryDate]);

  // Mark Delivered mutation (for admins)
  const markDeliveredMutation = api.delivery.markDelivered.useMutation({
    onSuccess: () => {
      toast({
        title: t('messages.markDeliveredSuccess'),
      });
      void utils.delivery.getAll.invalidate();
      void utils.delivery.getOptimizedRoute.invalidate();
      setMarkDeliveredDialog({ open: false, delivery: null });
    },
    onError: (error) => {
      console.error('Mark delivered error:', error.message);
      toast({
        title: t('messages.markDeliveredError'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  // Optimize Route mutation (for recalculating the route)
  const optimizeRouteMutation = api.packing.optimizeRoute.useMutation();

  // Handler for recalculating the delivery route
  const handleRecalculateRoute = async () => {
    if (!deliveryDate) return;
    setIsRecalculatingRoute(true);
    try {
      await optimizeRouteMutation.mutateAsync({
        deliveryDate: deliveryDate.toISOString(),
        force: true,
      });
      await utils.delivery.getOptimizedRoute.invalidate();
      await utils.delivery.getAll.invalidate();
      toast({
        title: tPacking('routeOptimized'),
      });
    } catch (error) {
      toast({
        title: tErrors('optimizationFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRecalculatingRoute(false);
    }
  };

  // Get ISO date string for route optimization query
  const deliveryDateISO = useMemo(() => deliveryDate.toISOString(), [deliveryDate]);

  // Fetch deliveries from database, filtered by packing date
  const { data, isLoading } = api.delivery.getAll.useQuery({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    areaId: areaFilter || undefined,
    dateFrom: deliveryDate, // Filter by packing date (local midnight)
    dateTo: deliveryDateEnd, // End of day in local timezone
    sortBy,
    sortOrder,
  });

  // Fetch optimized route data for the map
  const { data: routeData } = api.delivery.getOptimizedRoute.useQuery({
    deliveryDate: deliveryDateISO,
  });

  const deliveries = useMemo(() => data?.deliveries || [], [data?.deliveries]);

  // Extract unique drivers from deliveries for the filter
  const driversWithRoutes = useMemo(() => {
    if (!deliveries.length) return [];

    const driverMap = new Map<string, { id: string; name: string; orderCount: number }>();

    deliveries.forEach((delivery) => {
      const driverId = delivery.driverId;
      const driverName = delivery.driverName;

      if (driverId) {
        const existing = driverMap.get(driverId);
        if (existing) {
          existing.orderCount++;
        } else {
          driverMap.set(driverId, {
            id: driverId,
            name: driverName || 'Unknown Driver',
            orderCount: 1,
          });
        }
      }
    });

    return Array.from(driverMap.values());
  }, [deliveries]);

  // Filter deliveries by selected driver
  const filteredDeliveries = useMemo(() => {
    if (!selectedDriverId) return deliveries;
    return deliveries.filter((d) => d.driverId === selectedDriverId);
  }, [deliveries, selectedDriverId]);

  // Calculate stats for StatsBar
  const stats = useMemo<StatItem[]>(() => {
    const total = filteredDeliveries.length;
    const pending = filteredDeliveries.filter((d) => d.status === 'ready_for_delivery').length;
    const delivered = filteredDeliveries.filter((d) => d.status === 'delivered').length;

    return [
      { label: t('stats.totalDeliveries'), value: total, icon: Package },
      { label: t('stats.readyForDelivery'), value: pending, icon: Clock, variant: 'warning' as const },
      { label: t('stats.delivered'), value: delivered, icon: CheckCircle, variant: 'success' as const },
    ];
  }, [filteredDeliveries, t]);

  // Transform route data for the map component with filter support
  const mapRouteData = useMemo(() => {
    if (!routeData?.hasRoute || !routeData.route) return null;

    // Get order IDs from filtered deliveries
    const filteredOrderIds = new Set(filteredDeliveries.map((d) => d.id));

    // Filter waypoints to only include orders that are in the filtered list
    const filteredWaypoints = routeData.route.waypoints?.filter(
      (wp: { orderId: string }) => filteredOrderIds.has(wp.orderId)
    ) || [];

    // If no waypoints match filters, return null (no route to display)
    if (filteredWaypoints.length === 0) return null;

    // Sort filtered waypoints by sequence
    const sortedWaypoints = [...filteredWaypoints].sort(
      (a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence
    );

    // Generate LineString geometry from filtered waypoint coordinates
    const filteredGeometry = {
      type: 'LineString' as const,
      coordinates: sortedWaypoints.map(
        (wp: { longitude: number; latitude: number }): [number, number] => [wp.longitude, wp.latitude]
      ),
    };

    return {
      geometry: filteredGeometry,
      totalDistance: routeData.route.totalDistance,
      totalDuration: routeData.route.totalDuration,
    };
  }, [routeData, filteredDeliveries]);

  // Auto-select the first delivery when data loads (already sorted by deliverySequence from API)
  useEffect(() => {
    if (deliveries.length > 0 && selectedDelivery === null) {
      setSelectedDelivery(deliveries[0].id);
    }
  }, [deliveries, selectedDelivery]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* Driver Filter - show only if multiple drivers */}
          {driversWithRoutes.length > 1 && (
            <DriverFilter
              drivers={driversWithRoutes}
              selectedDriverId={selectedDriverId}
              onDriverChange={setSelectedDriverId}
            />
          )}
          <PermissionGate permission="deliveries:manage">
            <Button onClick={() => setAutoAssignDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              {t('autoAssignDrivers')}
            </Button>
          </PermissionGate>
          <PermissionGate permission="deliveries:view">
            <Button onClick={() => setManifestDialogOpen(true)} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              {t('printManifest')}
            </Button>
          </PermissionGate>
          <PermissionGate permission="packing:manage">
            <Button
              onClick={handleRecalculateRoute}
              variant="outline"
              disabled={isRecalculatingRoute || !deliveryDate}
            >
              {isRecalculatingRoute ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tPacking('optimizingRoute')}
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  {tPacking('regenerateRoute')}
                </>
              )}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Date Selector - Filter by packing date */}
      <Card className="mb-4">
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  {t('selectDate')}
                </label>
                <Input
                  type="date"
                  value={dateInputValue}
                  onChange={handleDateChange}
                  className="w-auto"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('showingOrdersPackedOn', { date: formatDate(deliveryDate) })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <FilterBar
        showSearchFilter
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('searchPlaceholder')}
        showStatusFilter
        status={statusFilter}
        onStatusChange={(s) => setStatusFilter(s as 'ready_for_delivery' | 'delivered' | '')}
        statusOptions={[
          { value: 'ready_for_delivery', label: t('filters.readyForDelivery') },
          { value: 'delivered', label: t('filters.delivered') },
        ]}
        showAreaFilter
        areaId={areaFilter}
        onAreaChange={setAreaFilter}
        showDriverFilter
        driverId={selectedDriverId ?? ''}
        onDriverChange={(id) => setSelectedDriverId(id || null)}
        drivers={driversWithRoutes}
        className="mb-4"
      />

      {/* Stats Bar */}
      {filteredDeliveries.length > 0 && (
        <StatsBar stats={stats} className="mb-6" />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Delivery List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t('activeDeliveries')}</CardTitle>
              <CardDescription>{filteredDeliveries.length} {t('deliveriesInProgress')}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              {isLoading ? (
                <TableSkeleton rows={4} columns={3} showMobileCards />
              ) : filteredDeliveries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('noDeliveriesFound')}</p>
              ) : (
                filteredDeliveries.map((delivery) => (
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
                      {delivery.packedAt && (
                        <Badge variant="outline" className="text-xs mt-1">
                          <Package className="h-3 w-3 mr-1" />
                          {t('packedOn', {
                            date: new Date(delivery.packedAt).toLocaleDateString('en-AU', {
                              month: 'short',
                              day: 'numeric'
                            })
                          })}
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={delivery.status as StatusType} />
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
                      {delivery.areaName && `${t('area')}: ${delivery.areaName}`}
                      {delivery.deliverySequence && ` • ${t('sequence')}: #${delivery.deliverySequence}`}
                    </span>
                    {delivery.status === 'ready_for_delivery' && (
                      <PermissionGate permission="deliveries:manage">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent selecting the delivery card
                            setMarkDeliveredDialog({
                              open: true,
                              delivery: {
                                id: delivery.id,
                                orderId: delivery.orderId,
                                customer: delivery.customer,
                                packedAt: delivery.packedAt ? new Date(delivery.packedAt) : null,
                              },
                            });
                          }}
                          disabled={markDeliveredMutation.isPending}
                        >
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
                deliveries={filteredDeliveries}
                selectedDelivery={selectedDelivery}
                routeData={mapRouteData}
                selectedDriverId={selectedDriverId}
                warehouseLocation={routeData?.warehouseLocation}
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
        selectedDate={deliveryDate}
        selectedArea={areaFilter || undefined}
      />

      {/* Auto-Assign Drivers Dialog */}
      <AutoAssignDialog
        deliveryDate={deliveryDateISO}
        open={autoAssignDialogOpen}
        onOpenChange={setAutoAssignDialogOpen}
        onAssigned={() => {
          void utils.delivery.getAll.invalidate();
          void utils.delivery.getOptimizedRoute.invalidate();
        }}
      />

      {/* Mark Delivered Dialog (for admins) */}
      <MarkDeliveredDialog
        delivery={markDeliveredDialog.delivery}
        open={markDeliveredDialog.open}
        onOpenChange={(open) => setMarkDeliveredDialog({ ...markDeliveredDialog, open })}
        onConfirm={async (notes, adminOverride) => {
          if (markDeliveredDialog.delivery) {
            await markDeliveredMutation.mutateAsync({
              orderId: markDeliveredDialog.delivery.id,
              notes,
              adminOverride,
            });
          }
        }}
        isSubmitting={markDeliveredMutation.isPending}
      />
    </div>
  );
}
