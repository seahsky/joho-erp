'use client';

import { api } from '@/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@joho-erp/ui';
import { Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function XeroSyncStats() {
  const t = useTranslations('xeroStatus.stats');

  // Load sync stats
  const { data: stats, isLoading } = api.xero.getSyncStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('pending')}
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
            {t('failed')}
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
            {t('completedToday')}
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
  );
}
