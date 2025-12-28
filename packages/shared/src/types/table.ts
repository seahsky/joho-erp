/**
 * Shared table types for sorting and filtering
 */

// Sort direction type
export type SortDirection = 'asc' | 'desc';

// Sort configuration for a table
export interface SortConfig {
  sortBy: string;
  sortOrder: SortDirection;
}

// Table sort state with handler
export interface TableSortState extends SortConfig {
  handleSort: (column: string) => void;
}

// Column definition for sortable tables
export interface SortableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  // Maps frontend field name to Prisma orderBy field path
  // e.g., 'customerName' -> 'customer.businessName'
  sortField?: string;
}

// Field mapping for nested Prisma orderBy
// e.g., { 'customerName': 'customer.businessName' }
export type SortFieldMapping = Record<string, string>;

/**
 * Builds a Prisma-compatible orderBy object from sort parameters
 * Handles nested fields like 'customer.businessName'
 *
 * @param sortBy - The field to sort by (can use dot notation for nested)
 * @param sortOrder - The sort direction ('asc' or 'desc')
 * @param fieldMapping - Optional mapping from frontend field names to Prisma paths
 * @returns Prisma orderBy object
 */
export function buildPrismaOrderBy(
  sortBy: string | undefined,
  sortOrder: SortDirection | undefined,
  fieldMapping?: SortFieldMapping
): Record<string, unknown> {
  if (!sortBy) {
    return {};
  }

  const direction = sortOrder || 'asc';

  // Apply field mapping if provided
  const actualField = fieldMapping?.[sortBy] || sortBy;

  // Handle nested fields (e.g., 'customer.businessName')
  const parts = actualField.split('.');

  if (parts.length === 1) {
    return { [parts[0]]: direction };
  }

  // Build nested orderBy object
  // e.g., 'customer.businessName' -> { customer: { businessName: 'asc' } }
  let result: Record<string, unknown> = { [parts[parts.length - 1]]: direction };

  for (let i = parts.length - 2; i >= 0; i--) {
    result = { [parts[i]]: result };
  }

  return result;
}

/**
 * Default sort configurations for common entities
 */
export const DEFAULT_SORT_CONFIG: Record<string, SortConfig> = {
  customer: { sortBy: 'businessName', sortOrder: 'asc' },
  product: { sortBy: 'name', sortOrder: 'asc' },
  order: { sortBy: 'orderedAt', sortOrder: 'desc' },
  pricing: { sortBy: 'createdAt', sortOrder: 'desc' },
  delivery: { sortBy: 'deliverySequence', sortOrder: 'asc' },
  user: { sortBy: 'lastName', sortOrder: 'asc' },
};
