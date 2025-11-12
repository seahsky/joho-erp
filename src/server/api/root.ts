import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";
import { productRouter } from "~/server/api/routers/product";
import { customerRouter } from "~/server/api/routers/customer";
import { cartRouter } from "~/server/api/routers/cart";
import { orderRouter } from "~/server/api/routers/order";
import { categoryRouter } from "~/server/api/routers/category";
import { inventoryRouter } from "~/server/api/routers/inventory";
import { pricingRouter } from "~/server/api/routers/pricing";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  product: productRouter,
  customer: customerRouter,
  cart: cartRouter,
  order: orderRouter,
  category: categoryRouter,
  inventory: inventoryRouter,
  pricing: pricingRouter,
});

export type AppRouter = typeof appRouter;
