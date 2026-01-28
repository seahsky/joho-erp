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
  FileText,
  User,
  CreditCard,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type JobType = 'sync_contact' | 'create_invoice' | 'create_credit_note' | 'update_invoice';

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

function getTypeIcon(type: JobType) {
  switch (type) {
    case 'sync_contact':
      return <User className="h-4 w-4 text-muted-foreground" />;
    case 'create_invoice':
    case 'update_invoice':
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
    case 'update_invoice':
      return t('type.updateInvoice');
    default:
      return type;
  }
}

export function XeroSyncJobsTable() {
  const t = useTranslations('xeroStatus.jobs');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<JobType | 'all'>('all');
  const [page, setPage] = useState(1);

  // Load sync jobs with filters
  const {
    data: jobsData,
    isLoading,
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
    onError: () => {
      toast({
        title: t('retryError'),
        description: tErrors('operationFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleRetry = async (jobId: string) => {
    await retryMutation.mutateAsync({ jobId });
  };

  const jobs = (jobsData?.jobs || []) as SyncJob[];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
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
              <option value="update_invoice">{t('type.updateInvoice')}</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => refetchJobs()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('columns.type')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('columns.entity')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('columns.status')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('columns.created')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    {t('columns.error')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    {t('columns.actions')}
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
                    <td className="py-3 px-4">
                      <StatusBadge status={job.status as StatusType} />
                    </td>
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
              {t('page', { page, total: jobsData.totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= jobsData.totalPages}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
