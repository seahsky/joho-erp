import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext, type UserRole } from '@joho-erp/api';
import { auth, clerkClient } from '@clerk/nextjs/server';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (opts) => {
      // Call auth() inside createContext to ensure proper Clerk middleware context
      const authData = await auth();

      let userRole: UserRole | null = null;

      // Fetch user role from Clerk's publicMetadata if authenticated
      if (authData.userId) {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(authData.userId);

          // Extract role from publicMetadata
          // Role should be set in Clerk dashboard or via API
          // Example: user.publicMetadata = { role: 'admin' }
          const metadata = user.publicMetadata as { role?: UserRole };
          userRole = metadata.role || 'customer'; // Default to customer if not set
        } catch (error) {
          // If we can't fetch the user, log error and default to customer
          console.error('Failed to fetch user role from Clerk:', error);
          userRole = 'customer';
        }
      }

      return createContext({
        ...opts,
        auth: {
          userId: authData.userId,
          sessionId: authData.sessionId,
          userRole,
        },
      });
    },
  });
};

export { handler as GET, handler as POST };
