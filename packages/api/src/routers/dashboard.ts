import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: requirePermission('dashboard:view').query(async () => {
    const [totalOrders, pendingOrders, totalCustomers, activeDeliveries, lowStockCount] = await Promise.all([
      // Total orders count
      prisma.order.count(),

      // Active orders count (awaiting approval or confirmed)
      prisma.order.count({
        where: {
          status: { in: ['awaiting_approval', 'confirmed'] },
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
  getRecentOrders: requirePermission('dashboard:view')
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
  getLowStockItems: requirePermission('dashboard:view')
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

  // ============================================================================
  // INVENTORY DASHBOARD ENDPOINTS
  // ============================================================================

  // Get inventory summary statistics
  getInventorySummary: requirePermission('inventory:view').query(async () => {
    const [
      totalProducts,
      outOfStockCount,
      lowStockCountResult,
      inventoryValueResult,
    ] = await Promise.all([
      // Total active products count
      prisma.product.count({
        where: { status: 'active' },
      }),

      // Out of stock count
      prisma.product.count({
        where: {
          status: 'active',
          currentStock: 0,
        },
      }),

      // Low stock count (using raw aggregation for field comparison)
      prisma.product.aggregateRaw({
        pipeline: [
          {
            $match: {
              status: 'active',
              lowStockThreshold: { $exists: true, $ne: null },
              currentStock: { $gt: 0 },
            },
          },
          {
            $match: {
              $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
            },
          },
          { $count: 'count' },
        ],
      }).then((result: unknown) => {
        const data = result as Array<{ count: number }>;
        return data[0]?.count || 0;
      }),

      // Total inventory value (currentStock * basePrice, in cents)
      prisma.product.aggregateRaw({
        pipeline: [
          {
            $match: {
              status: 'active',
            },
          },
          {
            $group: {
              _id: null,
              totalValue: {
                $sum: { $multiply: ['$currentStock', '$basePrice'] },
              },
            },
          },
        ],
      }).then((result: unknown) => {
        const data = result as Array<{ totalValue: number }>;
        return data[0]?.totalValue || 0;
      }),
    ]);

    return {
      totalProducts,
      outOfStockCount,
      lowStockCount: lowStockCountResult,
      totalValue: inventoryValueResult, // in cents
    };
  }),

  // Get inventory breakdown by category
  getInventoryByCategory: requirePermission('inventory:view').query(async () => {
    const categoryBreakdown = await prisma.product.aggregateRaw({
      pipeline: [
        {
          $match: {
            status: 'active',
          },
        },
        {
          $group: {
            _id: '$category',
            productCount: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$basePrice'] } },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$lowStockThreshold', null] },
                      { $lte: ['$currentStock', '$lowStockThreshold'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            category: '$_id',
            productCount: 1,
            totalStock: 1,
            totalValue: 1,
            lowStockCount: 1,
            _id: 0,
          },
        },
        { $sort: { category: 1 } },
      ],
    });

    return categoryBreakdown as unknown as Array<{
      category: string;
      productCount: number;
      totalStock: number;
      totalValue: number;
      lowStockCount: number;
    }>;
  }),

  // Get inventory transactions with filters
  getInventoryTransactions: requirePermission('inventory:view')
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        type: z.enum(['sale', 'adjustment', 'return']).optional(),
        adjustmentType: z
          .enum(['stock_received', 'stock_count_correction', 'damaged_goods', 'expired_stock'])
          .optional(),
        productId: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const { dateFrom, dateTo, type, adjustmentType, productId, search, limit, offset } = input;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) (where.createdAt as Record<string, Date>).gte = dateFrom;
        if (dateTo) (where.createdAt as Record<string, Date>).lte = dateTo;
      }

      if (type) {
        where.type = type;
      }

      if (adjustmentType) {
        where.adjustmentType = adjustmentType;
      }

      if (productId) {
        where.productId = productId;
      }

      // Add search functionality for product name or SKU
      if (search) {
        where.product = {
          is: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          },
        };
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.inventoryTransaction.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.inventoryTransaction.count({ where }),
      ]);

      return {
        transactions: transactions.map((tx) => ({
          id: tx.id,
          productId: tx.productId,
          productName: tx.product.name,
          productSku: tx.product.sku,
          productUnit: tx.product.unit,
          type: tx.type,
          adjustmentType: tx.adjustmentType,
          quantity: tx.quantity,
          previousStock: tx.previousStock,
          newStock: tx.newStock,
          notes: tx.notes,
          createdBy: tx.createdBy,
          createdAt: tx.createdAt,
        })),
        totalCount,
        hasMore: offset + transactions.length < totalCount,
      };
    }),
});
