import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
  // Customer: Create order from cart
  createFromCart: protectedProcedure
    .input(
      z.object({
        purchaseOrderNumber: z.string().optional(),
        deliveryInstructions: z.string().optional(),
        customerNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if ((user as any).role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can create orders",
        });
      }

      const customer = await ctx.db.customer.findUnique({
        where: { userId: user.id },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      if (customer.status !== "APPROVED" && customer.status !== "ACTIVE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account must be approved to place orders",
        });
      }

      // Get cart items
      const cartItems = await ctx.db.cartItem.findMany({
        where: { customerId: customer.id },
        include: {
          product: {
            include: {
              customerPricing: {
                where: {
                  customerId: customer.id,
                  status: "active",
                  effectiveFrom: { lte: new Date() },
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: new Date() } },
                  ],
                },
                take: 1,
              },
            },
          },
        },
      });

      if (cartItems.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cart is empty",
        });
      }

      // Check stock availability
      for (const item of cartItems) {
        if (item.product.stockLevel < item.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient stock for ${item.product.name}`,
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = cartItems.map((item: any) => {
        const price = item.product.customerPricing[0]?.price ?? item.product.basePrice;
        const lineTotal = price * item.quantity;
        subtotal += lineTotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: price,
          lineTotal,
        };
      });

      const gst = subtotal * 0.1;
      const total = subtotal + gst;

      // Check if order is after cutoff
      const cutoffTime = process.env.ORDER_CUTOFF_TIME || "14:00";
      const [cutoffHour, cutoffMinute] = cutoffTime.split(":").map(Number);
      const now = new Date();
      const cutoffToday = new Date(now);
      cutoffToday.setHours(cutoffHour!, cutoffMinute!, 0, 0);
      const afterCutoff = now > cutoffToday;

      // Calculate estimated delivery date
      let estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 1);

      if (afterCutoff) {
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 1);
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      // Create order
      const order = await ctx.db.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: "PENDING",
          deliveryStreet: customer.deliveryStreet,
          deliverySuburb: customer.deliverySuburb,
          deliveryState: customer.deliveryState,
          deliveryPostcode: customer.deliveryPostcode,
          deliveryArea: customer.deliveryArea,
          estimatedDeliveryDate,
          purchaseOrderNumber: input.purchaseOrderNumber,
          deliveryInstructions: input.deliveryInstructions,
          customerNotes: input.customerNotes,
          afterCutoff,
          subtotal,
          gst,
          total,
          items: {
            create: orderItems,
          },
          statusHistory: {
            create: {
              status: "PENDING",
              changedBy: user.id,
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Clear cart
      await ctx.db.cartItem.deleteMany({
        where: { customerId: customer.id },
      });

      // Update customer status to ACTIVE if this is first order
      if (customer.status === "APPROVED") {
        await ctx.db.customer.update({
          where: { id: customer.id },
          data: { status: "ACTIVE" },
        });
      }

      // TODO: Send order confirmation email
      // TODO: If afterCutoff, send notification to admin

      return order;
    }),

  // Customer: Get own orders
  getMyOrders: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if ((user as any).role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can view their orders",
        });
      }

      const customer = await ctx.db.customer.findUnique({
        where: { userId: user.id },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const orders = await ctx.db.order.findMany({
        where: {
          customerId: customer.id,
          ...(input.status && { status: input.status }),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { orderDate: "desc" },
      });

      return orders;
    }),

  // Get order by ID (customer can only see own, admin can see all)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const userRole = (user as any).role;

      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
        include: {
          customer: {
            include: {
              user: {
                select: {
                  email: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          statusHistory: {
            include: {
              changedByUser: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Check authorization
      if (userRole === "CUSTOMER" && order.customer.userId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own orders",
        });
      }

      return order;
    }),

  // Admin: Get all orders
  getAll: adminProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
        deliveryArea: z.string().optional(),
        afterCutoff: z.boolean().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          ...(input.status && { status: input.status }),
          ...(input.deliveryArea && { deliveryArea: input.deliveryArea }),
          ...(input.afterCutoff !== undefined && { afterCutoff: input.afterCutoff }),
          ...(input.search && {
            OR: [
              { orderNumber: { contains: input.search, mode: "insensitive" } },
              { customer: { businessName: { contains: input.search, mode: "insensitive" } } },
              { purchaseOrderNumber: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        },
        include: {
          customer: {
            include: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { orderDate: "desc" },
      });

      return orders;
    }),

  // Admin: Update order status
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const order = await ctx.db.order.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "DELIVERED" && { actualDeliveryDate: new Date() }),
          statusHistory: {
            create: {
              status: input.status,
              notes: input.notes,
              changedBy: user.id,
            },
          },
        },
      });

      // If marking as PACKED, deduct stock
      if (input.status === "PACKED") {
        const orderItems = await ctx.db.orderItem.findMany({
          where: { orderId: input.id },
          include: { product: true },
        });

        for (const item of orderItems) {
          const newStock = item.product.stockLevel - item.quantity;

          await ctx.db.product.update({
            where: { id: item.productId },
            data: { stockLevel: newStock },
          });

          await ctx.db.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: "ORDER_FULFILLMENT",
              quantity: -item.quantity,
              previousStock: item.product.stockLevel,
              newStock,
              reference: order.orderNumber,
              orderId: input.id,
              performedBy: user.id,
            },
          });
        }
      }

      // TODO: Send status update email to customer

      return order;
    }),
});
