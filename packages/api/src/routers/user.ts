import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  /**
   * Get all users (Clerk integration)
   * Note: This requires Clerk SDK to be configured
   */
  getAll: isAdminOrSales.query(async () => {
    // TODO: Implement Clerk SDK integration
    // For now, return mock data structure
    return [];
  }),

  /**
   * Get user by ID
   */
  getById: isAdminOrSales
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
      })
    )
    .query(async ({ input: _input }) => {
      // TODO: Implement Clerk SDK integration
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'User management requires Clerk SDK integration',
      });
    }),

  /**
   * Update user role/permissions
   */
  updateRole: isAdminOrSales
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
        role: z.enum(['admin', 'sales', 'driver', 'viewer']),
      })
    )
    .mutation(async ({ input: _input }) => {
      // TODO: Implement Clerk SDK integration
      // This would update user metadata in Clerk
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'User management requires Clerk SDK integration',
      });
    }),

  /**
   * Deactivate a user
   */
  deactivate: isAdminOrSales
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
      })
    )
    .mutation(async ({ input: _input }) => {
      // TODO: Implement Clerk SDK integration
      // This would ban or delete the user in Clerk
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'User management requires Clerk SDK integration',
      });
    }),

  /**
   * Invite a new user
   */
  invite: isAdminOrSales
    .input(
      z.object({
        email: z.string().email('Valid email is required'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        role: z.enum(['admin', 'sales', 'driver', 'viewer']),
      })
    )
    .mutation(async ({ input: _input }) => {
      // TODO: Implement Clerk SDK integration
      // This would create an invitation in Clerk
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'User management requires Clerk SDK integration',
      });
    }),
});
