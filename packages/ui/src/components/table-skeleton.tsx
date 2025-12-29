'use client';

import { useIsMobile } from '../hooks/use-media-query';
import { cn } from '../lib/utils';
import { Skeleton } from './skeleton';
import { Card, CardContent } from './card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface TableSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number;
  /** Number of columns for desktop table view */
  columns?: number;
  /** Whether to show mobile card skeletons on mobile viewport */
  showMobileCards?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A skeleton loading component that mimics table/card list appearance.
 * Shows table skeleton on desktop and card skeletons on mobile.
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  showMobileCards = true,
  className,
}: TableSkeletonProps) {
  const isMobile = useIsMobile();

  // Mobile card skeletons
  if (isMobile && showMobileCards) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table skeleton
  // Generate varied widths for realistic appearance
  const getColumnWidth = (colIndex: number) => {
    const widths = ['w-24', 'w-32', 'w-40', 'w-20', 'w-28', 'w-16'];
    return widths[colIndex % widths.length];
  };

  return (
    <div className={cn('w-full overflow-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className={cn('h-4', getColumnWidth(i))} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className={cn('h-4', getColumnWidth(colIndex))} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
