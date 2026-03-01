import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext, type UserRole } from '@joho-erp/api';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { TRPCError } from '@trpc/server';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (opts) => {
      // Call auth() inside createContext to ensure proper Clerk middleware context
      const authData = await auth();

      let userRole: UserRole | null = null;
      let userName: string | null = null;

      // Fetch user role and name from Clerk if authenticated
      if (authData.userId) {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(authData.userId);

          // Extract role from publicMetadata
          // Role should be set in Clerk dashboard or via API
          // Example: user.publicMetadata = { role: 'admin' }
          const metadata = user.publicMetadata as { role?: UserRole; deactivated?: boolean };
          userRole = metadata.role || 'customer'; // Default to customer if not set

          // Block deactivated users from making any API calls
          if (metadata.deactivated) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Account deactivated' });
          }

          // Extract user display name from Clerk user
          // Prefer fullName, fallback to firstName + lastName, then email
          if (user.firstName || user.lastName) {
            userName = [user.firstName, user.lastName].filter(Boolean).join(' ');
          } else if (user.emailAddresses?.[0]?.emailAddress) {
            userName = user.emailAddresses[0].emailAddress;
          }
        } catch (error) {
          // If we can't fetch the user, log error and default to customer
          console.error('Failed to fetch user data from Clerk:', error);
          userRole = 'customer';
        }
      }

      return createContext({
        ...opts,
        auth: {
          userId: authData.userId,
          sessionId: authData.sessionId,
          userRole,
          userName,
        },
      });
    },
  });
};

export { handler as GET, handler as POST };
