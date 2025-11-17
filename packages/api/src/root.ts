import { router } from './trpc';
import { customerRouter } from './routers/customer';
import { productRouter } from './routers/product';
import { orderRouter } from './routers/order';
import { dashboardRouter } from './routers/dashboard';
import { deliveryRouter } from './routers/delivery';
import { pricingRouter } from './routers/pricing';
import { packingRouter } from './routers/packing';

export const appRouter = router({
  customer: customerRouter,
  product: productRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
  delivery: deliveryRouter,
  pricing: pricingRouter,
  packing: packingRouter,
});

export type AppRouter = typeof appRouter;
