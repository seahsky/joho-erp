'use client';

import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';

interface AreaLabelFilterProps {
  selectedAreaId: string;
  onAreaChange: (areaId: string) => void;
}

type ColorVariant = 'info' | 'success' | 'warning' | 'default' | 'secondary' | 'gray';

const colorVariantStyles: Record<ColorVariant, string> = {
  info: 'bg-info text-info-foreground hover:bg-info/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  gray: 'bg-muted text-muted-foreground hover:bg-muted/80',
};

export function AreaLabelFilter({ selectedAreaId, onAreaChange }: AreaLabelFilterProps) {
  const t = useTranslations('packing');
  const { data: areas, isLoading } = api.area.list.useQuery();

  if (isLoading || !areas || areas.length === 0) {
    return null;
  }

  const getButtonStyle = (isSelected: boolean, colorVariant?: string) => {
    const baseStyle = 'px-3 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wide transition-all whitespace-nowrap';

    if (isSelected) {
      const variant = (colorVariant as ColorVariant) || 'default';
      const colorStyle = colorVariantStyles[variant] || colorVariantStyles.default;
      return `${baseStyle} ${colorStyle} shadow-sm`;
    }

    return `${baseStyle} bg-muted text-muted-foreground hover:bg-muted/80`;
  };

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-2 flex-nowrap min-w-max">
        {/* "All" button */}
        <button
          type="button"
          onClick={() => onAreaChange('')}
          className={getButtonStyle(selectedAreaId === '', 'default')}
        >
          {t('allAreas')}
        </button>

        {/* Area buttons */}
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => onAreaChange(area.id)}
            className={getButtonStyle(selectedAreaId === area.id, area.colorVariant)}
          >
            {area.displayName}
          </button>
        ))}
      </div>
    </div>
  );
}
