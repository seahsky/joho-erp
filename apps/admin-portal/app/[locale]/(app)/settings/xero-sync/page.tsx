'use client';

import { useState } from 'react';
import { api } from '@/trpc/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  useToast,
  StatusBadge,
  type StatusType,
} from '@joho-erp/ui';
import {
  RefreshCcw,
  Loader2,
  AlertTriangle,
  FileText,
  User,
  CreditCard,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type JobType = 'sync_contact' | 'create_invoice' | 'create_credit_note';

interface SyncJob {
  id: string;
  type: JobType;
  status: JobStatus;
  entityType: string;
  entityId: string;
  attempts: number;
  error?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

// Status badge now uses consolidated StatusBadge component

function getTypeIcon(type: JobType) {
  switch (type) {
    case 'sync_contact':
      return <User className="h-4 w-4 text-muted-foreground" />;
    case 'create_invoice':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'create_credit_note':
      return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTypeLabel(type: JobType, t: (key: string) => string) {
  switch (type) {
    case 'sync_contact':
      return t('type.syncContact');
    case 'create_invoice':
      return t('type.createInvoice');
    case 'create_credit_note':
      return t('type.createCreditNote');
    default:
      return type;
  }
}

export default function XeroSyncPage() {
  const t = useTranslations('xeroSync');
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<JobType | 'all'>('all');
  const [page, setPage] = useState(1);

  // Load sync stats
  const { data: stats, isLoading: statsLoading } = api.xero.getSyncStats.useQuery();

  // Load sync jobs with filters
  const {
    data: jobsData,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = api.xero.getSyncJobs.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    page,
    limit: 20,
  });

  // Retry mutation
  const retryMutation = api.xero.retryJob.useMutation({
    onSuccess: () => {
      toast({
        title: t('retrySuccess'),
        description: t('retrySuccessDescription'),
      });
      refetchJobs();
    },
    onError: (error) => {
      toast({
        title: t('retryError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRetry = async (jobId: string) => {
    await retryMutation.mutateAsync({ jobId });
  };

  if (statsLoading || jobsLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const jobs = (jobsData?.jobs || []) as SyncJob[];

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <SettingsPageHeader
        icon={RefreshCcw}
        titleKey="title"
        descriptionKey="subtitle"
        namespace="xeroSync"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{stats?.pending || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.failed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{stats?.failed || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.completedToday')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{stats?.completedToday || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t('jobs.title')}</CardTitle>
              <CardDescription>{t('jobs.description')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as JobStatus | 'all');
                  setPage(1);
                }}
                className="px-3 py-2 border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t('filter.allStatus')}</option>
                <option value="pending">{t('status.pending')}</option>
                <option value="processing">{t('status.processing')}</option>
                <option value="completed">{t('status.completed')}</option>
                <option value="failed">{t('status.failed')}</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as JobType | 'all');
                  setPage(1);
                }}
                className="px-3 py-2 border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t('filter.allTypes')}</option>
                <option value="sync_contact">{t('type.syncContact')}</option>
                <option value="create_invoice">{t('type.createInvoice')}</option>
                <option value="create_credit_note">{t('type.createCreditNote')}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchJobs()}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('jobs.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('jobs.type')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('jobs.entity')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('jobs.status')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('jobs.created')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t('jobs.error')}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t('jobs.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(job.type)}
                          <span className="text-sm">{getTypeLabel(job.type, t)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {job.entityType}: {job.entityId.slice(-8)}
                        </span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={job.status as StatusType} /></td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {job.error && (
                          <span
                            className="text-sm text-destructive truncate max-w-[200px] block"
                            title={job.error}
                          >
                            {job.error}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {job.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetry(job.id)}
                            disabled={retryMutation.isPending}
                          >
                            {retryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {jobsData && jobsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {t('jobs.page', { page, total: jobsData.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  {t('jobs.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= jobsData.totalPages}
                >
                  {t('jobs.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
