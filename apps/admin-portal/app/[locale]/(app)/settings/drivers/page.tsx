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
  AreaBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@joho-erp/ui';
import { Truck, Save, Loader2, Ban, Circle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { PermissionGate } from '@/components/permission-gate';

// Area type definition
interface Area {
  id: string;
  name: string;
  displayName: string;
  colorVariant: string;
}

// Driver type definition
interface Driver {
  id: string;
  name: string;
  email: string;
  areaIds?: string[];
}

export default function DriverAreasSettingsPage() {
  const t = useTranslations('settings.driverAreas');
  const { toast } = useToast();
  const utils = api.useUtils();

  // Track which drivers have unsaved changes (maps driverId to areaId or null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, string | null>>(
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

  // Get current area for a driver (from pending changes or original data)
  // Returns the first areaId or null (one-to-one relationship)
  const getDriverAreaId = (
    driverId: string,
    originalAreaIds: string[]
  ): string | null => {
    if (pendingChanges.has(driverId)) {
      return pendingChanges.get(driverId) ?? null;
    }
    return originalAreaIds[0] ?? null;
  };

  // Build a map of areaId -> driverId for checking which areas are taken
  const getAreaToDriverMap = (): Map<string, string> => {
    const map = new Map<string, string>();
    if (!drivers) return map;

    for (const driver of drivers) {
      const areaId = getDriverAreaId(driver.id, driver.areaIds ?? []);
      if (areaId) {
        map.set(areaId, driver.id);
      }
    }
    return map;
  };

  const areaToDriverMap = getAreaToDriverMap();

  // Check if an area is assigned to another driver
  const isAreaTakenByOther = (areaId: string, currentDriverId: string): boolean => {
    const assignedDriverId = areaToDriverMap.get(areaId);
    return assignedDriverId !== undefined && assignedDriverId !== currentDriverId;
  };

  // Get driver name who has this area
  const getDriverNameForArea = (areaId: string): string | null => {
    const driverId = areaToDriverMap.get(areaId);
    if (!driverId || !drivers) return null;
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name ?? null;
  };

  // Select an area for a driver (radio button behavior)
  const selectArea = (
    driverId: string,
    areaId: string | null,
    originalAreaIds: string[]
  ) => {
    const originalAreaId = originalAreaIds[0] ?? null;

    // Check if selection matches original (no pending change)
    const isSameAsOriginal = areaId === originalAreaId;

    setPendingChanges((prev) => {
      const next = new Map(prev);
      if (isSameAsOriginal) {
        next.delete(driverId);
      } else {
        next.set(driverId, areaId);
      }
      return next;
    });
  };

  // Save changes for a driver
  const saveDriverAreas = async (driverId: string) => {
    if (!pendingChanges.has(driverId)) return;

    const areaId = pendingChanges.get(driverId);
    const areaIds = areaId ? [areaId] : [];

    setSavingDriverId(driverId);
    try {
      await setAreasMutation.mutateAsync({ driverId, areaIds });
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.delete(driverId);
        return next;
      });
    } catch {
      // Error handled by mutation onError
    }
  };

  // Check if a driver has pending changes
  const hasPendingChanges = (driverId: string) => pendingChanges.has(driverId);

  // Calculate dynamic grid template based on number of areas + 1 for "None"
  const gridCols = (areas?.length ?? 4) + 1; // +1 for "None" column
  const gridTemplate = `1fr repeat(${gridCols}, 80px) 100px`;

  return (
    <PermissionGate permission="deliveries:manage" fallback={null}>
      <TooltipProvider>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription>{t('exclusiveDescription')}</CardDescription>
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
                    <div className="text-center text-muted-foreground text-xs">
                      {t('none')}
                    </div>
                    {areas.map((area: Area) => (
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
                    const currentAreaId = getDriverAreaId(
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

                        {/* "None" option */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              selectArea(driver.id, null, driver.areaIds ?? [])
                            }
                            disabled={isSaving}
                            className="flex items-center justify-center w-6 h-6 rounded-full transition-colors hover:bg-muted disabled:opacity-50"
                            aria-label={t('none')}
                          >
                            {currentAreaId === null ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        {/* Area options */}
                        {areas.map((area: Area) => {
                          const isSelected = currentAreaId === area.id;
                          const isTakenByOther = isAreaTakenByOther(area.id, driver.id);
                          const takenByName = isTakenByOther
                            ? getDriverNameForArea(area.id)
                            : null;

                          return (
                            <div key={area.id} className="flex justify-center">
                              {isTakenByOther ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center w-6 h-6 cursor-not-allowed">
                                      <Ban className="h-5 w-5 text-muted-foreground/50" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('areaTakenBy', { name: takenByName ?? '' })}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectArea(driver.id, area.id, driver.areaIds ?? [])
                                  }
                                  disabled={isSaving}
                                  className="flex items-center justify-center w-6 h-6 rounded-full transition-colors hover:bg-muted disabled:opacity-50"
                                  aria-label={area.displayName}
                                >
                                  {isSelected ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}

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
                    {areas.map((area: Area) => {
                      const assignedDriverId = areaToDriverMap.get(area.id);
                      const assignedDriver = assignedDriverId
                        ? drivers.find((d: Driver) => d.id === assignedDriverId)
                        : null;

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
                          {assignedDriver ? (
                            <>
                              <div className="text-sm font-medium mt-2">
                                {assignedDriver.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('assigned')}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm text-muted-foreground mt-2">
                                {t('unassigned')}
                              </div>
                              <div className="text-xs text-destructive">
                                {t('noDriverAssigned')}
                              </div>
                            </>
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
      </TooltipProvider>
    </PermissionGate>
  );
}
