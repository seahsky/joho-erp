import { router } from './trpc';
import { customerRouter } from './routers/customer';
import { productRouter } from './routers/product';
import { orderRouter } from './routers/order';

export const appRouter = router({
  customer: customerRouter,
  product: productRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;
