import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const categoryRouter = createTRPCRouter({
  // Get all categories (public/customer accessible)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return categories;
  }),

  // Admin: Create category
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingCategory = await ctx.db.productCategory.findUnique({
        where: { name: input.name },
      });

      if (existingCategory) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Category with this name already exists",
        });
      }

      const category = await ctx.db.productCategory.create({
        data: input,
      });

      return category;
    }),

  // Admin: Update category
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const category = await ctx.db.productCategory.update({
        where: { id },
        data,
      });

      return category;
    }),

  // Admin: Delete category
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if category has products
      const productsCount = await ctx.db.product.count({
        where: { categoryId: input.id },
      });

      if (productsCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete category with associated products",
        });
      }

      await ctx.db.productCategory.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
