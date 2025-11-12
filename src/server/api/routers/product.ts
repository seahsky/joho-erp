import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  // Get all products (customer view with pricing)
  getAll: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        search: z.string().optional(),
        inStockOnly: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const isCustomer = (user as any).role === "CUSTOMER";

      let customerId: string | undefined;
      if (isCustomer) {
        const customer = await ctx.db.customer.findUnique({
          where: { userId: user.id },
        });
        customerId = customer?.id;
      }

      const products = await ctx.db.product.findMany({
        where: {
          status: "active",
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { sku: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
            ],
          }),
          ...(input.inStockOnly && { stockLevel: { gt: 0 } }),
        },
        include: {
          category: true,
          customerPricing: customerId
            ? {
                where: {
                  customerId,
                  status: "active",
                  effectiveFrom: { lte: new Date() },
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: new Date() } },
                  ],
                },
                take: 1,
              }
            : false,
        },
        orderBy: { name: "asc" },
      });

      return products.map((product: any) => ({
        ...product,
        displayPrice: product.customerPricing?.[0]?.price ?? product.basePrice,
        hasCustomPrice: !!product.customerPricing?.[0],
        stockStatus:
          product.stockLevel === 0
            ? "Out of Stock"
            : product.stockLevel <= product.reorderLevel
            ? "Low Stock"
            : "In Stock",
      }));
    }),

  // Get single product
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const isCustomer = (user as any).role === "CUSTOMER";

      let customerId: string | undefined;
      if (isCustomer) {
        const customer = await ctx.db.customer.findUnique({
          where: { userId: user.id },
        });
        customerId = customer?.id;
      }

      const product = await ctx.db.product.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          customerPricing: customerId
            ? {
                where: {
                  customerId,
                  status: "active",
                  effectiveFrom: { lte: new Date() },
                  OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: new Date() } },
                  ],
                },
                take: 1,
              }
            : false,
        },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      return {
        ...product,
        displayPrice: product.customerPricing?.[0]?.price ?? product.basePrice,
        hasCustomPrice: !!product.customerPricing?.[0],
      };
    }),

  // Admin: Create product
  create: adminProcedure
    .input(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.string(),
        basePrice: z.number().positive(),
        gstApplicable: z.boolean().default(true),
        unitOfMeasure: z.string(),
        reorderLevel: z.number().default(0),
        nutritionalInfo: z.string().optional(),
        storageInstructions: z.string().optional(),
        minOrderQuantity: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingSku = await ctx.db.product.findUnique({
        where: { sku: input.sku },
      });

      if (existingSku) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Product with this SKU already exists",
        });
      }

      const product = await ctx.db.product.create({
        data: input,
      });

      return product;
    }),

  // Admin: Update product
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.string().optional(),
        basePrice: z.number().positive().optional(),
        gstApplicable: z.boolean().optional(),
        unitOfMeasure: z.string().optional(),
        reorderLevel: z.number().optional(),
        nutritionalInfo: z.string().optional(),
        storageInstructions: z.string().optional(),
        minOrderQuantity: z.number().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const product = await ctx.db.product.update({
        where: { id },
        data,
      });

      return product;
    }),

  // Admin: Delete product
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.product.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
