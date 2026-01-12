'use client';

import { StatusBadge, type StatusType } from '@joho-erp/ui';

// Matches Prisma SupplierStatus enum
export type SupplierStatus = 'active' | 'inactive' | 'pending_approval' | 'suspended';

interface SupplierStatusBadgeProps {
  status: SupplierStatus;
  showIcon?: boolean;
  className?: string;
}

/**
 * Maps supplier status to StatusBadge status type.
 * pending_approval -> pending (uses same styling)
 */
const statusMap: Record<SupplierStatus, StatusType> = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
  pending_approval: 'pending',
};

export function SupplierStatusBadge({
  status,
  showIcon = true,
  className,
}: SupplierStatusBadgeProps) {
  const mappedStatus = statusMap[status] ?? 'pending';

  return (
    <StatusBadge
      status={mappedStatus}
      showIcon={showIcon}
      className={className}
    />
  );
}

SupplierStatusBadge.displayName = 'SupplierStatusBadge';
