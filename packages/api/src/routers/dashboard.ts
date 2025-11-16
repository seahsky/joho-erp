import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { Order, Customer, Product, connectDB } from '@jimmy-beef/database';

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: isAdminOrSales.query(async () => {
    await connectDB();

    const [totalOrders, pendingOrders, totalCustomers, activeDeliveries, lowStockCount] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
      Customer.countDocuments({ status: 'active' }),
      Order.countDocuments({ status: { $in: ['ready_for_delivery', 'out_for_delivery'] } }),
      Product.countDocuments({
        isLowStock: true,
        status: 'active',
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalCustomers,
      activeDeliveries,
      lowStockCount,
    };
  }),

  // Get recent orders
  getRecentOrders: isAdminOrSales
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      await connectDB();

      const orders = await Order.find()
        .sort({ orderedAt: -1 })
        .limit(input.limit)
        .select('orderNumber customerName totalAmount status orderedAt');

      return orders;
    }),

  // Get low stock items
  getLowStockItems: isAdminOrSales
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      await connectDB();

      const products = await Product.find({
        isLowStock: true,
        status: 'active',
      })
        .sort({ currentStock: 1 })
        .limit(input.limit)
        .select('name sku currentStock lowStockThreshold unit');

      return products;
    }),
});
