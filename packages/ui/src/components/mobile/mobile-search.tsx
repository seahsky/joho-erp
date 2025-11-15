'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Input } from '../input';
import { Button } from '../button';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface MobileSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFilterClick?: () => void;
  showFilter?: boolean;
  className?: string;
}

export function MobileSearch({
  placeholder = 'Search...',
  value,
  onChange,
  onFilterClick,
  showFilter = false,
  className,
}: MobileSearchProps) {
  const [localValue, setLocalValue] = React.useState(value || '');

  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={localValue}
          onChange={handleChange}
          className="pl-9 pr-9 h-11"
        />
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {showFilter && (
        <Button
          variant="outline"
          size="icon"
          onClick={onFilterClick}
          className="h-11 w-11 flex-shrink-0"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

MobileSearch.displayName = 'MobileSearch';
