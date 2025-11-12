import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import { ZodError } from 'zod';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Auth middleware - requires user to be authenticated
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
    },
  });
});

// Middleware factory for role-based access
export const hasRole = (roles: string[]) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    // In a real app, we would fetch user metadata from Clerk
    // and check if the user has one of the allowed roles
    // For now, we'll just pass through
    // TODO: Implement proper role checking with Clerk metadata

    return next({
      ctx,
    });
  });
};

// Specific role middlewares
export const isAdmin = hasRole(['admin']);
export const isAdminOrSales = hasRole(['admin', 'sales']);
export const isAdminOrSalesOrManager = hasRole(['admin', 'sales', 'manager']);
export const isPacker = hasRole(['packer', 'admin']);
export const isDriver = hasRole(['driver', 'admin']);
