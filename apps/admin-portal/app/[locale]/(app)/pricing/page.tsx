'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  ResponsiveTable,
  type TableColumn,
  Badge,
  CountUp,
  EmptyState,
  TableSkeleton,
} from '@joho-erp/ui';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  TrendingDown,
  Tag,
  Upload,
} from 'lucide-react';
import { api } from '@/trpc/client';
import { formatAUD, formatDate } from '@joho-erp/shared';
import { useTableSort } from '@joho-erp/shared/hooks';
import { SetPriceDialog } from './components/SetPriceDialog';
import { BulkImportDialog } from './components/BulkImportDialog';
import { PermissionGate } from '@/components/permission-gate';

type CustomerPricing = {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  customer?: {
    businessName: string;
  } | null;
  product?: {
    sku: string;
    name: string;
    basePrice: number;
  } | null;
  isValid: boolean;
  effectivePriceInfo: {
    basePrice: number;
    customPrice?: number;
    effectivePrice: number;
    hasCustomPricing: boolean;
    discount?: number;
    discountPercentage?: number;
  };
};

export default function PricingPage() {
  const t = useTranslations('pricing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [includeExpired, setIncludeExpired] = useState(false);
  const [searchQuery, _setSearchQuery] = useState('');
  const [editingPricing, setEditingPricing] = useState<CustomerPricing | null>(null);
  const [showSetPriceDialog, setShowSetPriceDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);

  // Sorting state
  const { sortBy, sortOrder, handleSort } = useTableSort('createdAt', 'desc');

  // Fetch pricing data
  const {
    data: pricingData,
    isLoading,
    error,
    refetch,
  } = api.pricing.getAll.useQuery({
    customerId: selectedCustomerId,
    productId: selectedProductId,
    includeExpired,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
    page: 1,
    limit: 100,
  });

  // Fetch customers for filter
  const { data: customersData } = api.customer.getAll.useQuery({
    limit: 100,
  });

  // Fetch products for filter
  const { data: productsData } = api.product.getAll.useQuery({});

  // Delete mutation
  const deleteMutation = api.pricing.deleteCustomerPrice.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = async (pricingId: string) => {
    if (confirm(t('messages.deleteConfirm'))) {
      await deleteMutation.mutateAsync({ pricingId });
    }
  };

  const handleEdit = (pricing: CustomerPricing) => {
    setEditingPricing(pricing);
    setShowSetPriceDialog(true);
  };

  const handleAddNew = () => {
    setEditingPricing(null);
    setShowSetPriceDialog(true);
  };

  // Data from API with fallbacks for loading state
  const pricings = ((pricingData?.pricings ?? []) as CustomerPricing[])
    .filter((p) => p && p.customer && p.product); // Filter out invalid/orphaned records
  const totalPricings = pricingData?.total ?? 0;
  const activePricings = pricings.filter((p) => p.isValid).length;
  const totalSavings = pricings.reduce((sum, p) => {
    const savings = p.effectivePriceInfo.discount ?? 0;
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const customers = customersData?.customers ?? [];
  const products = (productsData?.items ?? []) as Array<{
    id: string;
    sku: string;
    name: string;
    basePrice: number;
  }>;

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

  const columns: TableColumn<CustomerPricing>[] = [
    {
      key: 'customer',
      label: t('table.customer'),
      sortable: true,
      render: (pricing) => (
        <div className="font-medium">{pricing?.customer?.businessName ?? t('messages.unknownCustomer')}</div>
      ),
    },
    {
      key: 'product',
      label: t('table.product'),
      sortable: true,
      render: (pricing) => (
        <div>
          <div className="font-medium">{pricing?.product?.name ?? t('messages.unknownProduct')}</div>
          <div className="text-sm text-muted-foreground">{pricing?.product?.sku ?? 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'basePrice',
      label: t('table.basePrice'),
      render: (pricing) => (
        <div className="text-muted-foreground">
          {pricing?.product?.basePrice ? formatAUD(pricing.product.basePrice) : 'N/A'}
        </div>
      ),
    },
    {
      key: 'customPrice',
      label: t('table.customPrice'),
      render: (pricing) => (
        <div className="font-semibold text-green-600">
          {pricing?.customPrice ? formatAUD(pricing.customPrice) : 'N/A'}
        </div>
      ),
    },
    {
      key: 'discount',
      label: t('table.savings'),
      render: (pricing) => {
        const discount = pricing?.effectivePriceInfo?.discount ?? 0;
        const discountPct = pricing?.effectivePriceInfo?.discountPercentage ?? 0;
        return discount > 0 ? (
          <div className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600">
              {formatAUD(discount)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({discountPct.toFixed(1)}%)
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: 'status',
      label: t('table.status'),
      render: (pricing) => {
        if (!pricing?.isValid) {
          return <Badge variant="secondary">{t('status.expired')}</Badge>;
        }
        if (pricing?.effectiveTo) {
          const daysUntilExpiry = Math.floor(
            (new Date(pricing.effectiveTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry <= 7) {
            return <Badge variant="warning">{t('status.expiresInDays', { days: daysUntilExpiry })}</Badge>;
          }
          return <Badge variant="success">{t('status.active')}</Badge>;
        }
        return <Badge variant="success">{t('status.activeNoExpiry')}</Badge>;
      },
    },
    {
      key: 'effectiveDates',
      label: t('table.effectiveDates'),
      render: (pricing) => (
        <div className="text-sm">
          <div>{t('table.from')} {pricing?.effectiveFrom ? formatDate(pricing.effectiveFrom) : 'N/A'}</div>
          {pricing?.effectiveTo && (
            <div className="text-muted-foreground">
              {t('table.to')} {formatDate(pricing.effectiveTo)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('table.actions'),
      render: (pricing) => (
        <div className="flex items-center gap-2">
          <PermissionGate permission="pricing:edit">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => pricing && handleEdit(pricing)}
              disabled={!pricing}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="pricing:delete">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => pricing?.id && handleDelete(pricing.id)}
              disabled={!pricing?.id}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalPrices')}</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp end={totalPricings} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.activeExpired', { active: activePricings, expired: totalPricings - activePricings })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalSavings')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAUD(totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.averagePerRecord')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.customersWithPricing')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp
                end={new Set(pricings.map((p) => p.customerId)).size}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.uniqueCustomers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.productsWithPricing')}</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp
                end={new Set(pricings.map((p) => p.productId)).size}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('stats.uniqueProducts')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('management.title')}</CardTitle>
              <CardDescription>
                {t('management.description')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <PermissionGate permission="pricing:create">
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('buttons.addCustomPrice')}
                </Button>
              </PermissionGate>
              <PermissionGate permission="pricing:create">
                <Button variant="outline" onClick={() => setShowBulkImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('buttons.bulkImport')}
                </Button>
              </PermissionGate>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Customer Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('filters.customer')}</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value || undefined)}
              >
                <option value="">{t('filters.allCustomers')}</option>
                {customers.map((customer: { id: string; businessName: string }) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.businessName}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('filters.product')}</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value || undefined)}
              >
                <option value="">{t('filters.allProducts')}</option>
                {products.map((product: { id: string; sku: string; name: string }) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Include Expired */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpired}
                  onChange={(e) => setIncludeExpired(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">{t('filters.includeExpired')}</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : pricings.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title={t('messages.noPricing')}
              description={t('messages.noPricingDescription')}
              action={{
                label: t('buttons.addCustomPrice'),
                onClick: handleAddNew,
              }}
            />
          ) : (
            <ResponsiveTable
              data={pricings}
              columns={columns}
              sortColumn={sortBy}
              sortDirection={sortOrder}
              onSort={handleSort}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SetPriceDialog
        open={showSetPriceDialog}
        onOpenChange={setShowSetPriceDialog}
        pricing={editingPricing}
        customers={customers}
        products={products}
        onSuccess={() => {
          setShowSetPriceDialog(false);
          setEditingPricing(null);
          refetch();
        }}
      />

      <BulkImportDialog
        open={showBulkImportDialog}
        onOpenChange={setShowBulkImportDialog}
        onSuccess={() => {
          setShowBulkImportDialog(false);
          refetch();
        }}
      />
    </div>
  );
}
