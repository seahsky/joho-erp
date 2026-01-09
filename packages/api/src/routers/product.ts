import { z } from 'zod';
import { router, protectedProcedure, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { getEffectivePrice, buildPrismaOrderBy, getCustomerStockStatus } from '@joho-erp/shared';
import { logProductCreated, logProductUpdated, logStockAdjustment } from '../services/audit';
import { sortInputSchema, paginationInputSchema } from '../schemas';

const productCategoryEnum = z.enum(['Beef', 'Pork', 'Chicken', 'Lamb', 'Processed']);

// Product-specific sort field mapping
const productSortFieldMapping: Record<string, string> = {
  name: 'name',
  sku: 'sku',
  basePrice: 'basePrice',
  currentStock: 'currentStock',
  category: 'category',
  status: 'status',
  createdAt: 'createdAt',
};

export const productRouter = router({
  // Get all products (with customer-specific pricing if authenticated customer)
  getAll: protectedProcedure
    .input(
      z
        .object({
          category: productCategoryEnum.optional(),
          status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
          search: z.string().optional(),
          showAll: z.boolean().optional(), // If true, show all statuses (for admin)
        })
        .merge(sortInputSchema)
        .merge(paginationInputSchema)
    )
    .query(async ({ input, ctx: _ctx }) => {
      const { page, limit, sortBy, sortOrder, showAll, ...filters } = input;
      const where: any = {};

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.status) {
        where.status = filters.status;
      } else if (!showAll) {
        // By default, only show active products to customers
        where.status = 'active';
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy from sort parameters
      const orderBy =
        sortBy && productSortFieldMapping[sortBy]
          ? buildPrismaOrderBy(sortBy, sortOrder, productSortFieldMapping)
          : { name: 'asc' as const };

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalCount = await prisma.product.count({ where });

      const products = await prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          categoryRelation: true,
        },
      });

      // Fetch customer-specific pricing if user is authenticated
      let customerId: string | null = null;

      // Try to get customer ID from clerk user ID
      if (_ctx.userId) {
        const customer = await prisma.customer.findUnique({
          where: { clerkUserId: _ctx.userId },
          select: { id: true },
        });
        customerId = customer?.id || null;
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const paginationMeta = {
        total: totalCount,
        page,
        totalPages,
        hasMore: page < totalPages,
      };

      // Determine if caller is a customer (hide exact stock counts for customers)
      const isCustomer = !_ctx.userRole || _ctx.userRole === 'customer';

      // Helper to transform product for customer (hide exact stock, show status only)
      const transformForCustomer = <T extends { currentStock: number; lowStockThreshold: number | null }>(
        product: T
      ) => {
        const { currentStock, lowStockThreshold, ...rest } = product;
        return {
          ...rest,
          stockStatus: getCustomerStockStatus(currentStock, lowStockThreshold),
          hasStock: currentStock > 0,
        };
      };

      // If customer exists, fetch their custom pricing
      if (customerId) {
        const customerPricings = await prisma.customerPricing.findMany({
          where: {
            customerId,
            productId: { in: products.map((p) => p.id) },
          },
        });

        // Map pricing to products
        const pricingMap = new Map(customerPricings.map((p) => [p.productId, p]));

        const items = products.map((product) => {
          const customPricing = pricingMap.get(product.id);
          const priceInfo = getEffectivePrice(product.basePrice, customPricing);
          const fullProduct = { ...product, ...priceInfo };

          return isCustomer ? transformForCustomer(fullProduct) : fullProduct;
        });

        return { items, ...paginationMeta };
      }

      // No customer pricing, return products with base price as effective price
      const items = products.map((product) => {
        const fullProduct = { ...product, ...getEffectivePrice(product.basePrice) };
        return isCustomer ? transformForCustomer(fullProduct) : fullProduct;
      });

      return { items, ...paginationMeta };
    }),

  // Get product by ID (with customer-specific pricing if applicable)
  getById: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input, ctx }) => {
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
        include: {
          categoryRelation: true,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Determine if caller is a customer (hide exact stock counts for customers)
      const isCustomer = !ctx.userRole || ctx.userRole === 'customer';

      // Helper to transform product for customer (hide exact stock, show status only)
      const transformForCustomer = <T extends { currentStock: number; lowStockThreshold: number | null }>(
        prod: T
      ) => {
        const { currentStock, lowStockThreshold, ...rest } = prod;
        return {
          ...rest,
          stockStatus: getCustomerStockStatus(currentStock, lowStockThreshold),
          hasStock: currentStock > 0,
        };
      };

      // Try to get customer ID and their custom pricing
      let customerId: string | null = null;
      if (ctx.userId) {
        const customer = await prisma.customer.findUnique({
          where: { clerkUserId: ctx.userId },
          select: { id: true },
        });
        customerId = customer?.id || null;
      }

      if (customerId) {
        const customPricing = await prisma.customerPricing.findFirst({
          where: {
            customerId,
            productId: input.productId,
          },
        });

        const priceInfo = getEffectivePrice(product.basePrice, customPricing);
        const fullProduct = { ...product, ...priceInfo };

        return isCustomer ? transformForCustomer(fullProduct) : fullProduct;
      }

      // No customer pricing, return product with base price
      const fullProduct = { ...product, ...getEffectivePrice(product.basePrice) };
      return isCustomer ? transformForCustomer(fullProduct) : fullProduct;
    }),

  // Admin: Create product (with optional customer-specific pricing)
  // NOTE: basePrice and customPrice must be in cents (Int)
  create: requirePermission('products:create')
    .input(
      z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: productCategoryEnum.optional(), // Deprecated: Use categoryId instead
        categoryId: z.string().optional(),
        unit: z.enum(['kg', 'piece', 'box', 'carton']),
        packageSize: z.number().positive().optional(),
        basePrice: z.number().int().positive(), // In cents (e.g., 2550 = $25.50)
        unitCost: z.number().int().positive().optional(), // In cents (e.g., 1500 = $15.00)
        applyGst: z.boolean().default(false),
        gstRate: z.number().min(0).max(100).optional(), // GST rate as percentage (e.g., 10 for 10%)
        currentStock: z.number().min(0).default(0),
        lowStockThreshold: z.number().min(0).optional(),
        status: z.enum(['active', 'discontinued', 'out_of_stock']).default('active'),
        imageUrl: z.string().url().optional(), // R2 public URL for product image
        // Optional customer-specific pricing to be created with the product
        customerPricing: z
          .array(
            z.object({
              customerId: z.string(),
              customPrice: z.number().int().positive(), // In cents
              effectiveFrom: z.date().optional(),
              effectiveTo: z.date().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { customerPricing, ...productData } = input;

      // Check if SKU already exists
      const existing = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Product with this SKU already exists',
        });
      }

      // Use transaction to create product and pricing atomically
      const result = await prisma.$transaction(async (tx) => {
        // Create the product
        const product = await tx.product.create({
          data: productData,
        });

        // Create customer pricing records if provided
        if (customerPricing && customerPricing.length > 0) {
          await tx.customerPricing.createMany({
            data: customerPricing.map((cp) => ({
              productId: product.id,
              customerId: cp.customerId,
              customPrice: cp.customPrice,
              effectiveFrom: cp.effectiveFrom || new Date(),
              effectiveTo: cp.effectiveTo || null,
            })),
          });
        }

        return {
          product,
          pricingCount: customerPricing?.length || 0,
        };
      });

      // Log to audit trail
      await logProductCreated(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        result.product.id,
        result.product.sku,
        result.product.name,
        result.product.basePrice
      );

      return result;
    }),

  // Admin: Update product (with optional customer-specific pricing)
  // NOTE: basePrice and customPrice must be in cents (Int)
  update: requirePermission('products:edit')
    .input(
      z.object({
        productId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: productCategoryEnum.optional(), // Deprecated: Use categoryId instead
        categoryId: z.string().nullish(), // null to remove category
        unit: z.enum(['kg', 'piece', 'box', 'carton']).optional(),
        packageSize: z.number().positive().optional(),
        basePrice: z.number().int().positive().optional(), // In cents
        unitCost: z.number().int().positive().nullish(), // In cents (null to remove)
        applyGst: z.boolean().optional(),
        gstRate: z.number().min(0).max(100).nullish(), // GST rate as percentage (null to remove)
        currentStock: z.number().min(0).optional(),
        lowStockThreshold: z.number().min(0).optional(),
        status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
        imageUrl: z.string().url().nullish(), // R2 public URL (null to remove)
        // Optional customer-specific pricing to update with the product
        // If provided, all existing pricing will be replaced with the new array
        customerPricing: z
          .array(
            z.object({
              customerId: z.string(),
              customPrice: z.number().int().positive(), // In cents
              effectiveFrom: z.date().optional(),
              effectiveTo: z.date().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productId, customerPricing, ...updates } = input;

      // Fetch current product for change tracking
      const currentProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!currentProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Use transaction to update product and pricing atomically
      const result = await prisma.$transaction(async (tx) => {
        // Update the product
        const product = await tx.product.update({
          where: { id: productId },
          data: updates,
        });

        // Handle customer pricing if provided
        let pricingCount = 0;
        if (customerPricing !== undefined) {
          // Delete all existing pricing for this product
          await tx.customerPricing.deleteMany({
            where: { productId },
          });

          // Create new pricing records
          if (customerPricing.length > 0) {
            await tx.customerPricing.createMany({
              data: customerPricing.map((cp) => ({
                productId,
                customerId: cp.customerId,
                customPrice: cp.customPrice,
                effectiveFrom: cp.effectiveFrom || new Date(),
                effectiveTo: cp.effectiveTo || null,
              })),
            });
            pricingCount = customerPricing.length;
          }
        }

        return { product, pricingCount };
      });

      // Build changes array for audit log
      const changes = Object.keys(updates)
        .filter((key) => {
          const typedKey = key as keyof typeof updates;
          return updates[typedKey] !== undefined && updates[typedKey] !== currentProduct[typedKey];
        })
        .map((key) => {
          const typedKey = key as keyof typeof updates;
          return {
            field: key,
            oldValue: currentProduct[typedKey],
            newValue: updates[typedKey],
          };
        });

      // Add pricing change to audit log if pricing was updated
      if (customerPricing !== undefined) {
        changes.push({
          field: 'customerPricing',
          oldValue: 'previous pricing',
          newValue: `${result.pricingCount} custom prices`,
        });
      }

      // Log to audit trail
      if (changes.length > 0) {
        await logProductUpdated(
          ctx.userId,
          undefined, // userEmail not available in context
          ctx.userRole,
          ctx.userName,
          result.product.id,
          result.product.sku,
          changes
        );
      }

      return result.product;
    }),

  // Admin: Adjust stock level (manual stock management)
  adjustStock: requirePermission('products:adjust_stock')
    .input(
      z.object({
        productId: z.string(),
        adjustmentType: z.enum([
          'stock_received',
          'stock_count_correction',
          'damaged_goods',
          'expired_stock',
        ]),
        quantity: z.number(), // Positive to add, negative to reduce
        notes: z.string().min(1, 'Notes are required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productId, adjustmentType, quantity, notes } = input;

      // Get current product
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Calculate new stock level
      const previousStock = product.currentStock;
      const newStock = previousStock + quantity;

      // Prevent negative stock
      if (newStock < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot reduce stock below zero. Current stock: ${previousStock}, requested change: ${quantity}`,
        });
      }

      // Use transaction to create inventory transaction and update product atomically
      const result = await prisma.$transaction(async (tx) => {
        // Create inventory transaction record
        await tx.inventoryTransaction.create({
          data: {
            productId,
            type: 'adjustment',
            adjustmentType,
            quantity,
            previousStock,
            newStock,
            referenceType: 'manual',
            notes,
            createdBy: ctx.userId || 'system',
          },
        });

        // Update product stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        });

        return updatedProduct;
      });

      // Audit log - HIGH: Stock adjustments must be tracked
      await logStockAdjustment(ctx.userId, undefined, ctx.userRole, ctx.userName, productId, {
        sku: product.sku,
        adjustmentType,
        previousStock,
        newStock,
        quantity,
        notes,
      }).catch((error) => {
        console.error('Audit log failed for stock adjustment:', error);
      });

      return result;
    }),

  // Admin: Get stock transaction history for a product
  getStockHistory: requirePermission('inventory:view')
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const { productId, limit, offset } = input;

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, sku: true, currentStock: true, unit: true },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Get transaction history
      const [transactions, totalCount] = await Promise.all([
        prisma.inventoryTransaction.findMany({
          where: { productId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.inventoryTransaction.count({
          where: { productId },
        }),
      ]);

      return {
        product,
        transactions,
        totalCount,
        hasMore: offset + transactions.length < totalCount,
      };
    }),
});
