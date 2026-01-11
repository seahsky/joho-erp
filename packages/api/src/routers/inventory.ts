import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';

const COMPARISON_TYPES = ['week_over_week', 'month_over_month'] as const;

// Helper to calculate date range based on comparison type
function getComparisonDateRange(comparisonType: (typeof COMPARISON_TYPES)[number]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (comparisonType === 'week_over_week') {
    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    return {
      currentStart: startOfThisWeek,
      currentEnd: now,
      previousStart: startOfLastWeek,
      previousEnd: startOfThisWeek,
    };
  } else {
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return {
      currentStart: startOfThisMonth,
      currentEnd: now,
      previousStart: startOfLastMonth,
      previousEnd: startOfThisMonth,
    };
  }
}

export const inventoryRouter = router({
  export: router({
    // Single endpoint to get all export data based on tab
    getData: requirePermission('inventory:export')
      .input(
        z.object({
          tab: z.enum(['overview', 'trends', 'turnover', 'comparison']),
          useCurrentFilters: z.boolean(),
          filters: z
            .object({
              transactionType: z.enum(['sale', 'adjustment', 'return']).optional(),
              productSearch: z.string().optional(),
              granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
              comparisonType: z.enum(COMPARISON_TYPES).optional(),
            })
            .optional(),
        })
      )
      .query(async ({ input }) => {
        const { tab, useCurrentFilters, filters } = input;

        switch (tab) {
          case 'overview': {
            // Get inventory summary
            const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all([
              prisma.product.count({ where: { status: 'active' } }),
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
              prisma.product.count({
                where: { status: 'active', currentStock: 0 },
              }),
            ]);

            // Calculate total inventory value
            const products = await prisma.product.findMany({
              where: { status: 'active' },
              select: { currentStock: true, basePrice: true },
            });

            const totalValue = products.reduce(
              (sum, p) => sum + p.currentStock * p.basePrice,
              0
            );

            // Get category breakdown
            const categories = await prisma.category.findMany({
              where: { isActive: true },
              include: {
                products: {
                  where: { status: 'active' },
                  select: {
                    currentStock: true,
                    basePrice: true,
                    lowStockThreshold: true,
                  },
                },
              },
            });

            const categoryBreakdown = categories.map((cat) => ({
              name: cat.name,
              productCount: cat.products.length,
              totalStock: cat.products.reduce((sum, p) => sum + p.currentStock, 0),
              totalValue: cat.products.reduce(
                (sum, p) => sum + p.currentStock * p.basePrice,
                0
              ),
              lowStockCount: cat.products.filter(
                (p) => p.lowStockThreshold && p.currentStock <= p.lowStockThreshold
              ).length,
            }));

            // Get transactions with filters
            const transactionWhere: any = {};
            if (useCurrentFilters && filters?.transactionType) {
              transactionWhere.type = filters.transactionType;
            }
            if (useCurrentFilters && filters?.productSearch) {
              transactionWhere.product = {
                OR: [
                  { name: { contains: filters.productSearch, mode: 'insensitive' } },
                  { sku: { contains: filters.productSearch, mode: 'insensitive' } },
                ],
              };
            }

            const transactions = await prisma.inventoryTransaction.findMany({
              where: transactionWhere,
              take: useCurrentFilters ? 100 : 1000,
              orderBy: { createdAt: 'desc' },
              include: {
                product: {
                  select: { sku: true, name: true, unit: true },
                },
              },
            });

            return {
              summary: {
                totalValue,
                totalProducts,
                lowStockCount,
                outOfStockCount,
              },
              categories: categoryBreakdown,
              transactions: transactions.map((tx) => ({
                id: tx.id,
                createdAt: tx.createdAt,
                product: tx.product,
                type: tx.type,
                adjustmentType: tx.adjustmentType,
                quantity: tx.quantity,
                previousStock: tx.previousStock,
                newStock: tx.newStock,
                notes: tx.notes,
              })),
            };
          }

          case 'trends': {
            const granularity = filters?.granularity || 'daily';

            // Get date boundaries
            const now = new Date();
            let startDate: Date;
            switch (granularity) {
              case 'daily':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              case 'weekly':
                startDate = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
                break;
              case 'monthly':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            }

            // Get stock movement data (already aggregated)
            const dateGroupExpression =
              granularity === 'daily'
                ? {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                  }
                : granularity === 'weekly'
                  ? {
                      year: { $isoWeekYear: '$createdAt' },
                      week: { $isoWeek: '$createdAt' },
                    }
                  : {
                      year: { $year: '$createdAt' },
                      month: { $month: '$createdAt' },
                    };

            const stockMovementData = (await prisma.inventoryTransaction.aggregateRaw({
              pipeline: [
                {
                  $match: {
                    createdAt: { $gte: { $date: startDate.toISOString() } },
                  },
                },
                {
                  $group: {
                    _id: dateGroupExpression,
                    positiveQuantity: {
                      $sum: {
                        $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0],
                      },
                    },
                    negativeQuantity: {
                      $sum: {
                        $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0],
                      },
                    },
                  },
                },
                {
                  $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                    '_id.week': 1,
                    '_id.day': 1,
                  },
                },
              ],
            })) as unknown as Array<{
              _id: { year: number; month: number; day?: number; week?: number };
              positiveQuantity: number;
              negativeQuantity: number;
            }>;

            // Format stock movement
            const stockMovement = stockMovementData.map((item) => {
              let period: string;
              if (granularity === 'daily') {
                period = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
              } else if (granularity === 'weekly') {
                period = `W${item._id.week} ${item._id.year}`;
              } else {
                const months = [
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ];
                period = `${months[(item._id.month || 1) - 1]} ${item._id.year}`;
              }
              return {
                period,
                stockIn: Math.round(item.positiveQuantity * 10) / 10,
                stockOut: Math.round(item.negativeQuantity * 10) / 10,
              };
            });

            // Get inventory value history (simplified - current snapshot by date)
            // For export, we'll use product snapshots
            const products = await prisma.product.findMany({
              where: { status: 'active' },
              select: { currentStock: true, basePrice: true },
            });

            const currentTotalValue = products.reduce(
              (sum, p) => sum + p.currentStock * p.basePrice,
              0
            );

            const inventoryValue = [
              {
                period: new Date().toISOString().split('T')[0],
                totalValue: currentTotalValue,
              },
            ];

            return {
              stockMovement,
              inventoryValue,
              granularity,
            };
          }

          case 'turnover': {
            const granularity = filters?.granularity || 'daily';

            // Get date range
            const now = new Date();
            let startDate: Date;
            let daysInPeriod: number;
            switch (granularity) {
              case 'daily':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                daysInPeriod = 30;
                break;
              case 'weekly':
                startDate = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
                daysInPeriod = 84;
                break;
              case 'monthly':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                daysInPeriod = 365;
                break;
            }

            // Get sales data aggregated by product
            const salesData = (await prisma.inventoryTransaction.aggregateRaw({
              pipeline: [
                {
                  $match: {
                    type: 'sale',
                    createdAt: { $gte: { $date: startDate.toISOString() } },
                  },
                },
                {
                  $group: {
                    _id: '$productId',
                    totalSold: { $sum: { $abs: '$quantity' } },
                    transactionCount: { $sum: 1 },
                  },
                },
                {
                  $sort: { totalSold: -1 },
                },
                {
                  $limit: useCurrentFilters ? 50 : 100,
                },
              ],
            })) as unknown as Array<{
              _id: { $oid: string };
              totalSold: number;
              transactionCount: number;
            }>;

            // Enrich with product details
            const productIds = salesData.map((item) => item._id.$oid);
            const products = await prisma.product.findMany({
              where: { id: { in: productIds } },
              select: {
                id: true,
                sku: true,
                name: true,
                currentStock: true,
                unit: true,
              },
            });

            const productMap = new Map(products.map((p) => [p.id, p]));

            const turnoverMetrics = salesData
              .map((item) => {
                const product = productMap.get(item._id.$oid);
                if (!product) return null;

                const totalSold = item.totalSold;
                const velocity = totalSold / daysInPeriod;
                const daysOnHand = velocity > 0 ? product.currentStock / velocity : 9999;

                return {
                  productId: product.id,
                  sku: product.sku,
                  name: product.name,
                  unit: product.unit,
                  currentStock: product.currentStock,
                  totalSold,
                  transactionCount: item.transactionCount,
                  velocity: Math.round(velocity * 100) / 100,
                  daysOnHand: Math.round(daysOnHand),
                };
              })
              .filter((item) => item !== null);

            return {
              metrics: turnoverMetrics,
              granularity,
              periodDays: daysInPeriod,
            };
          }

          case 'comparison': {
            const comparisonType = filters?.comparisonType || 'week_over_week';
            const { currentStart, currentEnd, previousStart, previousEnd } =
              getComparisonDateRange(comparisonType);

            // Get transaction metrics for both periods
            const [currentMetrics, previousMetrics] = await Promise.all([
              prisma.inventoryTransaction.aggregateRaw({
                pipeline: [
                  {
                    $match: {
                      createdAt: {
                        $gte: { $date: currentStart.toISOString() },
                        $lte: { $date: currentEnd.toISOString() },
                      },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      stockIn: {
                        $sum: {
                          $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0],
                        },
                      },
                      stockOut: {
                        $sum: {
                          $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0],
                        },
                      },
                      transactions: { $sum: 1 },
                    },
                  },
                ],
              }),
              prisma.inventoryTransaction.aggregateRaw({
                pipeline: [
                  {
                    $match: {
                      createdAt: {
                        $gte: { $date: previousStart.toISOString() },
                        $lt: { $date: previousEnd.toISOString() },
                      },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      stockIn: {
                        $sum: {
                          $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0],
                        },
                      },
                      stockOut: {
                        $sum: {
                          $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0],
                        },
                      },
                      transactions: { $sum: 1 },
                    },
                  },
                ],
              }),
            ]);

            const current = (currentMetrics as any)[0] || { stockIn: 0, stockOut: 0, transactions: 0 };
            const previous = (previousMetrics as any)[0] || { stockIn: 0, stockOut: 0, transactions: 0 };

            const calculateChange = (curr: number, prev: number) => {
              if (prev === 0) return curr > 0 ? 100 : 0;
              return ((curr - prev) / prev) * 100;
            };

            return {
              comparisonType,
              stockIn: {
                current: Math.round(current.stockIn * 10) / 10,
                previous: Math.round(previous.stockIn * 10) / 10,
                change: calculateChange(current.stockIn, previous.stockIn),
              },
              stockOut: {
                current: Math.round(current.stockOut * 10) / 10,
                previous: Math.round(previous.stockOut * 10) / 10,
                change: calculateChange(current.stockOut, previous.stockOut),
              },
              transactions: {
                current: current.transactions,
                previous: previous.transactions,
                change: calculateChange(current.transactions, previous.transactions),
              },
              netMovement: {
                current: Math.round((current.stockIn - current.stockOut) * 10) / 10,
                previous: Math.round((previous.stockIn - previous.stockOut) * 10) / 10,
                change: calculateChange(
                  current.stockIn - current.stockOut,
                  previous.stockIn - previous.stockOut
                ),
              },
            };
          }

          default:
            throw new Error('Invalid tab');
        }
      }),
  }),

  /**
   * Get batches expiring soon (within X days)
   */
  getExpiringBatches: requirePermission('inventory:view')
    .input(
      z.object({
        daysThreshold: z.number().int().positive().default(7),
        includeExpired: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const { daysThreshold, includeExpired } = input;

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const where: any = {
        expiryDate: { not: null },
        isConsumed: false,
        quantityRemaining: { gt: 0 },
      };

      if (includeExpired) {
        where.expiryDate.lte = thresholdDate;
      } else {
        where.AND = [
          { expiryDate: { gt: new Date() } },
          { expiryDate: { lte: thresholdDate } },
        ];
      }

      const batches = await prisma.inventoryBatch.findMany({
        where,
        include: {
          product: {
            select: { id: true, sku: true, name: true, unit: true },
          },
        },
        orderBy: { expiryDate: 'asc' },
      });

      const now = new Date();
      const enrichedBatches = batches.map((batch) => ({
        ...batch,
        daysUntilExpiry: Math.ceil(
          (batch.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
        isExpired: batch.expiryDate! < now,
        totalValue: batch.quantityRemaining * batch.costPerUnit,
      }));

      return {
        batches: enrichedBatches,
        summary: {
          totalBatches: enrichedBatches.length,
          totalValue: enrichedBatches.reduce((sum, b) => sum + b.totalValue, 0),
          expiredCount: enrichedBatches.filter((b) => b.isExpired).length,
        },
      };
    }),

  /**
   * Get all batches for a specific product
   */
  getProductBatches: requirePermission('inventory:view')
    .input(
      z.object({
        productId: z.string(),
        includeConsumed: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const batches = await prisma.inventoryBatch.findMany({
        where: {
          productId: input.productId,
          isConsumed: input.includeConsumed ? undefined : false,
        },
        include: {
          consumptions: {
            take: 10,
            orderBy: { consumedAt: 'desc' },
          },
        },
        orderBy: { receivedAt: 'asc' },
      });

      return batches.map((batch) => ({
        ...batch,
        totalValue: batch.quantityRemaining * batch.costPerUnit,
        utilizationRate:
          batch.initialQuantity > 0
            ? ((batch.initialQuantity - batch.quantityRemaining) /
                batch.initialQuantity) *
              100
            : 0,
      }));
    }),
});
