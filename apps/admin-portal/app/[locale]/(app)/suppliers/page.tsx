'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useTableSort } from '@joho-erp/shared/hooks';
import { formatAUD } from '@joho-erp/shared';
import { PermissionGate } from '@/components/permission-gate';
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
import { Building2, Plus, Search, Eye, Mail, Phone } from 'lucide-react';
import { SupplierStatusBadge, type SupplierStatus } from './components/SupplierStatusBadge';

type Supplier = {
  id: string;
  supplierCode: string;
  businessName: string;
  tradingName: string | null;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    position: string | null;
    mobile: string | null;
  };
  status: SupplierStatus;
  creditLimit: number; // In cents
  primaryCategories: string[];
  _count: {
    products: number;
    inventoryBatches: number;
  };
};

export default function SuppliersPage() {
  const router = useRouter();
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Sorting state (server-side)
  const { sortBy, sortOrder, handleSort } = useTableSort('businessName', 'asc');

  // Fetch suppliers with filtering
  const { data, isLoading, error } = api.supplier.getAll.useQuery({
    search: searchQuery || undefined,
    status: (statusFilter as SupplierStatus) || undefined,
    category: categoryFilter || undefined,
    sortBy,
    sortOrder,
    limit: 100,
  });

  // Fetch stats
  const { data: stats } = api.supplier.getStats.useQuery();

  // Fetch categories for filter dropdown
  const { data: categories } = api.supplier.getCategories.useQuery();

  const suppliers = (data?.suppliers ?? []) as Supplier[];

  // Error state
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
        <span className="font-mono text-sm">{supplier.supplierCode}</span>
      ),
    },
    {
      key: 'businessName',
      label: t('businessName'),
      sortable: true,
      className: 'font-medium',
      render: (supplier) => (
        <div>
          <div className="font-medium">{supplier.businessName}</div>
          <div className="text-sm text-muted-foreground">
            {supplier._count.products} {t('productsLinked')}
          </div>
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
        <div className="text-right font-medium tabular-nums">
          {formatAUD(supplier.creditLimit)}
        </div>
      ),
    },
    {
      key: 'status',
      label: tCommon('status'),
      sortable: true,
      render: (supplier) => <SupplierStatusBadge status={supplier.status} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (supplier) => (
        <div className="flex justify-end">
          <Link href={`/suppliers/${supplier.id}`}>
            <Button variant="ghost" size="sm" aria-label={tCommon('view')}>
              <Eye className="h-4 w-4 mr-1" />
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{supplier.businessName}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {supplier.supplierCode}
          </p>
        </div>
        <SupplierStatusBadge status={supplier.status} />
      </div>

      {/* Contact Info */}
      <div className="space-y-2 text-sm">
        <div className="font-medium">{supplier.primaryContact.name}</div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{supplier.primaryContact.email}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{supplier.primaryContact.phone}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <p className="text-sm text-muted-foreground">{t('creditLimit')}</p>
          <p className="font-medium tabular-nums">{formatAUD(supplier.creditLimit)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{t('productsLinked')}</p>
          <p className="font-medium">{supplier._count.products}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2">
        <Link href={`/suppliers/${supplier.id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            {tCommon('view')}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {t('subtitle')}
          </p>
        </div>
        <PermissionGate permission="suppliers:create">
          <Link href="/suppliers/new">
            <Button className="btn-enhanced btn-primary-enhanced w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('addSupplier')}
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
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

      {/* Search and Filters */}
      <Card className="mb-6">
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
              <select
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">{t('allCategories')}</option>
                {categories?.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Suppliers Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
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
                  ? t('emptyState.description')
                  : t('emptyState.description')
              }
              action={
                !searchQuery && !statusFilter && !categoryFilter
                  ? {
                      label: t('addSupplier'),
                      onClick: () => router.push('/suppliers/new'),
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
