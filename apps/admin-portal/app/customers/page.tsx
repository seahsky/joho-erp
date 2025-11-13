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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@jimmy-beef/ui';
import { Search, UserPlus, Check, X, Eye } from 'lucide-react';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock customer data - in production, this would come from tRPC
  const customers = [
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'success',
      suspended: 'warning',
      closed: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getCreditStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground mt-2">Manage your customer accounts and credit applications</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-4xl">{customers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-4xl text-green-600">
              {customers.filter((c) => c.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Credit Approval</CardDescription>
            <CardTitle className="text-4xl text-yellow-600">
              {customers.filter((c) => c.creditStatus === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-4xl">
              {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, contact, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>A list of all your customers and their details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credit Status</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.businessName}</TableCell>
                  <TableCell>{customer.contactPerson}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.email}</TableCell>
                  <TableCell>{customer.area}</TableCell>
                  <TableCell>{getStatusBadge(customer.status)}</TableCell>
                  <TableCell>{getCreditStatusBadge(customer.creditStatus)}</TableCell>
                  <TableCell>
                    {customer.creditLimit > 0 ? `$${customer.creditLimit.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>{customer.totalOrders}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {customer.creditStatus === 'pending' && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
