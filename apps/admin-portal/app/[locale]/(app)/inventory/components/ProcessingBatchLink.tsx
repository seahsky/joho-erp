'use client';

import { Badge } from '@joho-erp/ui';
import { ArrowRightLeft, Hash } from 'lucide-react';

interface ProcessingBatchLinkProps {
  batchNumber: string | null;
  onProcessingClick: (batchNumber: string) => void;
}

export function ProcessingBatchLink({
  batchNumber,
  onProcessingClick,
}: ProcessingBatchLinkProps) {
  if (!batchNumber) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }

  if (batchNumber.startsWith('PR-')) {
    return (
      <Badge
        variant="secondary"
        className="font-mono cursor-pointer hover:bg-secondary/80 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onProcessingClick(batchNumber);
        }}
      >
        <ArrowRightLeft className="mr-1 h-3 w-3" />
        {batchNumber}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="font-mono">
      <Hash className="mr-1 h-3 w-3" />
      {batchNumber}
    </Badge>
  );
}
