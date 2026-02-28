import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext, type UserRole } from '@joho-erp/api';
import { auth, clerkClient } from '@clerk/nextjs/server';

// E2E testing bypass: requires both flags to prevent accidental use in production
const isE2ETesting = process.env.E2E_TESTING === 'true' && process.env.NODE_ENV !== 'production';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (opts) => {
      // In E2E testing mode, read auth from custom headers instead of Clerk
      if (isE2ETesting) {
        const userId = req.headers.get('x-e2e-user-id') || 'e2e-admin-user';
        const userRole = (req.headers.get('x-e2e-user-role') || 'admin') as UserRole;
        const userName = req.headers.get('x-e2e-user-name') || 'E2E Admin';
        const sessionId = req.headers.get('x-e2e-session-id') || 'e2e-session';

        return createContext({
          ...opts,
          auth: {
            userId,
            sessionId,
            userRole,
            userName,
          },
        });
      }

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
          const metadata = user.publicMetadata as { role?: UserRole };
          userRole = metadata.role || 'customer'; // Default to customer if not set

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
