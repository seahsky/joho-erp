import { z } from 'zod';
import { router, protectedProcedure, isAdmin } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';

export const categoryRouter = router({
  // Get all active categories (for dropdown)
  getAll: protectedProcedure.query(async () => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return categories;
  }),

  // Admin: Create a new category
  create: isAdmin
    .input(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if category with same name already exists
      const existing = await prisma.category.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Category with this name already exists',
        });
      }

      const category = await prisma.category.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });

      return category;
    }),

  // Admin: Update category
  update: isAdmin
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      // Check if category exists
      const existing = await prisma.category.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // If updating name, check for duplicates
      if (updates.name && updates.name !== existing.name) {
        const duplicate = await prisma.category.findUnique({
          where: { name: updates.name },
        });

        if (duplicate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Category with this name already exists',
          });
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: updates,
      });

      return category;
    }),
});
