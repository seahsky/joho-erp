import { type inferAsyncReturnType } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

/**
 * Valid user roles in the system
 * - admin: Full system access
 * - sales: Customer management, orders, pricing, deliveries
 * - manager: Similar to sales with analytics
 * - packer: Warehouse/packing operations
 * - driver: Delivery operations
 * - customer: Limited to own data (default)
 */
export type UserRole = 'admin' | 'sales' | 'manager' | 'packer' | 'driver' | 'customer';

export interface CreateContextOptions extends FetchCreateContextFnOptions {
  auth: {
    userId: string | null;
    sessionId: string | null;
    // User role from Clerk's publicMetadata
    userRole?: UserRole | null;
    // User display name (firstName + lastName)
    userName?: string | null;
  };
}

export async function createContext(opts: CreateContextOptions) {
  return {
    userId: opts.auth.userId,
    sessionId: opts.auth.sessionId,
    userRole: opts.auth.userRole || ('customer' as UserRole), // Default to customer
    userName: opts.auth.userName || null,
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
