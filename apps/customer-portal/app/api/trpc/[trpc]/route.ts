import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@jimmy-beef/api';
import { auth } from '@clerk/nextjs/server';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (opts) => {
      // Call auth() inside createContext to ensure proper Clerk middleware context
      const authData = await auth();

      return createContext({
        ...opts,
        auth: {
          userId: authData.userId,
          sessionId: authData.sessionId,
        },
      });
    },
  });
};

export { handler as GET, handler as POST };
