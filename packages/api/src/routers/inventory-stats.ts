import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';

// Schema for granularity input
const granularitySchema = z.enum(['daily', 'weekly', 'monthly']);
type Granularity = z.infer<typeof granularitySchema>;

// Helper: Get date boundaries based on granularity
function getDateBoundaries(granularity: Granularity): { startDate: Date; daysInPeriod: number } {
  const now = new Date();
  switch (granularity) {
    case 'daily':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        daysInPeriod: 30,
      };
    case 'weekly':
      return {
        startDate: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000),
        daysInPeriod: 84,
      };
    case 'monthly':
      return {
        startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        daysInPeriod: 365,
      };
  }
}

// Helper: Get MongoDB date grouping expression
function getDateGroupExpression(granularity: Granularity) {
  switch (granularity) {
    case 'daily':
      return {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    case 'weekly':
      return {
        year: { $isoWeekYear: '$createdAt' },
        week: { $isoWeek: '$createdAt' },
      };
    case 'monthly':
      return {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
  }
}

// Helper: Format period label from grouped date
function formatPeriodLabel(
  grouped: { year?: number; month?: number; day?: number; week?: number },
  granularity: Granularity
): string {
  switch (granularity) {
    case 'daily':
      return `${grouped.year}-${String(grouped.month).padStart(2, '0')}-${String(grouped.day).padStart(2, '0')}`;
    case 'weekly':
      return `W${grouped.week} ${grouped.year}`;
    case 'monthly': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[(grouped.month || 1) - 1]} ${grouped.year}`;
    }
  }
}

export const inventoryStatsRouter = router({
  // ============================================================================
  // Endpoint 1: Stock Movement Trends
  // Shows stock ins vs outs over time
  // ============================================================================
  getStockMovementTrends: requirePermission('inventory:view')
    .input(z.object({ granularity: granularitySchema }))
    .query(async ({ input }) => {
      const { startDate } = getDateBoundaries(input.granularity);
      const dateGroup = getDateGroupExpression(input.granularity);

      // Get transactions grouped by period and type
      const result = (await prisma.inventoryTransaction.aggregateRaw({
        pipeline: [
          {
            $match: {
              createdAt: { $gte: { $date: startDate.toISOString() } },
            },
          },
          {
            $group: {
              _id: { ...dateGroup, type: '$type' },
              // For sales: quantity is negative (stock going out)
              // For adjustments: quantity can be positive (stock in) or negative (stock out)
              // For returns: quantity is positive (stock coming back)
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
        _id: { year: number; month: number; day?: number; week?: number; type: string };
        positiveQuantity: number;
        negativeQuantity: number;
      }>;

      // Transform to chart-friendly format
      const periodMap = new Map<string, { stockIn: number; stockOut: number }>();

      for (const item of result) {
        const period = formatPeriodLabel(item._id, input.granularity);
        if (!periodMap.has(period)) {
          periodMap.set(period, { stockIn: 0, stockOut: 0 });
        }
        const entry = periodMap.get(period)!;

        // Positive quantities are stock in, negative are stock out
        entry.stockIn += item.positiveQuantity;
        entry.stockOut += item.negativeQuantity;
      }

      return Array.from(periodMap.entries())
        .map(([period, data]) => ({
          period,
          stockIn: Math.round(data.stockIn * 10) / 10,
          stockOut: Math.round(data.stockOut * 10) / 10,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }),

  // ============================================================================
  // Endpoint 2: Inventory Value Over Time
  // Track total inventory value trends
  // ============================================================================
  getInventoryValueHistory: requirePermission('inventory:view')
    .input(z.object({ granularity: granularitySchema }))
    .query(async ({ input }) => {
      const { startDate } = getDateBoundaries(input.granularity);
      const dateGroup = getDateGroupExpression(input.granularity);

      // Get current total inventory value from batch costs (in cents)
      const currentValueResult = (await prisma.inventoryBatch.aggregateRaw({
        pipeline: [
          // Join with products to filter active products only
          {
            $lookup: {
              from: 'products',
              localField: 'productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          // Filter for active products and non-consumed batches
          {
            $match: {
              'product.status': 'active',
              isConsumed: false,
            },
          },
          // Calculate batch value and sum
          {
            $group: {
              _id: null,
              totalValue: {
                $sum: { $multiply: ['$quantityRemaining', '$costPerUnit'] },
              },
            },
          },
        ],
      })) as unknown as Array<{ totalValue: number }>;

      const currentValue = currentValueResult[0]?.totalValue || 0;

      // Get value changes from transactions using actual cost per unit
      const valueChanges = (await prisma.inventoryTransaction.aggregateRaw({
        pipeline: [
          {
            $match: {
              createdAt: { $gte: { $date: startDate.toISOString() } },
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: 'productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $group: {
              _id: dateGroup,
              valueChange: {
                $sum: {
                  $multiply: [
                    '$quantity',
                    // Use transaction's costPerUnit if available (for stock_received),
                    // otherwise use product basePrice as fallback (for adjustments/sales)
                    { $ifNull: ['$costPerUnit', '$product.basePrice'] },
                  ],
                },
              },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
        ],
      })) as unknown as Array<{
        _id: { year: number; month: number; day?: number; week?: number };
        valueChange: number;
      }>;

      // Calculate cumulative values walking backwards from current value
      const periods: { period: string; value: number }[] = [];
      let runningValue = currentValue;

      // Add current period first
      const now = new Date();
      const currentPeriodId =
        input.granularity === 'daily'
          ? { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
          : input.granularity === 'weekly'
            ? { year: now.getFullYear(), week: getISOWeek(now) }
            : { year: now.getFullYear(), month: now.getMonth() + 1 };

      periods.push({
        period: formatPeriodLabel(currentPeriodId, input.granularity),
        value: runningValue,
      });

      // Walk backwards through changes
      for (const change of valueChanges) {
        runningValue -= change.valueChange;
        periods.push({
          period: formatPeriodLabel(change._id, input.granularity),
          value: Math.max(0, runningValue), // Prevent negative values
        });
      }

      // Reverse to chronological order and remove duplicates
      const uniquePeriods = new Map<string, number>();
      for (const p of periods) {
        if (!uniquePeriods.has(p.period)) {
          uniquePeriods.set(p.period, p.value);
        }
      }

      return Array.from(uniquePeriods.entries())
        .map(([period, value]) => ({ period, value }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }),

  // ============================================================================
  // Endpoint 3: Product Turnover Metrics
  // Stock velocity, days-on-hand analysis
  // ============================================================================
  getProductTurnoverMetrics: requirePermission('inventory:view')
    .input(
      z.object({
        granularity: granularitySchema,
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const { startDate, daysInPeriod } = getDateBoundaries(input.granularity);

      const turnoverData = (await prisma.inventoryTransaction.aggregateRaw({
        pipeline: [
          {
            $match: {
              createdAt: { $gte: { $date: startDate.toISOString() } },
              type: 'sale',
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
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $project: {
              productId: { $toString: '$_id' },
              productName: '$product.name',
              productSku: '$product.sku',
              currentStock: '$product.currentStock',
              totalSold: 1,
              transactionCount: 1,
              velocity: { $divide: ['$totalSold', daysInPeriod] },
              daysOnHand: {
                $cond: [
                  { $gt: ['$totalSold', 0] },
                  {
                    $divide: [{ $multiply: ['$product.currentStock', daysInPeriod] }, '$totalSold'],
                  },
                  null,
                ],
              },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: input.limit },
        ],
      })) as unknown as Array<{
        productId: string;
        productName: string;
        productSku: string;
        currentStock: number;
        totalSold: number;
        transactionCount: number;
        velocity: number;
        daysOnHand: number | null;
      }>;

      return turnoverData;
    }),

  // ============================================================================
  // Endpoint 4: Comparison Metrics
  // Week-over-week and month-over-month comparisons
  // ============================================================================
  getComparisonMetrics: requirePermission('inventory:view')
    .input(
      z.object({
        comparisonType: z.enum(['week', 'month']),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

      if (input.comparisonType === 'week') {
        const dayOfWeek = now.getDay();
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - dayOfWeek);
        currentStart.setHours(0, 0, 0, 0);
        currentEnd = now;

        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousEnd.setMilliseconds(-1);
      } else {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = now;

        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        previousEnd.setHours(23, 59, 59, 999);
      }

      async function getMetricsForPeriod(start: Date, end: Date) {
        const result = (await prisma.inventoryTransaction.aggregateRaw({
          pipeline: [
            {
              $match: {
                createdAt: {
                  $gte: { $date: start.toISOString() },
                  $lte: { $date: end.toISOString() },
                },
              },
            },
            {
              $group: {
                _id: '$type',
                totalQuantity: { $sum: '$quantity' },
                absQuantity: { $sum: { $abs: '$quantity' } },
                count: { $sum: 1 },
              },
            },
          ],
        })) as unknown as Array<{
          _id: string;
          totalQuantity: number;
          absQuantity: number;
          count: number;
        }>;

        let stockIn = 0,
          stockOut = 0,
          transactions = 0;
        for (const r of result) {
          transactions += r.count;
          if (r._id === 'sale') {
            stockOut += r.absQuantity;
          } else if (r._id === 'return') {
            stockIn += r.absQuantity;
          } else {
            // Adjustments can be positive or negative
            if (r.totalQuantity > 0) stockIn += r.totalQuantity;
            else stockOut += Math.abs(r.totalQuantity);
          }
        }

        return {
          stockIn,
          stockOut,
          transactions,
          netMovement: stockIn - stockOut,
        };
      }

      const [current, previous] = await Promise.all([
        getMetricsForPeriod(currentStart, currentEnd),
        getMetricsForPeriod(previousStart, previousEnd),
      ]);

      function calculatePercentChange(prev: number, curr: number): number {
        if (prev === 0) return curr === 0 ? 0 : 100;
        return ((curr - prev) / prev) * 100;
      }

      return {
        current,
        previous,
        changes: {
          stockInChange: calculatePercentChange(previous.stockIn, current.stockIn),
          stockOutChange: calculatePercentChange(previous.stockOut, current.stockOut),
          transactionsChange: calculatePercentChange(previous.transactions, current.transactions),
          netMovementChange: calculatePercentChange(
            Math.abs(previous.netMovement) || 1,
            Math.abs(current.netMovement)
          ),
        },
        periodLabel:
          input.comparisonType === 'week'
            ? { current: 'This Week', previous: 'Last Week' }
            : { current: 'This Month', previous: 'Last Month' },
      };
    }),
});

// Helper function to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
