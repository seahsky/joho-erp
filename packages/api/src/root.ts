import { router } from './trpc';
import { customerRouter } from './routers/customer';
import { productRouter } from './routers/product';
import { orderRouter } from './routers/order';
import { dashboardRouter } from './routers/dashboard';
import { deliveryRouter } from './routers/delivery';
import { pricingRouter } from './routers/pricing';
import { packingRouter } from './routers/packing';
import { cartRouter } from './routers/cart';
import { companyRouter } from './routers/company';
import { notificationRouter } from './routers/notification';
import { userRouter } from './routers/user';

export const appRouter = router({
  customer: customerRouter,
  product: productRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
  delivery: deliveryRouter,
  pricing: pricingRouter,
  packing: packingRouter,
  cart: cartRouter,
  company: companyRouter,
  notification: notificationRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
