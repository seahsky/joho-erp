'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  Button,
  EmptyState,
  CountUp,
  StatusBadge,
  type StatusType,
  toast,
  Input,
  TableSkeleton,
} from '@joho-erp/ui';
import {
  Truck,
  Phone,
  MapPin,
  Package,
  Play,
  Camera,
  CheckCircle,
  Undo2,
  RefreshCw,
  Navigation,
  Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import { StartDeliveryDialog } from './components/StartDeliveryDialog';
import { PODUploadDialog } from './components/PODUploadDialog';
import { CompleteDeliveryDialog } from './components/CompleteDeliveryDialog';
import { ReturnDialog } from './components/ReturnDialog';
import { PermissionGate } from '@/components/permission-gate';

interface Delivery {
  id: string;
  orderNumber: string;
  customerName: string;
  contactPhone?: string | null;
  address: string;
  deliveryInstructions?: string | null;
  status: string;
  totalAmount: number;
  itemCount: number;
  deliverySequence?: number | null;
  hasProofOfDelivery: boolean;
}

export default function DriverPage() {
  const t = useTranslations('driver');
  const utils = api.useUtils();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ready_for_delivery' | 'out_for_delivery' | ''>('');

  // Dialog states
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isPODDialogOpen, setIsPODDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  // Fetch today's deliveries with search and filter
  const { data, isLoading, error, refetch } = api.delivery.getDriverDeliveries.useQuery({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  }, {
    refetchInterval: 60000, // Refresh every minute
  });

  // Mutations
  const startDeliveryMutation = api.delivery.markOutForDelivery.useMutation({
    onSuccess: () => {
      toast({ title: t('messages.startSuccess') });
      utils.delivery.getDriverDeliveries.invalidate();
      setIsStartDialogOpen(false);
      setSelectedDelivery(null);
    },
    onError: (err) => {
      toast({ title: t('messages.error'), description: err.message, variant: 'destructive' });
    },
  });

  const uploadPODMutation = api.delivery.uploadProofOfDelivery.useMutation({
    onSuccess: () => {
      toast({ title: t('messages.podSuccess') });
      utils.delivery.getDriverDeliveries.invalidate();
      setIsPODDialogOpen(false);
    },
    onError: (err) => {
      toast({ title: t('messages.error'), description: err.message, variant: 'destructive' });
    },
  });

  const completeDeliveryMutation = api.delivery.completeDelivery.useMutation({
    onSuccess: () => {
      toast({ title: t('messages.completeSuccess') });
      utils.delivery.getDriverDeliveries.invalidate();
      setIsCompleteDialogOpen(false);
      setSelectedDelivery(null);
    },
    onError: (err) => {
      toast({ title: t('messages.error'), description: err.message, variant: 'destructive' });
    },
  });

  const returnMutation = api.delivery.returnToWarehouse.useMutation({
    onSuccess: () => {
      toast({ title: t('messages.returnSuccess') });
      utils.delivery.getDriverDeliveries.invalidate();
      setIsReturnDialogOpen(false);
      setSelectedDelivery(null);
    },
    onError: (err) => {
      toast({ title: t('messages.error'), description: err.message, variant: 'destructive' });
    },
  });

  // Data from API with fallbacks for loading state
  const deliveries = data?.deliveries ?? [];

  // Calculate stats
  const totalDeliveries = deliveries.length;
  const readyDeliveries = data?.readyForDelivery ?? 0;
  const inProgressDeliveries = data?.outForDelivery ?? 0;
  const completedDeliveries = deliveries.filter((d) => d.status === 'delivered').length;

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Truck className="h-16 w-16 text-destructive mb-4" />
          <p className="text-destructive font-medium">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // Handler functions
  const handleStartDelivery = (delivery: (typeof deliveries)[0]) => {
    setSelectedDelivery(delivery as Delivery);
    setIsStartDialogOpen(true);
  };

  const handleUploadPOD = (delivery: (typeof deliveries)[0]) => {
    setSelectedDelivery(delivery as Delivery);
    setIsPODDialogOpen(true);
  };

  const handleCompleteDelivery = (delivery: (typeof deliveries)[0]) => {
    setSelectedDelivery(delivery as Delivery);
    setIsCompleteDialogOpen(true);
  };

  const handleReturn = (delivery: (typeof deliveries)[0]) => {
    setSelectedDelivery(delivery as Delivery);
    setIsReturnDialogOpen(true);
  };

  const handleCallCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
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
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
            className="flex-1"
          >
            {t('filters.all')}
          </Button>
          <Button
            variant={statusFilter === 'ready_for_delivery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ready_for_delivery')}
            className="flex-1"
          >
            {t('filters.ready')}
          </Button>
          <Button
            variant={statusFilter === 'out_for_delivery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('out_for_delivery')}
            className="flex-1"
          >
            {t('filters.inProgress')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.total')}</CardDescription>
            <div className="stat-value text-2xl tabular-nums">
              <CountUp end={totalDeliveries} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.ready')}</CardDescription>
            <div className="stat-value text-2xl tabular-nums text-info">
              <CountUp end={readyDeliveries} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.inProgress')}</CardDescription>
            <div className="stat-value text-2xl tabular-nums text-warning">
              <CountUp end={inProgressDeliveries} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.completed')}</CardDescription>
            <div className="stat-value text-2xl tabular-nums text-success">
              <CountUp end={completedDeliveries} />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Deliveries List */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={4} showMobileCards />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={t('noDeliveries')}
          description={t('noDeliveriesDescription')}
        />
      ) : (
        <div className="space-y-4">
          {deliveries
            .sort((a, b) => (a.deliverySequence ?? 999) - (b.deliverySequence ?? 999))
            .map((delivery) => (
              <Card key={delivery.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {delivery.deliverySequence && (
                          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                            #{delivery.deliverySequence}
                          </span>
                        )}
                        <h3 className="font-semibold text-base">{delivery.orderNumber}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{delivery.customerName}</p>
                    </div>
                    <StatusBadge status={delivery.status as StatusType} />
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p>{delivery.address}</p>
                      {delivery.deliveryInstructions && (
                        <p className="text-muted-foreground mt-1 italic">
                          {delivery.deliveryInstructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{t('card.items', { count: delivery.itemCount })}</span>
                    </div>
                    <span className="font-semibold">{formatAUD(delivery.totalAmount)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Navigate Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigate(delivery.address)}
                      className="min-h-[44px]"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      {t('card.navigate')}
                    </Button>

                    {/* Call Customer Button */}
                    {delivery.contactPhone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCallCustomer(delivery.contactPhone!)}
                        className="min-h-[44px]"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        {t('card.call')}
                      </Button>
                    )}

                    {/* Start Delivery - for ready_for_delivery */}
                    {delivery.status === 'ready_for_delivery' && (
                      <PermissionGate permission="driver:complete">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStartDelivery(delivery)}
                          className="flex-1 min-h-[44px]"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {t('actions.startDelivery')}
                        </Button>
                      </PermissionGate>
                    )}

                    {/* Out for Delivery Actions */}
                    {delivery.status === 'out_for_delivery' && (
                      <>
                        <PermissionGate permission="driver:upload_pod">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadPOD(delivery)}
                            className="min-h-[44px]"
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            {t('actions.uploadPod')}
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="driver:complete">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCompleteDelivery(delivery)}
                            className="flex-1 min-h-[44px]"
                            disabled={!delivery.hasProofOfDelivery}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('actions.completeDelivery')}
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="driver:complete">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReturn(delivery)}
                            className="min-h-[44px]"
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            {t('actions.returnToWarehouse')}
                          </Button>
                        </PermissionGate>
                      </>
                    )}

                    {/* Completed - show POD badge */}
                    {delivery.status === 'delivered' && delivery.hasProofOfDelivery && (
                      <div className="flex items-center gap-1 text-success text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>{t('podUploaded')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Dialogs */}
      <StartDeliveryDialog
        delivery={selectedDelivery}
        open={isStartDialogOpen}
        onOpenChange={setIsStartDialogOpen}
        onConfirm={async () => {
          if (selectedDelivery) {
            await startDeliveryMutation.mutateAsync({ orderId: selectedDelivery.id });
          }
        }}
        isSubmitting={startDeliveryMutation.isPending}
      />

      <PODUploadDialog
        delivery={selectedDelivery}
        open={isPODDialogOpen}
        onOpenChange={setIsPODDialogOpen}
        onUpload={async (fileUrl: string, type: 'photo' | 'signature') => {
          if (selectedDelivery) {
            await uploadPODMutation.mutateAsync({
              orderId: selectedDelivery.id,
              type,
              fileUrl,
            });
          }
        }}
        isSubmitting={uploadPODMutation.isPending}
      />

      <CompleteDeliveryDialog
        delivery={selectedDelivery}
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
        onConfirm={async (notes) => {
          if (selectedDelivery) {
            await completeDeliveryMutation.mutateAsync({
              orderId: selectedDelivery.id,
              notes,
            });
          }
        }}
        isSubmitting={completeDeliveryMutation.isPending}
      />

      <ReturnDialog
        delivery={selectedDelivery}
        open={isReturnDialogOpen}
        onOpenChange={setIsReturnDialogOpen}
        onConfirm={async (reason, notes) => {
          if (selectedDelivery) {
            await returnMutation.mutateAsync({
              orderId: selectedDelivery.id,
              reason,
              notes,
            });
          }
        }}
        isSubmitting={returnMutation.isPending}
      />
    </div>
  );
}
