import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@joho-erp/api';

export const trpc = createTRPCReact<AppRouter>();
