'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  ResponsiveTable,
  type Column,
  StatusBadge,
  type StatusType,
} from '@jimmy-beef/ui';
import { Search, UserPlus, Check, X, Eye, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

type Customer = {
  id: string;
  businessName: string;
  abn: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: StatusType;
  creditStatus: StatusType;
  creditLimit: number;
  area: string;
  totalOrders: number;
  joinedDate: string;
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock customer data - in production, this would come from tRPC
  const customers: Customer[] = [
    {
      id: '1',
      businessName: 'Sydney Meats Co',
      abn: '12 345 678 901',
      contactPerson: 'John Smith',
      email: 'john@sydneymeats.com.au',
      phone: '(02) 1234 5678',
      status: 'active',
      creditStatus: 'approved',
      creditLimit: 10000,
      area: 'North',
      totalOrders: 45,
      joinedDate: '2024-01-15',
    },
    {
      id: '2',
      businessName: 'Northern Butchers',
      abn: '98 765 432 109',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@northernbutchers.com.au',
      phone: '(02) 8765 4321',
      status: 'active',
      creditStatus: 'approved',
      creditLimit: 15000,
      area: 'North',
      totalOrders: 67,
      joinedDate: '2023-11-20',
    },
    {
      id: '3',
      businessName: 'East Side Foods',
      abn: '11 222 333 444',
      contactPerson: 'Mike Brown',
      email: 'mike@eastsidefoods.com.au',
      phone: '(02) 2222 3333',
      status: 'active',
      creditStatus: 'pending',
      creditLimit: 0,
      area: 'East',
      totalOrders: 0,
      joinedDate: '2025-01-10',
    },
    {
      id: '4',
      businessName: 'West End Markets',
      abn: '55 666 777 888',
      contactPerson: 'Lisa Wilson',
      email: 'lisa@westendmarkets.com.au',
      phone: '(02) 5555 6666',
      status: 'active',
      creditStatus: 'approved',
      creditLimit: 8000,
      area: 'West',
      totalOrders: 34,
      joinedDate: '2024-03-22',
    },
  ];

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<Customer>[] = [
    {
      key: 'businessName',
      label: 'Business Name',
      className: 'font-medium',
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
    },
    {
      key: 'email',
      label: 'Email',
      className: 'text-sm text-muted-foreground',
    },
    {
      key: 'area',
      label: 'Area',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as StatusType} />,
    },
    {
      key: 'creditStatus',
      label: 'Credit Status',
      render: (value) => <StatusBadge status={value as StatusType} />,
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      render: (value) => (value > 0 ? `$${value.toLocaleString()}` : '-'),
    },
    {
      key: 'totalOrders',
      label: 'Orders',
    },
    {
      key: 'id',
      label: 'Actions',
      className: 'text-right',
      render: (_, customer) => (
        <div className="flex justify-end gap-2">
          {customer.creditStatus === 'pending' && (
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
          <p className="text-sm text-muted-foreground">{customer.contactPerson}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {/* Contact Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{customer.email}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{customer.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Area: {customer.area}</span>
        </div>
      </div>

      {/* Credit Info */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {customer.creditLimit > 0 ? `$${customer.creditLimit.toLocaleString()}` : 'No credit'}
            </p>
            <StatusBadge status={customer.creditStatus} showIcon={false} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{customer.totalOrders} orders</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {customer.creditStatus === 'pending' && (
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
        <Button className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">{customers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-green-600">
              {customers.filter((c) => c.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Credit Approval</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-yellow-600">
              {customers.filter((c) => c.creditStatus === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">
              {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
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
        <CardContent className="p-0 md:p-6">
          <ResponsiveTable
            data={filteredCustomers}
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
