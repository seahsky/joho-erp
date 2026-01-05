'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
  useToast,
  Badge,
  Checkbox,
  AreaBadge,
} from '@joho-erp/ui';
import { Truck, Save, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { PermissionGate } from '@/components/permission-gate';

export default function DriverAreasSettingsPage() {
  const t = useTranslations('settings.driverAreas');
  const { toast } = useToast();
  const utils = api.useUtils();

  // Track which drivers have unsaved changes (maps driverId to array of areaIds)
  const [pendingChanges, setPendingChanges] = useState<Map<string, string[]>>(
    new Map()
  );
  const [savingDriverId, setSavingDriverId] = useState<string | null>(null);

  // API queries - fetch areas dynamically
  const { data: areas, isLoading: areasLoading } = api.area.list.useQuery();
  const { data: drivers, isLoading: driversLoading } =
    api.delivery.getDriversWithAreas.useQuery();

  const isLoading = areasLoading || driversLoading;

  // Mutation
  const setAreasMutation = api.delivery.setDriverAreas.useMutation({
    onSuccess: () => {
      toast({ title: t('saveSuccess'), variant: 'default' });
      void utils.delivery.getDriversWithAreas.invalidate();
    },
    onError: (error) => {
      toast({
        title: t('saveError'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setSavingDriverId(null);
    },
  });

  // Get current areas for a driver (from pending changes or original data)
  const getDriverAreaIds = (
    driverId: string,
    originalAreaIds: string[]
  ): string[] => {
    return pendingChanges.get(driverId) ?? originalAreaIds;
  };

  // Toggle an area for a driver
  const toggleArea = (
    driverId: string,
    areaId: string,
    originalAreaIds: string[]
  ) => {
    const currentAreaIds = getDriverAreaIds(driverId, originalAreaIds);
    const newAreaIds = currentAreaIds.includes(areaId)
      ? currentAreaIds.filter((id) => id !== areaId)
      : [...currentAreaIds, areaId];

    // Check if newAreaIds matches original (no pending change)
    const isSameAsOriginal =
      newAreaIds.length === originalAreaIds.length &&
      newAreaIds.every((id) => originalAreaIds.includes(id));

    setPendingChanges((prev) => {
      const next = new Map(prev);
      if (isSameAsOriginal) {
        next.delete(driverId);
      } else {
        next.set(driverId, newAreaIds);
      }
      return next;
    });
  };

  // Save changes for a driver
  const saveDriverAreas = async (driverId: string) => {
    const areaIds = pendingChanges.get(driverId);
    if (!areaIds) return;

    setSavingDriverId(driverId);
    await setAreasMutation.mutateAsync({ driverId, areaIds });
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(driverId);
      return next;
    });
  };

  // Check if a driver has pending changes
  const hasPendingChanges = (driverId: string) => pendingChanges.has(driverId);

  // Calculate dynamic grid template based on number of areas
  const gridCols = areas?.length ?? 4;
  const gridTemplate = `1fr repeat(${gridCols}, 80px) 100px`;

  return (
    <PermissionGate permission="deliveries:manage" fallback={null}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : !drivers || drivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noDrivers')}
              </div>
            ) : !areas || areas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noAreas')}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Header row */}
                <div
                  className="grid gap-4 py-2 px-4 bg-muted/50 rounded-t-lg font-medium text-sm"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div>{t('driver')}</div>
                  {areas.map((area) => (
                    <div key={area.id} className="text-center">
                      <AreaBadge
                        area={{
                          name: area.name,
                          displayName: area.displayName,
                          colorVariant: area.colorVariant,
                        }}
                        className="text-xs"
                      />
                    </div>
                  ))}
                  <div className="text-center">{t('actions')}</div>
                </div>

                {/* Driver rows */}
                {drivers.map((driver) => {
                  const currentAreaIds = getDriverAreaIds(
                    driver.id,
                    driver.areaIds ?? []
                  );
                  const hasChanges = hasPendingChanges(driver.id);
                  const isSaving = savingDriverId === driver.id;

                  return (
                    <div
                      key={driver.id}
                      className={`grid gap-4 py-3 px-4 items-center border-b last:border-b-0 ${
                        hasChanges ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                      }`}
                      style={{ gridTemplateColumns: gridTemplate }}
                    >
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {driver.email}
                        </div>
                      </div>
                      {areas.map((area) => (
                        <div key={area.id} className="flex justify-center">
                          <Checkbox
                            checked={currentAreaIds.includes(area.id)}
                            onCheckedChange={() =>
                              toggleArea(
                                driver.id,
                                area.id,
                                driver.areaIds ?? []
                              )
                            }
                            disabled={isSaving}
                          />
                        </div>
                      ))}
                      <div className="flex justify-center">
                        {hasChanges && (
                          <Button
                            size="sm"
                            onClick={() => saveDriverAreas(driver.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {drivers && drivers.length > 0 && areas && areas.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">{t('summary')}</h4>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(areas.length, 4)}, 1fr)`,
                  }}
                >
                  {areas.map((area) => {
                    const assignedDrivers = drivers.filter((d) =>
                      getDriverAreaIds(d.id, d.areaIds ?? []).includes(area.id)
                    );
                    return (
                      <div key={area.id} className="p-3 bg-muted rounded-lg">
                        <div className="mb-1">
                          <AreaBadge
                            area={{
                              name: area.name,
                              displayName: area.displayName,
                              colorVariant: area.colorVariant,
                            }}
                          />
                        </div>
                        <div className="text-2xl font-bold">
                          {assignedDrivers.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignedDrivers.length === 1
                            ? t('driverSingular')
                            : t('driverPlural')}
                        </div>
                        {assignedDrivers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {assignedDrivers.map((d) => (
                              <Badge
                                key={d.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {d.name.split(' ')[0]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
