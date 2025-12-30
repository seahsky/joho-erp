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
} from '@joho-erp/ui';
import { Truck, Save, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { PermissionGate } from '@/components/permission-gate';

type AreaTag = 'north' | 'south' | 'east' | 'west';

const AREAS: AreaTag[] = ['north', 'south', 'east', 'west'];

export default function DriverAreasSettingsPage() {
  const t = useTranslations('settings.driverAreas');
  const { toast } = useToast();
  const utils = api.useUtils();

  // Track which drivers have unsaved changes
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, AreaTag[]>
  >(new Map());
  const [savingDriverId, setSavingDriverId] = useState<string | null>(null);

  // API queries
  const { data: drivers, isLoading } = api.delivery.getDriversWithAreas.useQuery();

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
  const getDriverAreas = (driverId: string, originalAreas: AreaTag[]): AreaTag[] => {
    return pendingChanges.get(driverId) ?? originalAreas;
  };

  // Toggle an area for a driver
  const toggleArea = (driverId: string, area: AreaTag, originalAreas: AreaTag[]) => {
    const currentAreas = getDriverAreas(driverId, originalAreas);
    const newAreas = currentAreas.includes(area)
      ? currentAreas.filter((a) => a !== area)
      : [...currentAreas, area];

    // Check if newAreas matches original (no pending change)
    const isSameAsOriginal =
      newAreas.length === originalAreas.length &&
      newAreas.every((a) => originalAreas.includes(a));

    setPendingChanges((prev) => {
      const next = new Map(prev);
      if (isSameAsOriginal) {
        next.delete(driverId);
      } else {
        next.set(driverId, newAreas);
      }
      return next;
    });
  };

  // Save changes for a driver
  const saveDriverAreas = async (driverId: string) => {
    const areas = pendingChanges.get(driverId);
    if (!areas) return;

    setSavingDriverId(driverId);
    await setAreasMutation.mutateAsync({ driverId, areas });
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(driverId);
      return next;
    });
  };

  // Check if a driver has pending changes
  const hasPendingChanges = (driverId: string) => pendingChanges.has(driverId);

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
            ) : (
              <div className="space-y-1">
                {/* Header row */}
                <div className="grid grid-cols-[1fr,repeat(4,80px),100px] gap-4 py-2 px-4 bg-muted/50 rounded-t-lg font-medium text-sm">
                  <div>{t('driver')}</div>
                  {AREAS.map((area) => (
                    <div key={area} className="text-center capitalize">
                      {t(`areas.${area}`)}
                    </div>
                  ))}
                  <div className="text-center">{t('actions')}</div>
                </div>

                {/* Driver rows */}
                {drivers.map((driver) => {
                  const currentAreas = getDriverAreas(driver.id, driver.areas as AreaTag[]);
                  const hasChanges = hasPendingChanges(driver.id);
                  const isSaving = savingDriverId === driver.id;

                  return (
                    <div
                      key={driver.id}
                      className={`grid grid-cols-[1fr,repeat(4,80px),100px] gap-4 py-3 px-4 items-center border-b last:border-b-0 ${
                        hasChanges ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {driver.email}
                        </div>
                      </div>
                      {AREAS.map((area) => (
                        <div key={area} className="flex justify-center">
                          <Checkbox
                            checked={currentAreas.includes(area)}
                            onCheckedChange={() =>
                              toggleArea(driver.id, area, driver.areas as AreaTag[])
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
            {drivers && drivers.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">{t('summary')}</h4>
                <div className="grid grid-cols-4 gap-4">
                  {AREAS.map((area) => {
                    const assignedDrivers = drivers.filter((d) =>
                      getDriverAreas(d.id, d.areas as AreaTag[]).includes(area)
                    );
                    return (
                      <div key={area} className="p-3 bg-muted rounded-lg">
                        <div className="font-medium capitalize mb-1">
                          {t(`areas.${area}`)}
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
                              <Badge key={d.id} variant="secondary" className="text-xs">
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
