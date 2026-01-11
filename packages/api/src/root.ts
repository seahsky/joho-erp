import { router } from './trpc';
import { areaRouter } from './routers/area';
import { auditRouter } from './routers/audit';
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
import { inventoryStatsRouter } from './routers/inventory-stats';
import { inventoryRouter } from './routers/inventory';

export const appRouter = router({
  area: areaRouter,
  audit: auditRouter,
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
  inventoryStats: inventoryStatsRouter,
  inventory: inventoryRouter,
});

export type AppRouter = typeof appRouter;
