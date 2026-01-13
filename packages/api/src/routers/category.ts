// @ts-nocheck
import { z } from 'zod';
import { router, protectedProcedure, isAdmin } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { logCategoryCreate, logCategoryUpdate, logCategoryDelete, type AuditChange } from '../services/audit';

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
        processingLossPercentage: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
          processingLossPercentage: input.processingLossPercentage,
        },
      });

      // Audit log - MEDIUM: Category creation tracked
      await logCategoryCreate(ctx.userId, undefined, ctx.userRole, ctx.userName, category.id, {
        name: input.name,
        description: input.description,
        processingLossPercentage: input.processingLossPercentage,
      }).catch((error) => {
        console.error('Audit log failed for category create:', error);
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
        processingLossPercentage: z.number().min(0).max(100).nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Track changes for audit
      const changes: AuditChange[] = [];
      if (updates.name && updates.name !== existing.name) {
        changes.push({ field: 'name', oldValue: existing.name, newValue: updates.name });
      }
      if (updates.isActive !== undefined && updates.isActive !== existing.isActive) {
        changes.push({ field: 'isActive', oldValue: existing.isActive, newValue: updates.isActive });
      }
      if (updates.processingLossPercentage !== undefined && updates.processingLossPercentage !== existing.processingLossPercentage) {
        changes.push({ field: 'processingLossPercentage', oldValue: existing.processingLossPercentage, newValue: updates.processingLossPercentage });
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

      // Audit log - MEDIUM: Category update tracked
      await logCategoryUpdate(ctx.userId, undefined, ctx.userRole, ctx.userName, id, changes, {
        name: category.name,
      }).catch((error) => {
        console.error('Audit log failed for category update:', error);
      });

      return category;
    }),

  // Admin: Get all categories with product count (for management)
  getAllWithProductCount: isAdmin.query(async () => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return categories.map((category) => ({
      ...category,
      productCount: category._count.products,
    }));
  }),

  // Admin: Get single category by ID
  getById: isAdmin
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const category = await prisma.category.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      return {
        ...category,
        productCount: category._count.products,
      };
    }),

  // Admin: Delete category (soft delete if has products, hard delete otherwise)
  delete: isAdmin
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const category = await prisma.category.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // If category has products, soft delete (deactivate)
      if (category._count.products > 0) {
        await prisma.category.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        // Audit log
        await logCategoryDelete(ctx.userId, undefined, ctx.userRole, ctx.userName, input.id, {
          name: category.name,
          type: 'soft_delete',
          productCount: category._count.products,
        }).catch((error) => {
          console.error('Audit log failed for category delete:', error);
        });

        return { deleted: false, deactivated: true };
      }

      // Hard delete if no products
      await prisma.category.delete({
        where: { id: input.id },
      });

      // Audit log
      await logCategoryDelete(ctx.userId, undefined, ctx.userRole, ctx.userName, input.id, {
        name: category.name,
        type: 'hard_delete',
        productCount: 0,
      }).catch((error) => {
        console.error('Audit log failed for category delete:', error);
      });

      return { deleted: true, deactivated: false };
    }),
});
