import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { Order, Customer, connectDB, type IOrder, type ICustomer } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import type mongoose from 'mongoose';

export const deliveryRouter = router({
  // Get all deliveries with filtering
  getAll: isAdminOrSales
    .input(
      z.object({
        status: z
          .enum(['ready_for_delivery', 'out_for_delivery', 'delivered'])
          .optional(),
        areaTag: z.enum(['north', 'south', 'east', 'west']).optional(),
        driverId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      await connectDB();

      const filter: any = {
        status: {
          $in: input.status
            ? [input.status]
            : ['ready_for_delivery', 'out_for_delivery', 'delivered'],
        },
      };

      if (input.areaTag) {
        filter['deliveryAddress.areaTag'] = input.areaTag;
      }

      if (input.driverId) {
        filter['delivery.driverId'] = input.driverId;
      }

      if (input.dateFrom || input.dateTo) {
        filter.requestedDeliveryDate = {};
        if (input.dateFrom) filter.requestedDeliveryDate.$gte = input.dateFrom;
        if (input.dateTo) filter.requestedDeliveryDate.$lte = input.dateTo;
      }

      const skip = (input.page - 1) * input.limit;

      const [ordersRaw, total] = await Promise.all([
        Order.find(filter)
          .skip(skip)
          .limit(input.limit)
          .sort({ requestedDeliveryDate: 1, createdAt: -1 })
          .lean(),
        Order.countDocuments(filter),
      ]);

      const orders = ordersRaw as unknown as Array<IOrder & { _id: mongoose.Types.ObjectId }>;

      // Transform orders into delivery format
      const deliveries = await Promise.all(
        orders.map(async (order) => {
          const customer = (await Customer.findById(order.customerId).lean()) as (ICustomer & { _id: mongoose.Types.ObjectId }) | null;

          return {
            id: order._id.toString(),
            orderId: order.orderNumber,
            customer: order.customerName,
            address: `${order.deliveryAddress.street}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`,
            latitude: customer?.deliveryAddress.latitude,
            longitude: customer?.deliveryAddress.longitude,
            areaTag: order.deliveryAddress.areaTag,
            status: order.status,
            driver: order.delivery?.driverName || 'Unassigned',
            driverId: order.delivery?.driverId,
            estimatedTime:
              order.status === 'ready_for_delivery'
                ? 'Pending'
                : order.status === 'delivered'
                  ? 'Completed'
                  : '30 mins', // Default estimate for out_for_delivery
            items: order.items.length,
            totalAmount: order.totalAmount,
            requestedDeliveryDate: order.requestedDeliveryDate,
            deliveryInstructions: order.deliveryAddress.deliveryInstructions,
            assignedAt: order.delivery?.assignedAt,
            deliveredAt: order.delivery?.deliveredAt,
          };
        })
      );

      return {
        deliveries,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // Assign driver to delivery
  assignDriver: isAdminOrSales
    .input(
      z.object({
        orderId: z.string(),
        driverId: z.string(),
        driverName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await connectDB();

      const order = await Order.findByIdAndUpdate(
        input.orderId,
        {
          $set: {
            status: 'out_for_delivery',
            'delivery.driverId': input.driverId,
            'delivery.driverName': input.driverName,
            'delivery.assignedAt': new Date(),
          },
          $push: {
            statusHistory: {
              status: 'out_for_delivery',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: `Assigned to driver: ${input.driverName}`,
            },
          },
        },
        { new: true }
      );

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      return order;
    }),

  // Mark delivery as completed
  markDelivered: isAdminOrSales
    .input(
      z.object({
        orderId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await connectDB();

      const order = await Order.findByIdAndUpdate(
        input.orderId,
        {
          $set: {
            status: 'delivered',
            'delivery.deliveredAt': new Date(),
          },
          $push: {
            statusHistory: {
              status: 'delivered',
              changedAt: new Date(),
              changedBy: ctx.userId,
              notes: input.notes || 'Delivery completed',
            },
          },
        },
        { new: true }
      );

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      return order;
    }),

  // Get delivery statistics
  getStats: isAdminOrSales.query(async () => {
    await connectDB();

    const [readyForDelivery, outForDelivery, deliveredToday] = await Promise.all([
      Order.countDocuments({ status: 'ready_for_delivery' }),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Order.countDocuments({
        status: 'delivered',
        'delivery.deliveredAt': {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    return {
      readyForDelivery,
      outForDelivery,
      deliveredToday,
    };
  }),
});
