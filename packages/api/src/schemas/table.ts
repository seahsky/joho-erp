import { z } from 'zod';

/**
 * Standard sort input schema for tRPC queries
 */
export const sortInputSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Standard pagination input schema
 */
export const paginationInputSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
});

/**
 * Combined sort and pagination input schema
 */
export const tableQueryInputSchema = sortInputSchema.merge(paginationInputSchema);

/**
 * Search input schema
 */
export const searchInputSchema = z.object({
  search: z.string().optional(),
});

/**
 * Full table input schema with search, sort, and pagination
 */
export const fullTableQueryInputSchema = tableQueryInputSchema.merge(searchInputSchema);

// Export types
export type SortInput = z.infer<typeof sortInputSchema>;
export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type TableQueryInput = z.infer<typeof tableQueryInputSchema>;
export type SearchInput = z.infer<typeof searchInputSchema>;
export type FullTableQueryInput = z.infer<typeof fullTableQueryInputSchema>;
