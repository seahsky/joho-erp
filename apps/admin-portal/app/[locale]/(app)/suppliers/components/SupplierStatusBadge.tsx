'use client';

import { StatusBadge } from '@joho-erp/ui';
import type { SupplierStatus } from '@joho-erp/database';

// Map supplier-specific statuses to generic StatusBadge types
const statusMap: Record<SupplierStatus, 'active' | 'inactive' | 'suspended' | 'pending'> = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
  pending_approval: 'pending',
};

interface SupplierStatusBadgeProps {
  status: SupplierStatus | string;
  showIcon?: boolean;
  className?: string;
}

export function SupplierStatusBadge({
  status,
  showIcon = true,
  className,
}: SupplierStatusBadgeProps) {
  const mappedStatus = statusMap[status as SupplierStatus] || 'pending';

  return (
    <StatusBadge
      status={mappedStatus}
      showIcon={showIcon}
      className={className}
    />
  );
}
