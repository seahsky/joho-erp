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
  Badge,
  CountUp,
  EmptyState,
} from '@joho-erp/ui';
import { Search, Package, Plus, Edit, Loader2, PackageX, PackagePlus } from 'lucide-react';
import { api } from '@/trpc/client';
import { AddProductDialog } from './components/AddProductDialog';
import { StockAdjustmentDialog } from './components/StockAdjustmentDialog';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@joho-erp/shared';

type Product = {
  id: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  basePrice: number;
  currentStock: number;
  lowStockThreshold?: number;
  status: 'active' | 'discontinued' | 'out_of_stock';
};

export default function ProductsPage() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const tProductForm = useTranslations('productForm');
  const tStock = useTranslations('stockAdjustment');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products, isLoading, error, refetch } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

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

  const productList = (products ?? []) as Product[];
  const totalProducts = productList.length;
  const activeProducts = productList.filter((p) => p.status === 'active').length;
  const lowStockProducts = productList.filter(
    (p) => p.lowStockThreshold && p.currentStock <= p.lowStockThreshold
  ).length;
  const totalValue = productList.reduce((sum, p) => sum + p.basePrice * p.currentStock, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'discontinued':
        return 'bg-gray-100 text-gray-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockBadge = (product: Product) => {
    if (product.currentStock === 0) {
      return <Badge className="bg-red-100 text-red-800">{t('outOfStock')}</Badge>;
    }
    if (product.lowStockThreshold && product.currentStock <= product.lowStockThreshold) {
      return <Badge className="bg-yellow-100 text-yellow-800">{t('lowStock')}</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">{t('inStock')}</Badge>;
  };

  const columns: TableColumn<Product>[] = [
    {
      key: 'sku',
      label: t('sku'),
      className: 'font-medium',
    },
    {
      key: 'name',
      label: t('name'),
      className: 'font-medium',
    },
    {
      key: 'category',
      label: t('category'),
      render: (product) => product.category || '-',
    },
    {
      key: 'basePrice',
      label: t('price'),
      render: (product) => formatCurrency(product.basePrice), // value is in cents
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
        <div className="flex items-center gap-2">
          <span>{product.currentStock}</span>
          {getStockBadge(product)}
        </div>
      ),
    },
    {
      key: 'status',
      label: tCommon('status'),
      render: (product) => (
        <Badge className={getStatusColor(product.status)}>
          {String(product.status).replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: tCommon('actions'),
      className: 'text-right',
      render: (product) => (
        <div className="flex justify-end gap-2">
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
          <Button variant="ghost" size="sm" aria-label={t('edit')}>
            <Edit className="h-4 w-4" />
          </Button>
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
        <Badge className={getStatusColor(product.status)}>
          {product.status.replace(/_/g, ' ')}
        </Badge>
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
          <div className="flex items-center gap-2">
            <p className="font-medium">{product.currentStock}</p>
            {getStockBadge(product)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
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
        <Button variant="outline" size="sm" className="flex-1">
          <Edit className="h-4 w-4 mr-1" />
          {t('edit')}
        </Button>
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
        <Button
          className="btn-enhanced btn-primary-enhanced w-full sm:w-auto"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {tProductForm('buttons.addProduct')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
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

      {/* Search */}
      <Card className="mb-6">
        <CardHeader className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
          {productList.length > 0 ? (
            <ResponsiveTable
              data={productList}
              columns={columns}
              mobileCard={mobileCard}
              className="md:border-0"
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

      {/* Add Product Dialog */}
      <AddProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
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
