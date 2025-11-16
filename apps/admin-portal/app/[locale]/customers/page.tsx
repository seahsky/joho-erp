'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
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
import { Search, UserPlus, Check, X, Eye, Mail, Phone, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';

type Customer = {
  _id: string;
  businessName: string;
  abn: string;
  contactPerson: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  status: StatusType;
  creditApplication: {
    status: StatusType;
    creditLimit: number;
  };
  deliveryAddress: {
    areaTag: string;
  };
  orders?: number;
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = api.customer.getAll.useQuery({
    search: searchQuery || undefined,
    limit: 100,
  });

  // TODO: Implement approval mutations when needed
  // const _approveMutation = api.customer.approveCredit.useMutation();
  // const _rejectMutation = api.customer.rejectCredit.useMutation();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">Error loading customers</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const customers = (data?.customers ?? []) as Customer[];
  const totalCustomers = data?.total || 0;
  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const pendingCredit = customers.filter((c) => c.creditApplication.status === 'pending').length;

  const columns: Column<Customer>[] = [
    {
      key: 'businessName',
      label: 'Business Name',
      className: 'font-medium',
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      render: (_, customer) => `${customer.contactPerson.firstName} ${customer.contactPerson.lastName}`,
    },
    {
      key: 'contactPerson',
      label: 'Email',
      className: 'text-sm text-muted-foreground',
      render: (_, customer) => customer.contactPerson.email,
    },
    {
      key: 'deliveryAddress',
      label: 'Area',
      render: (_, customer) => customer.deliveryAddress.areaTag,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as StatusType} />,
    },
    {
      key: 'creditApplication',
      label: 'Credit Status',
      render: (_, customer) => <StatusBadge status={customer.creditApplication.status as StatusType} />,
    },
    {
      key: 'creditApplication',
      label: 'Credit Limit',
      render: (_, customer) =>
        customer.creditApplication.creditLimit > 0
          ? `$${customer.creditApplication.creditLimit.toLocaleString()}`
          : '-',
    },
    {
      key: 'orders',
      label: 'Orders',
      render: (value) => value || 0,
    },
    {
      key: '_id',
      label: 'Actions',
      className: 'text-right',
      render: (_, customer) => (
        <div className="flex justify-end gap-2">
          {customer.creditApplication.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm" aria-label="Approve">
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" aria-label="Reject">
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" aria-label="View">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Mobile card view
  const mobileCard = (customer: Customer) => (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{customer.businessName}</h3>
          <p className="text-sm text-muted-foreground">
            {customer.contactPerson.firstName} {customer.contactPerson.lastName}
          </p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {/* Contact Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{customer.contactPerson.email}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{customer.contactPerson.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Area: {customer.deliveryAddress.areaTag}</span>
        </div>
      </div>

      {/* Credit Info */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {customer.creditApplication.creditLimit > 0
                ? `$${customer.creditApplication.creditLimit.toLocaleString()}`
                : 'No credit'}
            </p>
            <StatusBadge status={customer.creditApplication.status as StatusType} showIcon={false} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{customer.orders || 0} orders</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {customer.creditApplication.status === 'pending' && (
          <>
            <Button variant="outline" size="sm" className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Customer Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Manage your customer accounts and credit applications
          </p>
        </div>
        <Link href="/customers/new">
          <Button className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">{totalCustomers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-green-600">{activeCustomers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Credit Approval</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-yellow-600">{pendingCredit}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">
              {customers.reduce((sum, c) => sum + (c.orders || 0), 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customers Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>A list of all your customers and their details</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ResponsiveTable
            data={customers}
            columns={columns}
            mobileCard={mobileCard}
            emptyMessage="No customers found"
            className="md:border-0"
          />
        </CardContent>
      </Card>
    </div>
  );
}
