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
} from '@jimmy-beef/ui';
import { Search, Package, Plus, Edit, Loader2 } from 'lucide-react';
import { api } from '@/trpc/client';

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
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products, isLoading, error } = api.product.getAll.useQuery({
    search: searchQuery || undefined,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-destructive text-lg mb-2">Error loading products</p>
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
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    }
    if (product.lowStockThreshold && product.currentStock <= product.lowStockThreshold) {
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  const columns: Column<Product>[] = [
    {
      key: 'sku',
      label: 'SKU',
      className: 'font-medium',
    },
    {
      key: 'name',
      label: 'Product Name',
      className: 'font-medium',
    },
    {
      key: 'category',
      label: 'Category',
      render: (value) => value || '-',
    },
    {
      key: 'basePrice',
      label: 'Price',
      render: (value) => `$${(value as number).toFixed(2)}`,
    },
    {
      key: 'unit',
      label: 'Unit',
      render: (value) => String(value).toUpperCase(),
    },
    {
      key: 'currentStock',
      label: 'Stock',
      render: (_, product) => (
        <div className="flex items-center gap-2">
          <span>{product.currentStock}</span>
          {getStockBadge(product)}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge className={getStatusColor(value as string)}>
          {String(value).replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      className: 'text-right',
      render: () => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" aria-label="Edit">
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
          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
        </div>
        <Badge className={getStatusColor(product.status)}>
          {product.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Category</p>
          <p className="font-medium">{product.category || '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Price</p>
          <p className="font-medium">${product.basePrice.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Unit</p>
          <p className="font-medium">{product.unit.toUpperCase()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Stock</p>
          <div className="flex items-center gap-2">
            <p className="font-medium">{product.currentStock}</p>
            {getStockBadge(product)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" className="flex-1">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Product Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Manage your product catalog and inventory
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">{totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Products</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-green-600">{activeProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Low Stock Alerts</CardDescription>
            <CardTitle className="text-3xl md:text-4xl text-yellow-600">{lowStockProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Inventory Value</CardDescription>
            <CardTitle className="text-3xl md:text-4xl">${totalValue.toLocaleString()}</CardTitle>
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
                placeholder="Search products by name or SKU..."
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
              Products
            </div>
          </CardTitle>
          <CardDescription>Complete list of all products in your inventory</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ResponsiveTable
            data={productList}
            columns={columns}
            mobileCard={mobileCard}
            emptyMessage="No products found"
            className="md:border-0"
          />
        </CardContent>
      </Card>
    </div>
  );
}
