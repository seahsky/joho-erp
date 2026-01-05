'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  Skeleton,
  useToast,
} from '@joho-erp/ui';
import {
  FileText,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Loader2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

// Entity types for filtering
const ENTITY_TYPES = [
  'order',
  'customer',
  'product',
  'customerPricing',
  'orderItem',
  'company',
  'user',
  'permission',
  'category',
  'notification',
  'sms',
  'xero',
  'proofOfDelivery',
] as const;

// Action types for filtering
const AUDIT_ACTIONS = ['create', 'update', 'delete', 'approve', 'reject'] as const;

type AuditAction = (typeof AUDIT_ACTIONS)[number];
type EntityType = (typeof ENTITY_TYPES)[number];

export default function AuditLogsSettingsPage() {
  const t = useTranslations('settings.auditLogs');
  const tCommon = useTranslations('common');
  const { toast } = useToast();

  // Filter state
  const [filters, setFilters] = useState({
    entity: '' as EntityType | '',
    action: '' as AuditAction | '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  // UI state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [currentPage, setCurrentPage] = useState(0);

  // API query
  const {
    data: auditLogs,
    isLoading,
    isFetching,
  } = api.audit.getAll.useQuery(
    {
      limit: 50,
      cursor,
      entity: filters.entity || undefined,
      action: filters.action || undefined,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Stats query
  const { data: stats } = api.audit.getStats.useQuery(
    {
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Export mutation
  const exportMutation = api.audit.export.useMutation({
    onSuccess: (data) => {
      // Create and download CSV file
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t('exportSuccess'),
        description: t('exportSuccessDescription', { count: data.recordCount }),
      });
    },
    onError: (error) => {
      toast({
        title: t('exportError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleExport = () => {
    exportMutation.mutate({
      entity: filters.entity || undefined,
      action: filters.action || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      maxRecords: 5000,
    });
  };

  const handleNextPage = () => {
    if (auditLogs?.nextCursor) {
      const newCursors = [...cursors, auditLogs.nextCursor];
      setCursors(newCursors);
      setCursor(auditLogs.nextCursor);
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      const prevCursor = cursors[currentPage - 1];
      setCursor(prevCursor);
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      entity: '',
      action: '',
      search: '',
      dateFrom: '',
      dateTo: '',
    });
    setCursor(undefined);
    setCursors([undefined]);
    setCurrentPage(0);
  };

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Reset pagination when filters change
    setCursor(undefined);
    setCursors([undefined]);
    setCurrentPage(0);
  };

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'default';
      case 'delete':
        return 'destructive';
      case 'approve':
        return 'success';
      case 'reject':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Format changes for display
  const formatChanges = (changes: unknown) => {
    if (!changes || !Array.isArray(changes)) return null;
    return changes.map((change: { field: string; oldValue: unknown; newValue: unknown }, idx: number) => (
      <div key={idx} className="text-sm py-1 border-b last:border-0">
        <span className="font-medium">{change.field}:</span>
        <span className="text-muted-foreground ml-2">
          {JSON.stringify(change.oldValue)} &rarr; {JSON.stringify(change.newValue)}
        </span>
      </div>
    ));
  };

  const hasActiveFilters =
    filters.entity || filters.action || filters.search || filters.dateFrom || filters.dateTo;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
        </div>
        <Button onClick={handleExport} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('exporting')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {t('exportCsv')}
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalLogs')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.creates')}</CardTitle>
            <Badge variant="success" className="h-5">
              {t('actions.create')}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byAction?.find((a: { action: string; count: number }) => a.action === 'create')?.count?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.updates')}</CardTitle>
            <Badge variant="default" className="h-5">
              {t('actions.update')}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byAction?.find((a: { action: string; count: number }) => a.action === 'update')?.count?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.deletes')}</CardTitle>
            <Badge variant="destructive" className="h-5">
              {t('actions.delete')}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byAction?.find((a: { action: string; count: number }) => a.action === 'delete')?.count?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t('filters.title')}</CardTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {t('filters.active')}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  {t('filters.clear')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {/* Search */}
              <div>
                <Label>{t('filters.search')}</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('filters.searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Entity Filter */}
              <div>
                <Label>{t('filters.entity')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  value={filters.entity}
                  onChange={(e) => handleFilterChange('entity', e.target.value as EntityType | '')}
                >
                  <option value="">{t('filters.allEntities')}</option>
                  {ENTITY_TYPES.map((entity) => (
                    <option key={entity} value={entity}>
                      {t(`entities.${entity}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <Label>{t('filters.action')}</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value as AuditAction | '')}
                >
                  <option value="">{t('filters.allActions')}</option>
                  {AUDIT_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {t(`actions.${action}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <Label>{t('filters.dateFrom')}</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Date To */}
              <div>
                <Label>{t('filters.dateTo')}</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('table.title')}</CardTitle>
          <CardDescription>
            {t('table.description', { count: auditLogs?.items?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs?.items && auditLogs.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.timestamp')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.user')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.action')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.entity')}</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.entityId')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">{t('table.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.items.map((log) => (
                      <>
                        <tr
                          key={log.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm">
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">
                                  {log.userName || log.userEmail || log.userId}
                                </div>
                                {log.userRole && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.userRole}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {t(`actions.${log.action}`)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary">{t(`entities.${log.entity}`)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                            {log.entityId ? `${log.entityId.substring(0, 8)}...` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="sm">
                              {expandedRow === log.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                        {/* Expanded Row */}
                        {expandedRow === log.id && (
                          <tr key={`${log.id}-expanded`}>
                            <td colSpan={6} className="py-4 px-4 bg-muted/30">
                              <div className="grid gap-4 md:grid-cols-2">
                                {/* Changes */}
                                {log.changes && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">{t('details.changes')}</h4>
                                    <div className="bg-background p-3 rounded-md border">
                                      {formatChanges(log.changes)}
                                    </div>
                                  </div>
                                )}
                                {/* Metadata */}
                                {log.metadata && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">{t('details.metadata')}</h4>
                                    <pre className="bg-background p-3 rounded-md border text-xs overflow-auto max-h-40">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {/* Full Entity ID */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">{t('details.fullEntityId')}</h4>
                                  <code className="bg-background p-2 rounded-md border text-xs block">
                                    {log.entityId || '-'}
                                  </code>
                                </div>
                                {/* User ID */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">{t('details.userId')}</h4>
                                  <code className="bg-background p-2 rounded-md border text-xs block">
                                    {log.userId}
                                  </code>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t('pagination.page', { page: currentPage + 1 })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 0 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {tCommon('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!auditLogs?.hasMore || isFetching}
                  >
                    {tCommon('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">{t('emptyState.title')}</p>
              <p className="text-muted-foreground">{t('emptyState.description')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
