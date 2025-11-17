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
  Badge,
  CountUp,
  EmptyState,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@jimmy-beef/ui';
import {
  Search,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Loader2,
  TrendingDown,
  Tag,
  Filter,
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
  customer: {
    businessName: string;
  };
  product: {
    sku: string;
    name: string;
    basePrice: number;
  };
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [includeExpired, setIncludeExpired] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'customer' | 'product'>('all');
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
    if (confirm('Are you sure you want to delete this custom pricing?')) {
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
          <p className="text-muted-foreground">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">Error loading pricing</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const pricings = (pricingData?.pricings ?? []) as CustomerPricing[];
  const totalPricings = pricingData?.total ?? 0;
  const activePricings = pricings.filter((p) => p.isValid).length;
  const totalSavings = pricings.reduce((sum, p) => {
    const savings = p.effectivePriceInfo.discount ?? 0;
    return sum + (savings > 0 ? savings : 0);
  }, 0);

  const customers = customersData?.customers ?? [];
  const products = (productsData ?? []) as any[];

  const columns: Column<CustomerPricing>[] = [
    {
      key: 'customer',
      label: 'Customer',
      render: (pricing) => (
        <div className="font-medium">{pricing.customer.businessName}</div>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (pricing) => (
        <div>
          <div className="font-medium">{pricing.product.name}</div>
          <div className="text-sm text-muted-foreground">{pricing.product.sku}</div>
        </div>
      ),
    },
    {
      key: 'basePrice',
      label: 'Base Price',
      render: (pricing) => (
        <div className="text-muted-foreground">
          {formatCurrency(pricing.product.basePrice)}
        </div>
      ),
    },
    {
      key: 'customPrice',
      label: 'Custom Price',
      render: (pricing) => (
        <div className="font-semibold text-green-600">
          {formatCurrency(pricing.customPrice)}
        </div>
      ),
    },
    {
      key: 'discount',
      label: 'Savings',
      render: (pricing) => {
        const discount = pricing.effectivePriceInfo.discount ?? 0;
        const discountPct = pricing.effectivePriceInfo.discountPercentage ?? 0;
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
      label: 'Status',
      render: (pricing) => {
        if (!pricing.isValid) {
          return <Badge variant="secondary">Expired</Badge>;
        }
        if (pricing.effectiveTo) {
          const daysUntilExpiry = Math.floor(
            (new Date(pricing.effectiveTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry <= 7) {
            return <Badge variant="warning">Expires in {daysUntilExpiry}d</Badge>;
          }
          return <Badge variant="success">Active</Badge>;
        }
        return <Badge variant="success">Active (No expiry)</Badge>;
      },
    },
    {
      key: 'effectiveDates',
      label: 'Effective Dates',
      render: (pricing) => (
        <div className="text-sm">
          <div>From: {formatDate(pricing.effectiveFrom)}</div>
          {pricing.effectiveTo && (
            <div className="text-muted-foreground">
              To: {formatDate(pricing.effectiveTo)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (pricing) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(pricing)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(pricing.id)}
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
        <h1 className="text-3xl font-bold mb-2">Customer-Specific Pricing</h1>
        <p className="text-muted-foreground">
          Manage custom pricing for individual customers and products
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Custom Prices</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp end={totalPricings} />
            </div>
            <p className="text-xs text-muted-foreground">
              {activePricings} active, {totalPricings - activePricings} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per pricing record
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers with Pricing</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp
                end={new Set(pricings.map((p) => p.customerId)).size}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Unique customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products with Pricing</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CountUp
                end={new Set(pricings.map((p) => p.productId)).size}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Unique products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Pricing Management</CardTitle>
              <CardDescription>
                Filter and manage customer-specific pricing
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Price
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Customer Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Customer</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value || undefined)}
              >
                <option value="">All Customers</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.businessName}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Product</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value || undefined)}
              >
                <option value="">All Products</option>
                {products.map((product: any) => (
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
                <span className="text-sm font-medium">Include Expired Pricing</span>
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
              title="No custom pricing found"
              description="Start by adding custom pricing for your customers"
              action={{
                label: 'Add Custom Price',
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
