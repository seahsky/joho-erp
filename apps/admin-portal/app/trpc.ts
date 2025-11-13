import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@jimmy-beef/api';

export const trpc = createTRPCReact<AppRouter>();
