import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { prisma } from '@joho-erp/database';

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: isAdminOrSales.query(async () => {
    const [totalOrders, pendingOrders, totalCustomers, activeDeliveries, lowStockCount] = await Promise.all([
      // Total orders count
      prisma.order.count(),

      // Pending orders count
      prisma.order.count({
        where: {
          status: { in: ['pending', 'confirmed'] },
        },
      }),

      // Active customers count
      prisma.customer.count({
        where: { status: 'active' },
      }),

      // Active deliveries count
      prisma.order.count({
        where: {
          status: 'ready_for_delivery',
        },
      }),

      // Low stock count using raw aggregation
      // Note: Prisma doesn't support field comparison directly, so we use $queryRaw
      prisma.product.aggregateRaw({
        pipeline: [
          {
            $match: {
              status: 'active',
              lowStockThreshold: { $exists: true, $ne: null },
            },
          },
          {
            $match: {
              $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
            },
          },
          { $count: 'count' },
        ],
      }).then((result: any) => {
        const data = result as Array<{ count: number }>;
        return data[0]?.count || 0;
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
      const orders = await prisma.order.findMany({
        take: input.limit,
        orderBy: { orderedAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          totalAmount: true,
          status: true,
          orderedAt: true,
        },
      });

      return orders;
    }),

  // Get low stock items
  getLowStockItems: isAdminOrSales
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      // Using raw aggregation for field comparison
      const products = await prisma.product.aggregateRaw({
        pipeline: [
          {
            $match: {
              status: 'active',
              lowStockThreshold: { $exists: true, $ne: null },
            },
          },
          {
            $match: {
              $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
            },
          },
          { $sort: { currentStock: 1 } },
          { $limit: input.limit },
          {
            $project: {
              id: { $toString: '$_id' },
              name: 1,
              sku: 1,
              currentStock: 1,
              lowStockThreshold: 1,
              unit: 1,
            },
          },
        ],
      });

      return products as unknown as Array<{
        id: string;
        name: string;
        sku: string;
        currentStock: number;
        lowStockThreshold: number;
        unit: string;
      }>;
    }),
});
