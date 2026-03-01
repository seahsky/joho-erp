'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
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
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@joho-erp/ui';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useTranslations } from 'next-intl';
import { formatAUD } from '@joho-erp/shared';
import { api } from '@/trpc/client';
import { ExpiringBatchActions } from './ExpiringBatchActions';
import { BatchInfoDialog } from './BatchInfoDialog';
import { BatchLink } from './BatchLink';
import { ProcessingRecordDialog } from './ProcessingRecordDialog';

type StatusFilter = 'all' | 'expired' | 'expiringSoon';
type SortBy = 'expiryDate' | 'value' | 'productName' | 'quantity' | 'batchNumber';
type SortDirection = 'asc' | 'desc';

interface ExpiringBatchesListProps {
  onBack?: () => void;
}

export function ExpiringBatchesList({ onBack }: ExpiringBatchesListProps) {
  const t = useTranslations('inventory.expiringList');
  const tDashboard = useTranslations('dashboard.expiringInventory');

  // Search state
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryId, setCategoryId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>('expiryDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Batch dialog state
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  // Processing record dialog state
  const [selectedProcessingBatchNumber, setSelectedProcessingBatchNumber] = useState<string | null>(null);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);

  // Fetch categories and suppliers for filter dropdowns
  const { data: categoriesData } = api.category.getAll.useQuery();
  const { data: suppliersData } = api.supplier.getAll.useQuery({});

  // Fetch expiring batches
  const { data, isLoading, refetch } = api.inventory.getExpiringBatches.useQuery({
    page,
    pageSize,
    sortBy,
    sortDirection,
    statusFilter,
    categoryId: categoryId || undefined,
    supplierId: supplierId || undefined,
    search: debouncedSearch || undefined,
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getExpiryBadge = (daysUntilExpiry: number | null, isExpired: boolean) => {
    if (daysUntilExpiry == null) {
      return <Badge variant="outline">-</Badge>;
    }

    if (isExpired) {
      return (
        <Badge variant="destructive">
          {tDashboard('expiredDays', { days: Math.abs(daysUntilExpiry) })}
        </Badge>
      );
    }

    if (daysUntilExpiry <= 7) {
      return (
        <Badge variant="warning">
          {tDashboard('expiresIn', { days: daysUntilExpiry })}
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        {tDashboard('expiresIn', { days: daysUntilExpiry })}
      </Badge>
    );
  };

  const handleRowClick = (batchId: string) => {
    setSelectedBatchId(batchId);
    setShowBatchDialog(true);
  };

  const handleActionSuccess = () => {
    refetch();
  };

  const handleFilterChange = () => {
    setPage(1);
  };

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

  const batches = data?.batches ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {t('title')}
                </CardTitle>
                <CardDescription>
                  {summary && t('subtitle', {
                    expired: summary.expiredCount,
                    expiring: summary.expiringSoonCount,
                    days: summary.thresholdDays,
                  })}
                </CardDescription>
              </div>
            </div>
            {summary && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('totalValue')}</p>
                <p className="text-lg font-semibold">{formatAUD(summary.totalValue)}</p>
              </div>
            )}
          </div>

          {/* Status Filter Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              handleFilterChange();
            }}
            className="mt-4"
          >
            <TabsList>
              <TabsTrigger value="all">{t('filters.all')}</TabsTrigger>
              <TabsTrigger value="expired">{t('filters.expired')}</TabsTrigger>
              <TabsTrigger value="expiringSoon">{t('filters.expiringSoon')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Additional Filters */}
          <div className="flex flex-col gap-4 mt-4 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('filters.searchPlaceholder')}
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value === 'all' ? '' : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('filters.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
                {categoriesData?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={supplierId}
              onValueChange={(value) => {
                setSupplierId(value === 'all' ? '' : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('filters.allSuppliers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allSuppliers')}</SelectItem>
                {suppliersData?.suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}-${sortDirection}`}
              onValueChange={(value) => {
                const [newSortBy, newSortDirection] = value.split('-') as [SortBy, SortDirection];
                setSortBy(newSortBy);
                setSortDirection(newSortDirection);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('sort.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expiryDate-asc">{t('sort.expiryDateAsc')}</SelectItem>
                <SelectItem value="expiryDate-desc">{t('sort.expiryDateDesc')}</SelectItem>
                <SelectItem value="value-desc">{t('sort.valueDesc')}</SelectItem>
                <SelectItem value="value-asc">{t('sort.valueAsc')}</SelectItem>
                <SelectItem value="productName-asc">{t('sort.productNameAsc')}</SelectItem>
                <SelectItem value="productName-desc">{t('sort.productNameDesc')}</SelectItem>
                <SelectItem value="quantity-desc">{t('sort.quantityDesc')}</SelectItem>
                <SelectItem value="quantity-asc">{t('sort.quantityAsc')}</SelectItem>
                <SelectItem value="batchNumber-asc">{t('sort.batchNumberAsc')}</SelectItem>
                <SelectItem value="batchNumber-desc">{t('sort.batchNumberDesc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.batchNumber')}</TableHead>
                  <TableHead>{t('columns.product')}</TableHead>
                  <TableHead>{t('columns.category')}</TableHead>
                  <TableHead>{t('columns.expiry')}</TableHead>
                  <TableHead className="text-right">{t('columns.quantity')}</TableHead>
                  <TableHead>{t('columns.received')}</TableHead>
                  <TableHead>{t('columns.supplier')}</TableHead>
                  <TableHead className="text-right">{t('columns.value')}</TableHead>
                  <TableHead className="text-right">{t('columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(batch.id)}
                  >
                    <TableCell>
                      <BatchLink
                        batchNumber={batch.batchNumber}
                        onClick={(bn) => {
                          if (bn.startsWith('PR-')) {
                            setSelectedProcessingBatchNumber(bn);
                            setShowProcessingDialog(true);
                          } else {
                            handleRowClick(batch.id);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{batch.product.name}</p>
                        <p className="text-sm text-muted-foreground">{batch.product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {batch.product.category ? (
                        <Badge variant="outline">{batch.product.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{formatDate(batch.expiryDate!)}</span>
                        {getExpiryBadge(batch.daysUntilExpiry, batch.isExpired)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.quantityRemaining.toFixed(1)} {batch.product.unit}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(batch.receivedAt)}</span>
                    </TableCell>
                    <TableCell>
                      {batch.supplier?.businessName ?? (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAUD(batch.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ExpiringBatchActions
                        batchId={batch.id}
                        productName={batch.product.name}
                        currentQuantity={batch.quantityRemaining}
                        unit={batch.product.unit}
                        onSuccess={handleActionSuccess}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {batches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      <EmptyState
                        icon={AlertTriangle}
                        title={t('emptyState')}
                        description={t('emptyStateDescription')}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('pagination.showing', {
                  start: (pagination.page - 1) * pagination.pageSize + 1,
                  end: Math.min(pagination.page * pagination.pageSize, pagination.total),
                  total: pagination.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('pagination.pageOf', { page: pagination.page, total: pagination.totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  {t('pagination.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Info Dialog */}
      <BatchInfoDialog
        open={showBatchDialog}
        onOpenChange={(open) => {
          setShowBatchDialog(open);
          if (!open) setSelectedBatchId(null);
        }}
        batchId={selectedBatchId}
      />

      {/* Processing Record Dialog */}
      <ProcessingRecordDialog
        open={showProcessingDialog}
        onOpenChange={(open) => {
          setShowProcessingDialog(open);
          if (!open) setSelectedProcessingBatchNumber(null);
        }}
        batchNumber={selectedProcessingBatchNumber}
      />
    </>
  );
}
