'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  orderCount?: number;
}

interface DriverFilterProps {
  drivers: Driver[];
  selectedDriverId: string | null;
  onDriverChange: (driverId: string | null) => void;
  disabled?: boolean;
}

export function DriverFilter({
  drivers,
  selectedDriverId,
  onDriverChange,
  disabled = false,
}: DriverFilterProps) {
  const t = useTranslations('deliveries');

  return (
    <Select
      value={selectedDriverId ?? 'all'}
      onValueChange={(value) => onDriverChange(value === 'all' ? null : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px]">
        <Users className="h-4 w-4 mr-2" />
        <SelectValue placeholder={t('driverFilter.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('driverFilter.allDrivers')}</SelectItem>
        {drivers.map((driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.name}
            {driver.orderCount !== undefined && (
              <span className="ml-2 text-muted-foreground">({driver.orderCount})</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
