import { z } from 'zod';
import { router, protectedProcedure, isAdmin } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';

export const productRouter = router({
  // Get all products (with customer-specific pricing if authenticated customer)
  getAll: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx: _ctx }) => {
      const where: any = {};

      if (input.category) {
        where.category = input.category;
      }

      if (input.status) {
        where.status = input.status;
      } else {
        // By default, only show active products to customers
        where.status = 'active';
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { sku: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      // TODO: Fetch customer-specific pricing if user is a customer

      return products;
    }),

  // Get product by ID
  getById: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      return product;
    }),

  // Admin: Create product
  create: isAdmin
    .input(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.enum(['kg', 'piece', 'box', 'carton']),
        packageSize: z.number().positive().optional(),
        basePrice: z.number().positive(),
        currentStock: z.number().min(0).default(0),
        lowStockThreshold: z.number().min(0).optional(),
        status: z.enum(['active', 'discontinued', 'out_of_stock']).default('active'),
      })
    )
    .mutation(async ({ input }) => {
      // Check if SKU already exists
      const existing = await prisma.product.findUnique({
        where: { sku: input.sku },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Product with this SKU already exists',
        });
      }

      const product = await prisma.product.create({
        data: input,
      });

      // TODO: Log to audit trail

      return product;
    }),

  // Admin: Update product
  update: isAdmin
    .input(
      z.object({
        productId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.enum(['kg', 'piece', 'box', 'carton']).optional(),
        packageSize: z.number().positive().optional(),
        basePrice: z.number().positive().optional(),
        currentStock: z.number().min(0).optional(),
        lowStockThreshold: z.number().min(0).optional(),
        status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { productId, ...updates } = input;

      try {
        const product = await prisma.product.update({
          where: { id: productId },
          data: updates,
        });

        // TODO: Log to audit trail

        return product;
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }
    }),
});
