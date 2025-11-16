'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@jimmy-beef/ui';
import { MapPin, Navigation, CheckCircle, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/trpc/client';

// Dynamically import Map component to avoid SSR issues
const DeliveryMap = dynamic(() => import('./delivery-map'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg" />,
});

export default function DeliveriesPage() {
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ready_for_delivery' | 'out_for_delivery' | undefined>(
    undefined
  );
  const [areaFilter, setAreaFilter] = useState<'north' | 'south' | 'east' | 'west' | undefined>(undefined);

  // Fetch deliveries from database
  const { data, isLoading } = api.delivery.getAll.useQuery({
    status: statusFilter,
    areaTag: areaFilter,
  });

  const deliveries = data?.deliveries || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'ready_for_delivery':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Delivery Management</h1>
            <p className="text-muted-foreground mt-2">Track and manage deliveries in real-time</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-muted rounded"></div>
                  <div className="h-20 bg-muted rounded"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="w-full h-[600px] bg-muted animate-pulse rounded-lg"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Delivery Management</h1>
          <p className="text-muted-foreground mt-2">Track and manage deliveries in real-time</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Delivery List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
              <CardDescription>{deliveries.length} deliveries in progress</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              {deliveries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No deliveries found</p>
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
                      <span>{delivery.items} items</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      <span>{delivery.estimatedTime}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Driver: {delivery.driver}</span>
                    {delivery.status === 'out_for_delivery' && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Delivered
                      </Button>
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
              <CardTitle>Delivery Routes</CardTitle>
              <CardDescription>Real-time delivery tracking on map</CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryMap deliveries={deliveries} selectedDelivery={selectedDelivery} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
