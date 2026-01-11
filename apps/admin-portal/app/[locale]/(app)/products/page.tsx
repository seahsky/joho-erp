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
  type TableColumn,
  CountUp,
  EmptyState,
  TableSkeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  StatusBadge,
  StockLevelBadge,
  type StatusType,
} from '@joho-erp/ui';
import { Search, Package, Plus, Edit, PackageX, PackagePlus, FolderTree } from 'lucide-react';
import { api } from '@/trpc/client';
import { AddProductDialog } from './components/AddProductDialog';
import { EditProductDialog } from './components/EditProductDialog';
import { StockAdjustmentDialog } from '../inventory/components/StockAdjustmentDialog';
import { CategoriesTab } from './components/CategoriesTab';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@joho-erp/shared';
import { useTableSort } from '@joho-erp/shared/hooks';
import { PermissionGate } from '@/components/permission-gate';

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit: string;
  packageSize?: number | null;
  basePrice: number;
  currentStock: number;
  lowStockThreshold?: number | null;
  status: 'active' | 'discontinued' | 'out_of_stock';
  imageUrl?: string | null;
};

const STATUSES = ['active', 'discontinued', 'out_of_stock'] as const;

export default function ProductsPage() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const tProductForm = useTranslations('productForm');
  const tStock = useTranslations('stockAdjustment');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sorting hook
  const { sortBy, sortOrder, handleSort } = useTableSort('name', 'asc');

  const { data: productsData, isLoading, error, refetch } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
    categoryId: categoryFilter || undefined,
    status: statusFilter ? (statusFilter as 'active' | 'discontinued' | 'out_of_stock') : undefined,
    showAll: true, // Show all statuses for admin
    sortBy,
    sortOrder,
    limit: 1000, // Fetch all products for admin view
  });

  const { data: categoriesData } = api.category.getAll.useQuery();
  const categories = categoriesData ?? [];

  // Data from API with fallbacks for loading state
  const productList = (productsData?.items ?? []) as Product[];
  const totalProducts = productsData?.total ?? productList.length;
  const activeProducts = productList.filter((p) => p.status === 'active').length;
  const lowStockProducts = productList.filter(
    (p) => p.lowStockThreshold && p.currentStock <= p.lowStockThreshold
  ).length;
  const totalValue = productList.reduce((sum, p) => sum + p.basePrice * p.currentStock, 0);

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

  // Status and stock badges now use consolidated components

  const columns: TableColumn<Product>[] = [
    {
      key: 'sku',
      label: t('sku'),
      className: 'font-medium',
      sortable: true,
    },
    {
      key: 'name',
      label: t('name'),
      className: 'font-medium',
      sortable: true,
    },
    {
      key: 'category',
      label: t('category'),
      render: (product) => product.category || '-',
      sortable: true,
    },
    {
      key: 'basePrice',
      label: t('price'),
      render: (product) => formatCurrency(product.basePrice), // value is in cents
      sortable: true,
    },
    {
      key: 'unit',
      label: t('unit'),
      render: (product) => String(product.unit).toUpperCase(),
    },
    {
      key: 'currentStock',
      label: t('stock'),
      render: (product) => (
        <StockLevelBadge
          currentStock={product.currentStock}
          lowStockThreshold={product.lowStockThreshold ?? undefined}
        />
      ),
      sortable: true,
    },
    {
      key: 'status',
      label: tCommon('status'),
      render: (product) => (
        <StatusBadge status={product.status as StatusType} showIcon={false} />
      ),
      sortable: true,
    },
    {
      key: 'actions',
      label: tCommon('actions'),
      className: 'text-right',
      render: (product) => (
        <div className="flex justify-end gap-2">
          <PermissionGate permission="products:adjust_stock">
            <Button
              variant="ghost"
              size="sm"
              aria-label={tStock('buttons.adjustStock')}
              onClick={() => {
                setSelectedProduct(product);
                setShowStockDialog(true);
              }}
            >
              <PackagePlus className="h-4 w-4" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="products:edit">
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('edit')}
              onClick={() => {
                setSelectedProduct(product);
                setShowEditDialog(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  const mobileCard = (product: Product) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{t('sku')}: {product.sku}</p>
        </div>
<StatusBadge status={product.status as StatusType} showIcon={false} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">{t('category')}</p>
          <p className="font-medium">{product.category || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('price')}</p>
          <p className="font-medium">{formatCurrency(product.basePrice)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('unit')}</p>
          <p className="font-medium">{product.unit.toUpperCase()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('stock')}</p>
          <StockLevelBadge
            currentStock={product.currentStock}
            lowStockThreshold={product.lowStockThreshold ?? undefined}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <PermissionGate permission="products:adjust_stock">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedProduct(product);
              setShowStockDialog(true);
            }}
          >
            <PackagePlus className="h-4 w-4 mr-1" />
            {tStock('buttons.adjustStock')}
          </Button>
        </PermissionGate>
        <PermissionGate permission="products:edit">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedProduct(product);
              setShowEditDialog(true);
            }}
          >
            <Edit className="h-4 w-4 mr-1" />
            {t('edit')}
          </Button>
        </PermissionGate>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('tabs.products')}
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            {t('tabs.categories')}
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {/* Add Product Button */}
          <div className="flex justify-end">
            <PermissionGate permission="products:create">
              <Button
                className="btn-enhanced btn-primary-enhanced w-full sm:w-auto"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {tProductForm('buttons.addProduct')}
              </Button>
            </PermissionGate>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card animate-fade-in-up">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('totalProducts')}</CardDescription>
            <div className="stat-value tabular-nums">
              <CountUp end={totalProducts} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-100">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('activeProducts')}</CardDescription>
            <div className="stat-value tabular-nums text-success">
              <CountUp end={activeProducts} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-200">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('lowStockAlerts')}</CardDescription>
            <div className="stat-value tabular-nums text-warning">
              <CountUp end={lowStockProducts} />
            </div>
          </CardHeader>
        </Card>
        <Card className="stat-card animate-fade-in-up delay-300">
          <div className="stat-card-gradient" />
          <CardHeader className="pb-3 relative">
            <CardDescription>{t('totalInventoryValue')}</CardDescription>
            <div className="stat-value tabular-nums">
              {formatCurrency(totalValue)}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border rounded-md text-sm bg-background"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">{tCommon('filters.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 border rounded-md text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{tCommon('filters.allStatuses')}</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('listTitle')}
            </div>
          </CardTitle>
          <CardDescription>{t('listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : productList.length > 0 ? (
            <ResponsiveTable
              data={productList}
              columns={columns}
              mobileCard={mobileCard}
              className="md:border-0"
              sortColumn={sortBy}
              sortDirection={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <EmptyState
              icon={PackageX}
              title={t('noProductsFound')}
              description={searchQuery ? t('adjustSearch') : t('addFirstProduct')}
            />
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => refetch()}
      />

      {/* Edit Product Dialog */}
      <EditProductDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={() => refetch()}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={showStockDialog}
        onOpenChange={(open) => {
          setShowStockDialog(open);
          if (!open) setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
