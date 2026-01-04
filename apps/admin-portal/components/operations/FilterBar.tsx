'use client';

import { Input, Card, CardContent, cn } from '@joho-erp/ui';
import { Search, Filter, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

interface StatusOption {
  value: string;
  label: string;
}

interface DriverOption {
  id: string;
  name: string;
}

export interface FilterBarProps {
  // Date filter
  date?: Date;
  onDateChange?: (date: Date) => void;
  showDateFilter?: boolean;

  // Search filter
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  showSearchFilter?: boolean;

  // Status filter
  status?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: StatusOption[];
  statusPlaceholder?: string;
  showStatusFilter?: boolean;

  // Area filter (uses dynamic areas from API)
  areaId?: string;
  onAreaChange?: (areaId: string) => void;
  showAreaFilter?: boolean;

  // Driver filter
  driverId?: string;
  onDriverChange?: (driverId: string) => void;
  drivers?: DriverOption[];
  showDriverFilter?: boolean;

  // Category filter (for packing - button-based toggle)
  category?: string;
  onCategoryChange?: (category: string) => void;
  categories?: string[];
  categoryLabels?: Record<string, string>;
  showCategoryFilter?: boolean;
  allCategoriesLabel?: string;

  className?: string;
}

export function FilterBar({
  date,
  onDateChange,
  showDateFilter = false,
  search,
  onSearchChange,
  searchPlaceholder,
  showSearchFilter = false,
  status,
  onStatusChange,
  statusOptions = [],
  statusPlaceholder,
  showStatusFilter = false,
  areaId,
  onAreaChange,
  showAreaFilter = false,
  driverId,
  onDriverChange,
  drivers = [],
  showDriverFilter = false,
  category,
  onCategoryChange,
  categories = [],
  categoryLabels = {},
  showCategoryFilter = false,
  allCategoriesLabel,
  className,
}: FilterBarProps) {
  const t = useTranslations('common');
  const { data: areas } = api.area.list.useQuery(undefined, {
    enabled: showAreaFilter,
  });

  const hasSelectFilters = showStatusFilter || showAreaFilter || showDriverFilter;
  const hasCategoryFilter = showCategoryFilter && categories.length > 1;
  const hasAnyFilters = showDateFilter || showSearchFilter || hasSelectFilters || hasCategoryFilter;

  if (!hasAnyFilters) return null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onDateChange) return;
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    onDateChange(newDate);
  };

  const dateInputValue = date?.toISOString().split('T')[0] ?? '';

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        {/* Date and Search Row */}
        {(showDateFilter || showSearchFilter) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {showDateFilter && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input
                  type="date"
                  value={dateInputValue}
                  onChange={handleDateChange}
                  className="w-auto"
                />
              </div>
            )}
            {showSearchFilter && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder ?? t('search')}
                  value={search ?? ''}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        )}

        {/* Select Filters Row */}
        {hasSelectFilters && (
          <div className="flex flex-wrap gap-2">
            {showStatusFilter && statusOptions.length > 0 && (
              <select
                value={status ?? ''}
                onChange={(e) => onStatusChange?.(e.target.value)}
                className="flex-1 min-w-[140px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{statusPlaceholder ?? t('filters.allStatuses')}</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {showAreaFilter && (
              <select
                value={areaId ?? ''}
                onChange={(e) => onAreaChange?.(e.target.value)}
                className="flex-1 min-w-[140px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t('filters.allAreas')}</option>
                {areas?.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.displayName}
                  </option>
                ))}
              </select>
            )}
            {showDriverFilter && drivers.length > 0 && (
              <select
                value={driverId ?? ''}
                onChange={(e) => onDriverChange?.(e.target.value)}
                className="flex-1 min-w-[140px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t('filters.allDrivers')}</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Category Filter (Button-based toggle) */}
        {hasCategoryFilter && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>{t('filters.filterByCategory')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCategoryChange?.('all')}
                className={cn(
                  'px-3 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wide transition-all',
                  category === 'all' || !category
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {allCategoriesLabel ?? t('filters.allCategories')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange?.(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wide transition-all',
                    category === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
