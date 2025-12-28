import { router } from './trpc';
import { categoryRouter } from './routers/category';
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
import { uploadRouter } from './routers/upload';
import { xeroRouter } from './routers/xero';
import { permissionRouter } from './routers/permission';
import { smsRouter } from './routers/sms';

export const appRouter = router({
  category: categoryRouter,
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
  upload: uploadRouter,
  xero: xeroRouter,
  permission: permissionRouter,
  sms: smsRouter,
});

export type AppRouter = typeof appRouter;
