'use client';

import { useState, useMemo, Fragment } from 'react';
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
import { formatAUD } from '@joho-erp/shared';
import { ChevronDown, ChevronRight, Package, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useDebounce } from 'use-debounce';
import { BatchInfoDialog } from './BatchInfoDialog';

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

function ProductBatchRows({
  productId,
  parentCurrentStock,
  tBatches,
  tExpiry,
  onBatchClick,
}: {
  productId: string;
  parentCurrentStock: number;
  tBatches: (key: string, values?: Record<string, string | number>) => string;
  tExpiry: (key: string, values?: Record<string, string | number | Date>) => string;
  onBatchClick: (batchId: string) => void;
}) {
  const { data: batches, isLoading } = api.inventory.getProductBatches.useQuery({
    productId,
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getExpiryBadge = (batch: {
    expiryDate: string | Date | null;
    daysUntilExpiry: number | null;
    isExpired: boolean;
  }) => {
    if (!batch.expiryDate || batch.daysUntilExpiry === null) return null;

    if (batch.isExpired) {
      return (
        <Badge variant="destructive">
          {tExpiry('expiredDays', { days: Math.abs(batch.daysUntilExpiry) })}
        </Badge>
      );
    }

    if (batch.daysUntilExpiry <= 7) {
      return (
        <Badge variant="warning">
          {tExpiry('expiresIn', { days: batch.daysUntilExpiry })}
        </Badge>
      );
    }

    return (
      <Badge variant="success">
        {tExpiry('expiresIn', { days: batch.daysUntilExpiry })}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="bg-muted/30 py-3 pl-12">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-48" />
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="bg-muted/30 py-3 pl-12 text-sm text-muted-foreground">
          {tBatches('batches.noBatches')}
        </TableCell>
      </TableRow>
    );
  }

  const batchSum = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
  const hasMismatch = Math.abs(batchSum - parentCurrentStock) > 0.01;

  return (
    <>
      {/* Batch sub-header */}
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell />
        <TableCell className="pl-8 text-xs font-medium text-muted-foreground">
          {tBatches('batches.expiry')}
        </TableCell>
        <TableCell className="text-xs font-medium text-muted-foreground">
          {tBatches('batches.supplier')}
        </TableCell>
        <TableCell className="text-right text-xs font-medium text-muted-foreground">
          {tBatches('batches.quantity')}
        </TableCell>
        <TableCell className="text-xs font-medium text-muted-foreground">
          {tBatches('batches.costPerUnit')}
        </TableCell>
        <TableCell className="text-xs font-medium text-muted-foreground" colSpan={2}>
          {tBatches('batches.received')}
        </TableCell>
      </TableRow>
      {/* Batch rows */}
      {batches.map((batch) => (
        <TableRow
          key={batch.id}
          className="cursor-pointer bg-muted/30 hover:bg-muted/50"
          onClick={(e) => {
            e.stopPropagation();
            onBatchClick(batch.id);
          }}
        >
          <TableCell />
          <TableCell className="pl-8">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {batch.expiryDate ? formatDate(batch.expiryDate) : '-'}
              </span>
              {getExpiryBadge(batch)}
            </div>
          </TableCell>
          <TableCell className="text-sm">
            {batch.supplier?.businessName ?? '-'}
          </TableCell>
          <TableCell className="text-right text-sm tabular-nums">
            {batch.quantityRemaining.toFixed(1)}
          </TableCell>
          <TableCell className="text-sm">
            {formatAUD(batch.costPerUnit)}
          </TableCell>
          <TableCell className="text-sm" colSpan={2}>
            {formatDate(batch.receivedAt)}
          </TableCell>
        </TableRow>
      ))}
      {/* Batch total summary row */}
      <TableRow className="bg-muted/50 hover:bg-muted/50 border-t">
        <TableCell />
        <TableCell className="pl-8 text-sm font-semibold" colSpan={2}>
          {tBatches('batchTotal')}
        </TableCell>
        <TableCell className="text-right text-sm font-semibold tabular-nums">
          {batchSum.toFixed(1)}
        </TableCell>
        <TableCell colSpan={3}>
          {hasMismatch && (
            <Badge variant="warning" className="text-xs">
              {tBatches('mismatchWarning', { currentStock: parentCurrentStock.toFixed(1) })}
            </Badge>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}

export function StockCountsTable({
  initialStatusFilter,
  initialSearch,
}: {
  initialStatusFilter?: StockStatus;
  initialSearch?: string;
} = {}) {
  const t = useTranslations('inventory.stockCounts');
  const tExpiry = useTranslations('dashboard.expiringInventory');
  const [search, setSearch] = useState(initialSearch ?? '');
  const [statusFilter, setStatusFilter] = useState<StockStatus>(initialStatusFilter ?? 'all');
  const [debouncedSearch] = useDebounce(search, 300);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const { data, isLoading } = api.product.getAll.useQuery({
    showAll: true,
    includeSubproducts: false,
    onlyParents: false,
    limit: 500,
    page: 1,
  });

  const toggleExpanded = (productId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

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
                <TableHead className="w-8" />
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
                const isExpanded = expandedRows.has(product.id);
                return (
                  <Fragment key={product.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpanded(product.id)}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
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
                    {isExpanded && (
                      <ProductBatchRows
                        productId={product.id}
                        parentCurrentStock={stockInfo.currentStock}
                        tBatches={t}
                        tExpiry={tExpiry}
                        onBatchClick={(batchId) => {
                          setSelectedBatchId(batchId);
                          setShowBatchDialog(true);
                        }}
                      />
                    )}
                  </Fragment>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    <EmptyState icon={Package} title={t('emptyState')} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <BatchInfoDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        batchId={selectedBatchId}
      />
    </Card>
  );
}
