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

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  mobileCard?: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  mobileCard,
  className,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) {
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
                    {column.render ? column.render(value, row) : value}
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
