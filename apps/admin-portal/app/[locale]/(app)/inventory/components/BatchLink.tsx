'use client';

import { Badge } from '@joho-erp/ui';
import {
  ArrowRightLeft,
  CheckCheck,
  Hash,
  Package,
  PackagePlus,
  Trash2,
} from 'lucide-react';

interface BatchLinkProps {
  batchNumber: string | null;
  onClick: (batchNumber: string) => void;
}

function getBatchIcon(batchNumber: string) {
  if (batchNumber.startsWith('SI-')) return PackagePlus;
  if (batchNumber.startsWith('PR-')) return ArrowRightLeft;
  if (batchNumber.startsWith('WO-')) return Trash2;
  if (batchNumber.startsWith('PA-')) return Package;
  if (batchNumber.startsWith('CC-')) return CheckCheck;
  return Hash;
}

export function BatchLink({ batchNumber, onClick }: BatchLinkProps) {
  if (!batchNumber) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }

  const Icon = getBatchIcon(batchNumber);

  return (
    <Badge
      variant="secondary"
      className="font-mono cursor-pointer hover:bg-secondary/80 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onClick(batchNumber);
      }}
    >
      <Icon className="mr-1 h-3 w-3" />
      {batchNumber}
    </Badge>
  );
}
