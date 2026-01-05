'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  Badge,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '@/trpc/client';

interface DriverAssignmentDialogProps {
  orderId: string;
  orderNumber: string;
  areaId?: string | null;
  currentDriverId?: string | null;
  currentDriverName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function DriverAssignmentDialog({
  orderId,
  orderNumber,
  areaId,
  currentDriverId,
  currentDriverName,
  open,
  onOpenChange,
  onAssigned,
}: DriverAssignmentDialogProps) {
  const t = useTranslations('orderDetail.driverAssignment');
  const { toast } = useToast();

  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    currentDriverId || ''
  );
  const [showAllDrivers, setShowAllDrivers] = useState(false);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDriverId(currentDriverId || '');
      setShowAllDrivers(false);
    }
  }, [open, currentDriverId]);

  // Fetch available drivers
  const { data: drivers, isLoading: driversLoading } =
    api.delivery.getDriversForAssignment.useQuery(
      {
        date: new Date().toISOString(),
        areaId: showAllDrivers ? undefined : (areaId ?? undefined),
      },
      { enabled: open }
    );

  // Assign driver mutation
  const assignMutation = api.delivery.assignDriver.useMutation({
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('successMessage'),
      });
      onOpenChange(false);
      onAssigned();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAssign = () => {
    if (!selectedDriverId) return;

    const driver = drivers?.find((d) => d.id === selectedDriverId);
    assignMutation.mutate({
      orderId,
      driverId: selectedDriverId,
      driverName: driver?.name,
    });
  };

  const selectedDriver = drivers?.find((d) => d.id === selectedDriverId);

  // Check if area-specific drivers are available
  const hasAreaDrivers = drivers && drivers.length > 0;
  const needsAllDrivers = !hasAreaDrivers && areaId && !showAllDrivers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description', { orderNumber })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentDriverName && (
            <div>
              <Label className="text-sm text-muted-foreground">
                {t('currentDriver')}
              </Label>
              <p className="font-medium">{currentDriverName}</p>
            </div>
          )}

          {areaId && (
            <div>
              <Label className="text-sm text-muted-foreground">
                {t('deliveryArea')}
              </Label>
              <Badge variant="secondary" className="capitalize">
                {areaId}
              </Badge>
            </div>
          )}

          {needsAllDrivers && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-200">
                  {t('noDriversForArea')}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-yellow-700"
                  onClick={() => setShowAllDrivers(true)}
                >
                  {t('showAllDrivers')}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="driver-select">{t('selectDriver')}</Label>
              {areaId && !showAllDrivers && hasAreaDrivers && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto py-1"
                  onClick={() => setShowAllDrivers(true)}
                >
                  {t('showAllDrivers')}
                </Button>
              )}
              {showAllDrivers && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto py-1"
                  onClick={() => setShowAllDrivers(false)}
                >
                  {t('showAreaDrivers')}
                </Button>
              )}
            </div>
            <Select
              value={selectedDriverId}
              onValueChange={setSelectedDriverId}
              disabled={driversLoading}
            >
              <SelectTrigger id="driver-select">
                <SelectValue placeholder={t('placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {driversLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : drivers && drivers.length > 0 ? (
                  drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{driver.name}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          {driver.orderCount > 0 && `(${driver.orderCount} ${t('orders')})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    {t('noDriversAvailable')}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedDriver && selectedDriver.orderCount > 5 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-orange-800 dark:text-orange-200">
                {t('highWorkloadWarning')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignMutation.isPending}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedDriverId || assignMutation.isPending}
          >
            {assignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('assign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
