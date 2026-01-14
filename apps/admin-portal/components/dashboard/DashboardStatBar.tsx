'use client';

import { useRouter } from 'next/navigation';
import { CountUp } from '@joho-erp/ui';

type AccentColor = 'primary' | 'warning' | 'success' | 'info' | 'destructive';

interface StatItem {
  label: string;
  value: number;
  color: AccentColor;
  href?: string;
  subtitle?: string;
}

interface DashboardStatBarProps {
  stats: StatItem[];
  isLoading?: boolean;
}

export function DashboardStatBar({ stats, isLoading }: DashboardStatBarProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="dashboard-stat-bar animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="dashboard-stat-item">
            <div className="h-6 w-12 bg-muted rounded mb-1" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-stat-bar">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`dashboard-stat-item accent-${stat.color}`}
          onClick={() => stat.href && router.push(stat.href)}
          role={stat.href ? 'button' : undefined}
          tabIndex={stat.href ? 0 : undefined}
          onKeyDown={(e) => {
            if (stat.href && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              router.push(stat.href);
            }
          }}
        >
          <div className="dashboard-stat-value">
            <CountUp end={stat.value} duration={0.8} />
          </div>
          <div className="dashboard-stat-label">{stat.label}</div>
          {stat.subtitle && (
            <div className="text-[10px] text-muted-foreground/70 -mt-0.5">
              {stat.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
