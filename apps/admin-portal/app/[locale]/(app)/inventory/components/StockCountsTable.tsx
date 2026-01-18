'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  EmptyState,
} from '@joho-erp/ui';
import { Package, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useDebounce } from 'use-debounce';

type StockStatus = 'all' | 'healthy' | 'low_stock' | 'out_of_stock';

interface StockStatusBadgeProps {
  currentStock: number;
  lowStockThreshold: number | null;
}

function StockStatusBadge({ currentStock, lowStockThreshold }: StockStatusBadgeProps) {
  const t = useTranslations('inventory.stockCounts.status');

  if (currentStock === 0) {
    return (
      <Badge variant="destructive">
        {t('outOfStock')}
      </Badge>
    );
  }

  if (lowStockThreshold !== null && currentStock <= lowStockThreshold) {
    return (
      <Badge variant="warning">
        {t('lowStock')}
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      {t('healthy')}
    </Badge>
  );
}

function getStockStatus(currentStock: number, lowStockThreshold: number | null): StockStatus {
  if (currentStock === 0) return 'out_of_stock';
  if (lowStockThreshold !== null && currentStock <= lowStockThreshold) return 'low_stock';
  return 'healthy';
}

// Helper to safely get stock values from product (handles admin vs customer type union)
function getProductStockInfo(product: Record<string, unknown>): {
  currentStock: number;
  lowStockThreshold: number | null;
} {
  // In admin portal, we always have currentStock and lowStockThreshold
  return {
    currentStock: (product.currentStock as number) ?? 0,
    lowStockThreshold: (product.lowStockThreshold as number | null) ?? null,
  };
}

export function StockCountsTable() {
  const t = useTranslations('inventory.stockCounts');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus>('all');
  const [debouncedSearch] = useDebounce(search, 300);

  const { data, isLoading } = api.product.getAll.useQuery({
    showAll: true,
    includeSubproducts: false,
    onlyParents: false, // Get all products including subproducts
    limit: 500, // Get all products for client-side filtering
    page: 1,
  });

  // Client-side filtering for search and status
  const filteredProducts = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((product) => {
      const stockInfo = getProductStockInfo(product as unknown as Record<string, unknown>);

      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const productStatus = getStockStatus(
          stockInfo.currentStock,
          stockInfo.lowStockThreshold
        );
        if (productStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [data?.items, debouncedSearch, statusFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mt-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StockStatus)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('filterAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAll')}</SelectItem>
              <SelectItem value="healthy">{t('filterHealthy')}</SelectItem>
              <SelectItem value="low_stock">{t('filterLowStock')}</SelectItem>
              <SelectItem value="out_of_stock">{t('filterOutOfStock')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.productName')}</TableHead>
                <TableHead>{t('columns.sku')}</TableHead>
                <TableHead className="text-right">{t('columns.currentStock')}</TableHead>
                <TableHead>{t('columns.unit')}</TableHead>
                <TableHead className="text-right">{t('columns.lowStockThreshold')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const stockInfo = getProductStockInfo(product as unknown as Record<string, unknown>);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {stockInfo.currentStock.toFixed(1)}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {stockInfo.lowStockThreshold !== null
                        ? stockInfo.lowStockThreshold.toFixed(1)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <StockStatusBadge
                        currentStock={stockInfo.currentStock}
                        lowStockThreshold={stockInfo.lowStockThreshold}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <EmptyState icon={Package} title={t('emptyState')} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
