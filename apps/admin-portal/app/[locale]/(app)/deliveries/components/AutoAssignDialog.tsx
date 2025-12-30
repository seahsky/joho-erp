'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  useToast,
  Badge,
  Skeleton,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, Users, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import { api } from '@/trpc/client';

interface AutoAssignDialogProps {
  deliveryDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function AutoAssignDialog({
  deliveryDate,
  open,
  onOpenChange,
  onAssigned,
}: AutoAssignDialogProps) {
  const t = useTranslations('deliveries.autoAssignment');
  const { toast } = useToast();

  // Fetch preview data
  const { data: preview, isLoading: previewLoading } =
    api.delivery.getAutoAssignmentPreview.useQuery(
      { deliveryDate },
      { enabled: open }
    );

  // Auto-assign mutation
  const assignMutation = api.delivery.autoAssignDriversByArea.useMutation({
    onSuccess: (result) => {
      toast({
        title: t('success'),
        description: t('successMessage', { count: result.totalAssigned }),
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
    assignMutation.mutate({ deliveryDate });
  };

  const hasUnassignableAreas =
    preview?.preview.some((p) => p.orderCount > 0 && !p.hasDrivers) ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {previewLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          ) : preview?.totalOrders === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('noOrdersToAssign')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {t('preview')} ({preview?.totalOrders} {t('ordersTotal')})
              </div>

              <div className="space-y-3">
                {preview?.preview.map((area) => (
                  <div
                    key={area.area}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      area.orderCount > 0 && !area.hasDrivers
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium capitalize">{area.area}</div>
                        <div className="text-sm text-muted-foreground">
                          {area.orderCount} {t('orders')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                      {area.hasDrivers ? (
                        area.drivers.map((driver) => (
                          <Badge key={driver.id} variant="secondary" className="text-xs">
                            {driver.name.split(' ')[0]}
                          </Badge>
                        ))
                      ) : area.orderCount > 0 ? (
                        <div className="flex items-center gap-1 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {t('noDrivers')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasUnassignableAreas && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-yellow-800 dark:text-yellow-200">
                    {t('someAreasNoDrivers')}
                  </p>
                </div>
              )}
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
            disabled={
              previewLoading ||
              preview?.totalOrders === 0 ||
              assignMutation.isPending
            }
          >
            {assignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
