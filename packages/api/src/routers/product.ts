import { z } from 'zod';
import { router, protectedProcedure, isAdmin } from '../trpc';
import { Product, CustomerPricing, connectDB } from '@jimmy-beef/database';
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
    .query(async ({ input, ctx }) => {
      await connectDB();

      const filter: any = {};

      if (input.category) {
        filter.category = input.category;
      }

      if (input.status) {
        filter.status = input.status;
      } else {
        // By default, only show active products to customers
        filter.status = 'active';
      }

      if (input.search) {
        filter.$or = [
          { name: { $regex: input.search, $options: 'i' } },
          { sku: { $regex: input.search, $options: 'i' } },
        ];
      }

      const products = await Product.find(filter).sort({ name: 1 });

      // TODO: Fetch customer-specific pricing if user is a customer

      return products;
    }),

  // Get product by ID
  getById: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      await connectDB();

      const product = await Product.findById(input.productId);

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
      await connectDB();

      // Check if SKU already exists
      const existing = await Product.findOne({ sku: input.sku });
      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Product with this SKU already exists',
        });
      }

      const product = await Product.create(input);

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
      await connectDB();

      const { productId, ...updates } = input;

      const product = await Product.findByIdAndUpdate(productId, { $set: updates }, { new: true });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // TODO: Log to audit trail

      return product;
    }),
});
