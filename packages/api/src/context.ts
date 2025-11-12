import { type inferAsyncReturnType } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@clerk/nextjs';

export async function createContext(opts?: FetchCreateContextFnOptions) {
  const { userId, sessionId } = auth();

  return {
    userId,
    sessionId,
    req: opts?.req,
    resHeaders: opts?.resHeaders,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
