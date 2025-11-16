import { router } from './trpc';
import { customerRouter } from './routers/customer';
import { productRouter } from './routers/product';
import { orderRouter } from './routers/order';
import { dashboardRouter } from './routers/dashboard';
import { deliveryRouter } from './routers/delivery';

export const appRouter = router({
  customer: customerRouter,
  product: productRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
  delivery: deliveryRouter,
});

export type AppRouter = typeof appRouter;
