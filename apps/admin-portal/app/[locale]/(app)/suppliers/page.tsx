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
  type TableColumn,
  CountUp,
  EmptyState,
  TableSkeleton,
} from '@joho-erp/ui';
import {
  Building2,
  Plus,
  Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import { useTableSort } from '@joho-erp/shared/hooks';
import { PermissionGate } from '@/components/permission-gate';
import { SupplierStatusBadge } from './components/SupplierStatusBadge';
import type { SupplierStatus } from '@joho-erp/database';

type Supplier = {
  id: string;
  supplierCode: string;
  businessName: string;
  tradingName: string | null;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    position?: string | null;
    mobile?: string | null;
  };
  status: SupplierStatus;
  creditLimit: number;
  primaryCategories: string[];
};

export default function SuppliersPage() {
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { sortBy, sortOrder, handleSort } = useTableSort('name', 'asc');

  // Fetch suppliers
  const { data, isLoading, error } = api.supplier.getAll.useQuery({
    search: searchQuery || undefined,
    status: (statusFilter as SupplierStatus) || undefined,
    category: categoryFilter || undefined,
    sortBy,
    sortOrder,
  });

  // Fetch stats
  const { data: stats } = api.supplier.getStats.useQuery();

  // Fetch categories for filter
  const { data: categories } = api.supplier.getCategories.useQuery();

  const suppliers = (data?.suppliers ?? []) as Supplier[];

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // Table columns
  const columns: TableColumn<Supplier>[] = [
    {
      key: 'supplierCode',
      label: t('code'),
      sortable: true,
      render: (supplier) => (
        <div className="font-mono text-sm">{supplier.supplierCode}</div>
      ),
    },
    {
      key: 'businessName',
      label: t('businessName'),
      sortable: true,
      render: (supplier) => (
        <div>
          <div className="font-medium">{supplier.businessName}</div>
          {supplier.tradingName && (
            <div className="text-sm text-muted-foreground">
              {supplier.tradingName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: t('contact'),
      render: (supplier) => (
        <div className="text-sm">
          <div>{supplier.primaryContact.name}</div>
          <div className="text-muted-foreground">
            {supplier.primaryContact.email}
          </div>
        </div>
      ),
    },
    {
      key: 'creditLimit',
      label: t('creditLimit'),
      sortable: true,
      render: (supplier) => (
        <div className="text-right font-medium">
          {formatAUD(supplier.creditLimit)}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (supplier) => <SupplierStatusBadge status={supplier.status} />,
    },
    {
      key: 'actions',
      label: tCommon('actions'),
      render: (supplier) => (
        <div className="flex gap-2">
          <Link href={`/suppliers/${supplier.id}`}>
            <Button variant="ghost" size="sm">
              {tCommon('view')}
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCard = (supplier: Supplier) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{supplier.businessName}</div>
          <div className="text-sm text-muted-foreground font-mono">
            {supplier.supplierCode}
          </div>
        </div>
        <SupplierStatusBadge status={supplier.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">{t('contact')}</div>
          <div>{supplier.primaryContact.name}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t('creditLimit')}</div>
          <div className="font-medium">{formatAUD(supplier.creditLimit)}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/suppliers/${supplier.id}`} className="flex-1">
          <Button size="sm" className="w-full">
            {tCommon('view')}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <PermissionGate permission="suppliers:create">
          <Link href="/suppliers/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('addSupplier')}
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.total')}</CardDescription>
            <div className="stat-value tabular-nums">
              <CountUp end={stats?.total ?? 0} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.active')}</CardDescription>
            <div className="stat-value tabular-nums text-success">
              <CountUp end={stats?.active ?? 0} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.pending')}</CardDescription>
            <div className="stat-value tabular-nums text-warning">
              <CountUp end={stats?.pendingApproval ?? 0} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-300">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('stats.suspended')}</CardDescription>
            <div className="stat-value tabular-nums text-destructive">
              <CountUp end={stats?.suspended ?? 0} />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search row */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="active">{t('active')}</option>
                <option value="inactive">{t('inactive')}</option>
                <option value="suspended">{t('suspended')}</option>
                <option value="pending_approval">{t('pending')}</option>
              </select>

              {/* Category Filter */}
              {categories && categories.length > 0 && (
                <select
                  className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">{t('allCategories')}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Suppliers Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>{t('listTitle')}</CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : suppliers.length > 0 ? (
            <ResponsiveTable
              data={suppliers}
              columns={columns}
              mobileCard={mobileCard}
              className="md:border-0"
              sortColumn={sortBy}
              sortDirection={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <EmptyState
              icon={Building2}
              title={t('emptyState.title')}
              description={
                searchQuery || statusFilter || categoryFilter
                  ? t('emptyState.adjustFilters')
                  : t('emptyState.description')
              }
              action={
                !searchQuery && !statusFilter && !categoryFilter
                  ? {
                      label: t('addSupplier'),
                      onClick: () => (window.location.href = '/suppliers/new'),
                    }
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
