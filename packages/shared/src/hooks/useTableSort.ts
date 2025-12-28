import { useState, useCallback, useMemo } from 'react';
import type { SortDirection, TableSortState } from '../types/table';

/**
 * Hook for managing table sorting state
 *
 * @param defaultSortBy - Default field to sort by
 * @param defaultSortOrder - Default sort direction
 * @returns TableSortState with sortBy, sortOrder, and handleSort
 */
export function useTableSort(
  defaultSortBy: string = '',
  defaultSortOrder: SortDirection = 'asc'
): TableSortState {
  const [sortBy, setSortBy] = useState<string>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortDirection>(defaultSortOrder);

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        // Toggle direction if same column
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        // New column, default to ascending
        setSortBy(column);
        setSortOrder('asc');
      }
    },
    [sortBy]
  );

  return useMemo(
    () => ({
      sortBy,
      sortOrder,
      handleSort,
    }),
    [sortBy, sortOrder, handleSort]
  );
}

/**
 * Hook for client-side sorting of arrays
 * Use this when server-side sorting is not available (e.g., Clerk users)
 *
 * @param items - Array of items to sort
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction
 * @param fieldAccessor - Optional function to access nested field values
 * @returns Sorted array
 */
export function useSortedData<T>(
  items: T[],
  sortBy: string,
  sortOrder: SortDirection,
  fieldAccessor?: (item: T, field: string) => unknown
): T[] {
  return useMemo(() => {
    if (!sortBy || !items.length) {
      return items;
    }

    const sortedItems = [...items].sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      if (fieldAccessor) {
        aValue = fieldAccessor(a, sortBy);
        bValue = fieldAccessor(b, sortBy);
      } else {
        // Handle nested fields with dot notation
        const parts = sortBy.split('.');
        aValue = parts.reduce(
          (obj, key) => (obj as Record<string, unknown>)?.[key],
          a as unknown
        );
        bValue = parts.reduce(
          (obj, key) => (obj as Record<string, unknown>)?.[key],
          b as unknown
        );
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
      if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

      // Compare based on type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, {
          sensitivity: 'base',
        });
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle date strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sortOrder === 'asc'
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }
      }

      // Fallback: convert to string and compare
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sortedItems;
  }, [items, sortBy, sortOrder, fieldAccessor]);
}

/**
 * Props for ResponsiveTable sorting integration
 */
export interface ResponsiveTableSortProps {
  sortColumn: string;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
}

/**
 * Converts TableSortState to ResponsiveTable props
 */
export function toResponsiveTableSortProps(
  state: TableSortState
): ResponsiveTableSortProps {
  return {
    sortColumn: state.sortBy,
    sortDirection: state.sortOrder,
    onSort: state.handleSort,
  };
}
