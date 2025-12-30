'use client';

import { Card, CardContent, CardHeader, CardTitle, StatusBadge, type StatusType } from '@joho-erp/ui';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@joho-erp/shared';

interface StatusHistoryItem {
  status: string;
  changedAt: Date | string;
  changedBy: string;
  changedByName?: string | null;
  changedByEmail?: string | null;
  notes?: string | null;
}

interface StatusTimelineProps {
  statusHistory: StatusHistoryItem[];
}

export function StatusTimeline({ statusHistory }: StatusTimelineProps) {
  const t = useTranslations('orderDetail');

  // Sort by date descending (most recent first)
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('timeline.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('timeline.noHistory')}
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {sortedHistory.map((item, index) => (
                <div key={index} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={item.status as StatusType} />
                      <span className="text-sm text-muted-foreground">
                        {formatDate(item.changedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('timeline.changedBy')} {item.changedByName || item.changedByEmail || t('timeline.systemUser')}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
