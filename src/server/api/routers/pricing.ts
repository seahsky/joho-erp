import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";

export const pricingRouter = createTRPCRouter({
  // Get customer-specific pricing
  getCustomerPricing: adminProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pricing = await ctx.db.customerPricing.findMany({
        where: { customerId: input.customerId },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { product: { name: "asc" } },
      });

      return pricing;
    }),

  // Create or update customer-specific price
  setCustomerPrice: adminProcedure
    .input(
      z.object({
        customerId: z.string(),
        productId: z.string(),
        price: z.number().positive(),
        effectiveFrom: z.date().optional(),
        effectiveTo: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      // Verify customer and product exist
      const customer = await ctx.db.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      // Create customer pricing
      const pricing = await ctx.db.customerPricing.create({
        data: {
          customerId: input.customerId,
          productId: input.productId,
          price: input.price,
          effectiveFrom: input.effectiveFrom || new Date(),
          effectiveTo: input.effectiveTo,
          notes: input.notes,
          status: "active",
        },
      });

      // Create price audit log
      await ctx.db.priceAudit.create({
        data: {
          productId: input.productId,
          customerId: input.customerId,
          changeType: "CREATED",
          oldPrice: product.basePrice,
          newPrice: input.price,
          percentChange: ((input.price - product.basePrice) / product.basePrice) * 100,
          reason: input.notes || "Customer-specific pricing set",
          changedBy: user.id,
        },
      });

      return pricing;
    }),

  // Update customer price
  updateCustomerPrice: adminProcedure
    .input(
      z.object({
        id: z.string(),
        price: z.number().positive(),
        effectiveTo: z.date().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const { id, ...data } = input;

      const existingPricing = await ctx.db.customerPricing.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!existingPricing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pricing record not found" });
      }

      const pricing = await ctx.db.customerPricing.update({
        where: { id },
        data,
      });

      // Create price audit log
      await ctx.db.priceAudit.create({
        data: {
          productId: existingPricing.productId,
          customerId: existingPricing.customerId,
          changeType: "UPDATED",
          oldPrice: existingPricing.price,
          newPrice: input.price,
          percentChange: ((input.price - existingPricing.price) / existingPricing.price) * 100,
          reason: input.notes || "Customer pricing updated",
          changedBy: user.id,
        },
      });

      return pricing;
    }),

  // Delete customer price override
  deleteCustomerPrice: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      const existingPricing = await ctx.db.customerPricing.findUnique({
        where: { id: input.id },
      });

      if (!existingPricing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pricing record not found" });
      }

      await ctx.db.customerPricing.delete({
        where: { id: input.id },
      });

      // Create price audit log
      await ctx.db.priceAudit.create({
        data: {
          productId: existingPricing.productId,
          customerId: existingPricing.customerId,
          changeType: "DELETED",
          oldPrice: existingPricing.price,
          newPrice: 0,
          percentChange: -100,
          reason: "Customer pricing removed",
          changedBy: user.id,
        },
      });

      return { success: true };
    }),

  // Get price audit trail
  getPriceAudit: adminProcedure
    .input(
      z.object({
        productId: z.string().optional(),
        customerId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const audits = await ctx.db.priceAudit.findMany({
        where: {
          ...(input.productId && { productId: input.productId }),
          ...(input.customerId && { customerId: input.customerId }),
          ...(input.startDate && { createdAt: { gte: input.startDate } }),
          ...(input.endDate && { createdAt: { lte: input.endDate } }),
        },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
          changedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return audits;
    }),

  // Bulk update base prices
  bulkUpdateBasePrices: adminProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        productIds: z.array(z.string()).optional(),
        updateType: z.enum(["percentage", "fixed"]),
        value: z.number(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      // Get products to update
      const products = await ctx.db.product.findMany({
        where: {
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.productIds && { id: { in: input.productIds } }),
        },
      });

      const updates = [];

      for (const product of products) {
        const oldPrice = product.basePrice;
        let newPrice: number;

        if (input.updateType === "percentage") {
          newPrice = oldPrice * (1 + input.value / 100);
        } else {
          newPrice = input.value;
        }

        // Update product base price
        await ctx.db.product.update({
          where: { id: product.id },
          data: { basePrice: newPrice },
        });

        // Create price audit log
        await ctx.db.priceAudit.create({
          data: {
            productId: product.id,
            changeType: "UPDATED",
            oldPrice,
            newPrice,
            percentChange: ((newPrice - oldPrice) / oldPrice) * 100,
            reason: input.reason,
            changedBy: user.id,
          },
        });

        updates.push({ productId: product.id, oldPrice, newPrice });
      }

      return updates;
    }),
});
