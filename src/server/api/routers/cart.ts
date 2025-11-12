import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cartRouter = createTRPCRouter({
  // Get cart items for current customer
  getCart: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if ((user as any).role !== "CUSTOMER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only customers can access cart",
      });
    }

    const customer = await ctx.db.customer.findUnique({
      where: { userId: user.id },
    });

    if (!customer) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
    }

    const cartItems = await ctx.db.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        product: {
          include: {
            category: true,
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

    const items = cartItems.map((item: any) => {
      const price = item.product.customerPricing[0]?.price ?? item.product.basePrice;
      const lineTotal = price * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unitPrice: price,
        lineTotal,
        gst: item.product.gstApplicable ? lineTotal * 0.1 : 0,
      };
    });

    const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
    const gst = items.reduce((sum: number, item: any) => sum + item.gst, 0);
    const total = subtotal + gst;

    return {
      items,
      subtotal,
      gst,
      total,
    };
  }),

  // Add item to cart
  addItem: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if ((user as any).role !== "CUSTOMER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can add to cart",
        });
      }

      const customer = await ctx.db.customer.findUnique({
        where: { userId: user.id },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      // Check if product exists and has stock
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      if (product.stockLevel < input.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient stock available",
        });
      }

      // Check if item already in cart
      const existingItem = await ctx.db.cartItem.findUnique({
        where: {
          customerId_productId: {
            customerId: customer.id,
            productId: input.productId,
          },
        },
      });

      if (existingItem) {
        // Update quantity
        const cartItem = await ctx.db.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + input.quantity },
        });
        return cartItem;
      } else {
        // Create new cart item
        const cartItem = await ctx.db.cartItem.create({
          data: {
            customerId: customer.id,
            productId: input.productId,
            quantity: input.quantity,
          },
        });
        return cartItem;
      }
    }),

  // Update cart item quantity
  updateQuantity: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        quantity: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cartItem = await ctx.db.cartItem.update({
        where: { id: input.itemId },
        data: { quantity: input.quantity },
      });

      return cartItem;
    }),

  // Remove item from cart
  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cartItem.delete({
        where: { id: input.itemId },
      });

      return { success: true };
    }),

  // Clear entire cart
  clearCart: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.session.user;

    if ((user as any).role !== "CUSTOMER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only customers can clear cart",
      });
    }

    const customer = await ctx.db.customer.findUnique({
      where: { userId: user.id },
    });

    if (!customer) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
    }

    await ctx.db.cartItem.deleteMany({
      where: { customerId: customer.id },
    });

    return { success: true };
  }),
});
