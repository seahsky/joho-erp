'use client';

import { Card, CardHeader, CardDescription, CountUp, cn } from '@joho-erp/ui';
import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  label: string;
  value: number;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'info' | 'warning';
}

export interface StatsBarProps {
  stats: StatItem[];
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: '',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
};

export function StatsBar({ stats, className }: StatsBarProps) {
  if (stats.length === 0) return null;

  return (
    <div
      className={cn(
        'grid gap-3',
        stats.length === 1 && 'grid-cols-1',
        stats.length === 2 && 'grid-cols-2',
        stats.length >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const valueClassName = cn(
          'stat-value tabular-nums',
          stat.variant && variantStyles[stat.variant]
        );

        return (
          <Card key={index} className="stat-card animate-fade-in-up">
            <div className="stat-card-gradient" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center gap-2">
                {Icon && (
                  <Icon className="h-4 w-4 text-muted-foreground" />
                )}
                <CardDescription>{stat.label}</CardDescription>
              </div>
              <div className={valueClassName}>
                <CountUp end={stat.value} />
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
