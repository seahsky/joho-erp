import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@jimmy-beef/api';
import { auth } from '@clerk/nextjs/server';

const handler = async (req: Request) => {
  // Call auth() at app level to ensure Clerk can detect middleware
  const authData = await auth();

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: (opts) =>
      createContext({
        ...opts,
        auth: {
          userId: authData.userId,
          sessionId: authData.sessionId,
        },
      }),
  });
};

export { handler as GET, handler as POST };
