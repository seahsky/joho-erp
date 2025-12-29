'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
} from '@joho-erp/ui';
import {
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

interface AuditLogSectionProps {
  entity: string;
  entityId: string;
  limit?: number;
  className?: string;
}

export function AuditLogSection({
  entity,
  entityId,
  limit = 10,
  className = '',
}: AuditLogSectionProps) {
  const t = useTranslations('auditLogSection');
  const tAudit = useTranslations('settings.auditLogs');
  const params = useParams();
  const locale = params.locale as string;

  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: logs, isLoading } = api.audit.getByEntity.useQuery(
    { entity, entityId, limit },
    { refetchOnWindowFocus: false }
  );

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
    return changes.map(
      (change: { field: string; oldValue: unknown; newValue: unknown }, idx: number) => (
        <div key={idx} className="text-sm py-1 border-b last:border-0">
          <span className="font-medium">{change.field}:</span>
          <span className="text-muted-foreground ml-2">
            {JSON.stringify(change.oldValue)} &rarr; {JSON.stringify(change.newValue)}
          </span>
        </div>
      )
    );
  };

  // Format relative time
  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    if (hours < 24) return t('hoursAgo', { count: hours });
    if (days < 7) return t('daysAgo', { count: days });
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('title')}</CardTitle>
            {logs && logs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {logs.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription className="text-sm">{t('description')}</CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {logs && logs.length > 0 ? (
            <>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id}>
                    <div
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                            {tAudit(`actions.${log.action}`)}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{log.userEmail || log.userId}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(log.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                        {expandedRow === log.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Expanded details */}
                    {expandedRow === log.id && (
                      <div className="ml-2 mr-2 mb-2 p-3 bg-muted/30 rounded-md border text-sm">
                        {log.changes && Array.isArray(log.changes) && log.changes.length > 0 && (
                          <div className="mb-3">
                            <h5 className="font-medium text-xs uppercase text-muted-foreground mb-1">
                              {t('changes')}
                            </h5>
                            <div className="bg-background p-2 rounded border">
                              {formatChanges(log.changes)}
                            </div>
                          </div>
                        )}
                        {log.metadata && (
                          <div className="mb-3">
                            <h5 className="font-medium text-xs uppercase text-muted-foreground mb-1">
                              {t('metadata')}
                            </h5>
                            <pre className="bg-background p-2 rounded border text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* View full history link */}
              <div className="mt-4 pt-3 border-t">
                <Link
                  href={`/${locale}/settings/audit-logs?entity=${entity}&search=${entityId}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {t('viewFullHistory')}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('noLogs')}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
