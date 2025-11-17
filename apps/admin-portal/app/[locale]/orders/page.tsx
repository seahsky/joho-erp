'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  ResponsiveTable,
  type Column,
  StatusBadge,
  type StatusType,
} from '@jimmy-beef/ui';
import { Search, ShoppingBag, Loader2, Eye, Package } from 'lucide-react';
import { api } from '@/trpc/client';

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  orderedAt: Date;
  status: StatusType;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  deliveryAddress: {
    areaTag: string;
  };
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');

  const { data, isLoading, error } = api.order.getAll.useQuery({
    status: statusFilter || undefined,
    areaTag: areaFilter || undefined,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">Error loading orders</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const orders = (data?.orders ?? []) as Order[];

  // Apply client-side search filter
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query)
    );
  });

  const totalOrders = filteredOrders.length;
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending').length;
  const confirmedOrders = filteredOrders.filter((o) => o.status === 'confirmed').length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'delivered').length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      label: 'Order #',
      className: 'font-medium',
    },
    {
      key: 'customerName',
      label: 'Customer',
    },
    {
      key: 'orderedAt',
      label: 'Date',
      render: (value) => new Date(value as Date).toLocaleDateString(),
    },
    {
      key: 'items',
      label: 'Items',
      render: (value) => (value as Array<{ productName: string; quantity: number }>).length,
    },
    {
      key: 'deliveryAddress',
      label: 'Area',
      render: (_, order) => order.deliveryAddress.areaTag.toUpperCase(),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (value) => `$${(value as number).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as StatusType} />,
    },
    {
      key: 'id',
      label: 'Actions',
      className: 'text-right',
      render: () => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" aria-label="View">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCard = (order: Order) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{order.orderNumber}</h3>
          <p className="text-sm text-muted-foreground">{order.customerName}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Date</p>
          <p className="font-medium">{new Date(order.orderedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Items</p>
          <p className="font-medium">{order.items.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Area</p>
          <p className="font-medium">{order.deliveryAddress.areaTag.toUpperCase()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-medium">${order.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Order Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Track and manage customer orders
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">{totalOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-yellow-600">{pendingOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Confirmed</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-blue-600">{confirmedOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Delivered</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-green-600">{deliveredOrders}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="packing">Packing</option>
                <option value="ready_for_delivery">Ready for Delivery</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="">All Areas</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Revenue Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">
                ${totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </CardTitle>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Orders
            </div>
          </CardTitle>
          <CardDescription>Complete list of all customer orders</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ResponsiveTable
            data={filteredOrders}
            columns={columns}
            mobileCard={mobileCard}
            emptyMessage="No orders found"
            className="md:border-0"
          />
        </CardContent>
      </Card>
    </div>
  );
}
