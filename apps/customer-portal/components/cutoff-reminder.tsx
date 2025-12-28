'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { cn } from '@joho-erp/ui';

interface CutoffReminderProps {
  cutoffTime: string;
  isAfterCutoff: boolean;
  nextAvailableDate: Date;
  variant?: 'default' | 'compact';
  className?: string;
}

export function CutoffReminder({
  cutoffTime,
  isAfterCutoff,
  nextAvailableDate,
  variant = 'default',
  className,
}: CutoffReminderProps) {
  const t = useTranslations('cutoffReminder');

  const formattedDate = nextAvailableDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2.5 rounded-lg text-sm',
          isAfterCutoff
            ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
            : 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
          className
        )}
      >
        <Clock
          className={cn(
            'h-4 w-4 flex-shrink-0',
            isAfterCutoff ? 'text-amber-600' : 'text-blue-600'
          )}
        />
        <span
          className={cn(
            'text-xs font-medium',
            isAfterCutoff
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-blue-800 dark:text-blue-200'
          )}
        >
          {isAfterCutoff
            ? t('compactAfterCutoff', { date: formattedDate })
            : t('compactBeforeCutoff', { time: cutoffTime })}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg',
        isAfterCutoff
          ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
          : 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
        className
      )}
    >
      <Clock
        className={cn(
          'h-5 w-5 mt-0.5 flex-shrink-0',
          isAfterCutoff ? 'text-amber-600' : 'text-blue-600'
        )}
      />
      <div>
        <p
          className={cn(
            'text-sm font-medium',
            isAfterCutoff
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-blue-800 dark:text-blue-200'
          )}
        >
          {isAfterCutoff
            ? t('afterCutoffTitle', { time: cutoffTime })
            : t('beforeCutoffTitle', { time: cutoffTime })}
        </p>
        <p
          className={cn(
            'text-xs mt-1',
            isAfterCutoff
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-blue-600 dark:text-blue-400'
          )}
        >
          {isAfterCutoff
            ? t('nextAvailable', { date: formattedDate })
            : t('beforeCutoffMessage')}
        </p>
      </div>
    </div>
  );
}
