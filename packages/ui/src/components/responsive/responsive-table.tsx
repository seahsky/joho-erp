'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';
import { Card, CardContent } from '../card';
import { useIsMobile } from '../../hooks';

/**
 * Standard column that displays a property from the data object
 */
export interface Column<T> {
  /** Key must be a property of T for type safety */
  key: keyof T;
  label: string;
  /** Optional render function to customize display, receives the full row */
  render?: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Custom column with a string key that requires a render function
 */
export interface CustomColumn<T> {
  /** Custom key that doesn't map to T properties */
  key: string;
  label: string;
  /** Required render function for custom columns */
  render: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Discriminated union of column types
 */
export type TableColumn<T> = Column<T> | CustomColumn<T>;

export interface ResponsiveTableProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly TableColumn<T>[];
  readonly mobileCard?: (item: T, index: number) => React.ReactNode;
  readonly className?: string;
  readonly emptyMessage?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  mobileCard,
  className,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>): React.JSX.Element {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile view - card list
  if (isMobile && mobileCard) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              {mobileCard(item, index)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop view - table
  return (
    <div className={cn('overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column, colIndex) => {
                const value = row[column.key as keyof T];
                return (
                  <TableCell key={colIndex} className={column.className}>
                    {column.render ? column.render(row) : value}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

ResponsiveTable.displayName = 'ResponsiveTable';
