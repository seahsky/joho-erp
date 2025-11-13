import { type inferAsyncReturnType } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export interface CreateContextOptions extends FetchCreateContextFnOptions {
  auth: {
    userId: string | null;
    sessionId: string | null;
  };
}

export async function createContext(opts: CreateContextOptions) {
  return {
    userId: opts.auth.userId,
    sessionId: opts.auth.sessionId,
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
