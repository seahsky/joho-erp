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
} from '@jimmy-beef/ui';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Loader2,
  TrendingDown,
  Tag,
  Upload,
} from 'lucide-react';
import { api } from '@/trpc/client';
import { formatCurrency, formatDate } from '@jimmy-beef/shared';
import { SetPriceDialog } from './components/SetPriceDialog';
import { BulkImportDialog } from './components/BulkImportDialog';

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
  const t = useTranslations();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [includeExpired, setIncludeExpired] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CustomerPricing | null>(null);
  const [showSetPriceDialog, setShowSetPriceDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);

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
    if (confirm(t('pricing.messages.deleteConfirm'))) {
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('pricing.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">{t('pricing.errorLoading')}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const pricings = ((pricingData?.pricings ?? []) as CustomerPricing[])
    .filter((p) => p && p.customer && p.product); // Filter out invalid/orphaned records
  const totalPricings = pricingData?.total ?? 0;
  const activePricings = pricings.filter((p) => p.isValid).length;
  const totalSavings = pricings.reduce((sum, p) => {
    const savings = p.effectivePriceInfo.discount ?? 0;
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const customers = customersData?.customers ?? [];
  const products = (productsData ?? []) as Array<{
    id: string;
    sku: string;
    name: string;
    basePrice: number;
  }>;

  const columns: TableColumn<CustomerPricing>[] = [
    {
      key: 'customer',
      label: t('pricing.table.customer'),
      render: (pricing) => (
        <div className="font-medium">{pricing?.customer?.businessName ?? t('pricing.messages.unknownCustomer')}</div>
      ),
    },
    {
      key: 'product',
      label: t('pricing.table.product'),
      render: (pricing) => (
        <div>
          <div className="font-medium">{pricing?.product?.name ?? t('pricing.messages.unknownProduct')}</div>
          <div className="text-sm text-muted-foreground">{pricing?.product?.sku ?? 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'basePrice',
      label: t('pricing.table.basePrice'),
      render: (pricing) => (
        <div className="text-muted-foreground">
          {pricing?.product?.basePrice ? formatCurrency(pricing.product.basePrice) : 'N/A'}
        </div>
      ),
    },
    {
      key: 'customPrice',
      label: t('pricing.table.customPrice'),
      render: (pricing) => (
        <div className="font-semibold text-green-600">
          {pricing?.customPrice ? formatCurrency(pricing.customPrice) : 'N/A'}
        </div>
      ),
    },
    {
      key: 'discount',
      label: t('pricing.table.savings'),
      render: (pricing) => {
        const discount = pricing?.effectivePriceInfo?.discount ?? 0;
        const discountPct = pricing?.effectivePriceInfo?.discountPercentage ?? 0;
        return discount > 0 ? (
          <div className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600">
              {formatCurrency(discount)}
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
      label: t('pricing.table.status'),
      render: (pricing) => {
        if (!pricing?.isValid) {
          return <Badge variant="secondary">{t('pricing.status.expired')}</Badge>;
        }
        if (pricing?.effectiveTo) {
          const daysUntilExpiry = Math.floor(
            (new Date(pricing.effectiveTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry <= 7) {
            return <Badge variant="warning">{t('pricing.status.expiresInDays', { days: daysUntilExpiry })}</Badge>;
          }
          return <Badge variant="success">{t('pricing.status.active')}</Badge>;
        }
        return <Badge variant="success">{t('pricing.status.activeNoExpiry')}</Badge>;
      },
    },
    {
      key: 'effectiveDates',
      label: t('pricing.table.effectiveDates'),
      render: (pricing) => (
        <div className="text-sm">
          <div>{t('pricing.table.from')} {pricing?.effectiveFrom ? formatDate(pricing.effectiveFrom) : 'N/A'}</div>
          {pricing?.effectiveTo && (
            <div className="text-muted-foreground">
              {t('pricing.table.to')} {formatDate(pricing.effectiveTo)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('pricing.table.actions'),
      render: (pricing) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pricing && handleEdit(pricing)}
            disabled={!pricing}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pricing?.id && handleDelete(pricing.id)}
            disabled={!pricing?.id}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('pricing.title')}</h1>
        <p className="text-muted-foreground">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pricing.stats.totalPrices')}</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp end={totalPricings} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pricing.stats.activeExpired', { active: activePricings, expired: totalPricings - activePricings })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pricing.stats.totalSavings')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pricing.stats.averagePerRecord')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pricing.stats.customersWithPricing')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp
                end={new Set(pricings.map((p) => p.customerId)).size}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pricing.stats.uniqueCustomers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pricing.stats.productsWithPricing')}</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp
                end={new Set(pricings.map((p) => p.productId)).size}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pricing.stats.uniqueProducts')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('pricing.management.title')}</CardTitle>
              <CardDescription>
                {t('pricing.management.description')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('pricing.buttons.addCustomPrice')}
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('pricing.buttons.bulkImport')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Customer Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('pricing.filters.customer')}</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value || undefined)}
              >
                <option value="">{t('pricing.filters.allCustomers')}</option>
                {customers.map((customer: { id: string; businessName: string }) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.businessName}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('pricing.filters.product')}</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value || undefined)}
              >
                <option value="">{t('pricing.filters.allProducts')}</option>
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
                <span className="text-sm font-medium">{t('pricing.filters.includeExpired')}</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardContent className="pt-6">
          {pricings.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title={t('pricing.messages.noPricing')}
              description={t('pricing.messages.noPricingDescription')}
              action={{
                label: t('pricing.buttons.addCustomPrice'),
                onClick: handleAddNew,
              }}
            />
          ) : (
            <ResponsiveTable
              data={pricings}
              columns={columns}
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
