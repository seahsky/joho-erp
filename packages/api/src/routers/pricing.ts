import { z } from 'zod';
import { router, protectedProcedure, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { isCustomPriceValid, getEffectivePrice, validateCustomerPricing, buildPrismaOrderBy } from '@joho-erp/shared';
import { logPricingChangeWithUser, logBulkPricingImport } from '../services/audit';
import { sortInputSchema } from '../schemas';

export const pricingRouter = router({
  /**
   * Get all custom prices for a specific customer
   */
  getCustomerPrices: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        includeExpired: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      // Authorization: customers can only view their own pricing
      if (ctx.userRole === 'customer') {
        const myCustomer = await prisma.customer.findFirst({
          where: { clerkUserId: ctx.userId },
          select: { id: true },
        });
        if (!myCustomer || input.customerId !== myCustomer.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own pricing',
          });
        }
      }

      const where: any = { customerId: input.customerId };

      // Filter out expired pricing if not requested
      if (!input.includeExpired) {
        const now = new Date();
        where.OR = [
          { effectiveTo: null }, // No expiration
          { effectiveTo: { gte: now } }, // Not yet expired
        ];
      }

      const pricings = await prisma.customerPricing.findMany({
        where,
        include: {
          product: true,
          customer: {
            select: {
              businessName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return pricings.map((pricing) => ({
        ...pricing,
        isValid: isCustomPriceValid(pricing),
        effectivePriceInfo: pricing.product
          ? getEffectivePrice(pricing.product.basePrice, pricing)
          : {
              basePrice: 0,
              effectivePrice: pricing.customPrice,
              hasCustomPricing: false,
            },
      }));
    }),

  /**
   * Get all customers with custom pricing for a specific product
   */
  getProductPrices: requirePermission('pricing:view')
    .input(
      z.object({
        productId: z.string(),
        includeExpired: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const where: any = { productId: input.productId };

      // Filter out expired pricing if not requested
      if (!input.includeExpired) {
        const now = new Date();
        where.OR = [
          { effectiveTo: null }, // No expiration
          { effectiveTo: { gte: now } }, // Not yet expired
        ];
      }

      const pricings = await prisma.customerPricing.findMany({
        where,
        include: {
          customer: {
            select: {
              businessName: true,
              deliveryAddress: true,
            },
          },
          product: {
            select: {
              name: true,
              basePrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return pricings.map((pricing) => ({
        ...pricing,
        isValid: isCustomPriceValid(pricing),
        effectivePriceInfo: pricing.product
          ? getEffectivePrice(pricing.product.basePrice, pricing)
          : {
              basePrice: 0,
              effectivePrice: pricing.customPrice,
              hasCustomPricing: false,
            },
      }));
    }),

  /**
   * Get all custom pricing (with pagination, filtering, sorting, and search)
   */
  getAll: requirePermission('pricing:view')
    .input(
      z
        .object({
          customerId: z.string().optional(),
          productId: z.string().optional(),
          includeExpired: z.boolean().default(false),
          search: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(50),
        })
        .merge(sortInputSchema)
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, search, ...filters } = input;
      const where: any = {};

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.productId) {
        where.productId = filters.productId;
      }

      // Filter out expired pricing if not requested
      if (!filters.includeExpired) {
        const now = new Date();
        where.AND = [
          {
            OR: [
              { effectiveTo: null }, // No expiration
              { effectiveTo: { gte: now } }, // Not yet expired
            ],
          },
        ];
      }

      // Add search functionality
      if (search) {
        const searchCondition = {
          OR: [
            { customer: { businessName: { contains: search, mode: 'insensitive' as const } } },
            { product: { name: { contains: search, mode: 'insensitive' as const } } },
            { product: { sku: { contains: search, mode: 'insensitive' as const } } },
          ],
        };
        if (where.AND) {
          where.AND.push(searchCondition);
        } else {
          where.AND = [searchCondition];
        }
      }

      const skip = (page - 1) * limit;

      // Build orderBy from sort parameters
      const pricingSortFieldMapping: Record<string, string> = {
        customer: 'customer.businessName',
        product: 'product.name',
        customPrice: 'customPrice',
        effectiveFrom: 'effectiveFrom',
        effectiveTo: 'effectiveTo',
        createdAt: 'createdAt',
      };

      const orderBy =
        sortBy && pricingSortFieldMapping[sortBy]
          ? buildPrismaOrderBy(sortBy, sortOrder, pricingSortFieldMapping)
          : { createdAt: 'desc' as const };

      const [pricings, total] = await Promise.all([
        prisma.customerPricing.findMany({
          where,
          include: {
            customer: {
              select: {
                businessName: true,
              },
            },
            product: {
              select: {
                sku: true,
                name: true,
                basePrice: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.customerPricing.count({ where }),
      ]);

      // Filter out records with missing customer or product (orphaned records)
      const validPricings = pricings.filter((p) => p.customer && p.product);

      const totalPages = Math.ceil(total / limit);

      return {
        pricings: validPricings.map((pricing) => ({
          ...pricing,
          isValid: isCustomPriceValid(pricing),
          effectivePriceInfo: pricing.product
            ? getEffectivePrice(pricing.product.basePrice, pricing)
            : {
                basePrice: 0,
                effectivePrice: pricing.customPrice,
                hasCustomPricing: false,
              },
        })),
        total: validPricings.length,
        page,
        totalPages,
        hasMore: page < totalPages,
      };
    }),

  /**
   * Get a specific customer's price for a product (used by order creation)
   * Issue #13 fix: Customers can only query their own pricing
   */
  getCustomerProductPrice: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        productId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Authorization check: customers can only query their own pricing
      if (ctx.userRole === 'customer') {
        const myCustomer = await prisma.customer.findFirst({
          where: { clerkUserId: ctx.userId },
          select: { id: true },
        });
        if (!myCustomer || input.customerId !== myCustomer.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own pricing',
          });
        }
      }

      const pricing = await prisma.customerPricing.findFirst({
        where: {
          customerId: input.customerId,
          productId: input.productId,
        },
      });

      const product = await prisma.product.findUnique({
        where: { id: input.productId },
        select: { basePrice: true },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      return getEffectivePrice(product.basePrice, pricing);
    }),

  /**
   * Set or update custom price for a customer-product pair
   * NOTE: customPrice must be in cents (Int) not dollars
   */
  setCustomerPrice: requirePermission('pricing:edit')
    .input(
      z.object({
        customerId: z.string(),
        productId: z.string(),
        customPrice: z.number().int().positive(), // In cents (e.g., 2550 = $25.50)
        effectiveFrom: z.date().optional(),
        effectiveTo: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Validate product exists
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Validate pricing input
      const validation = validateCustomerPricing({
        customPrice: input.customPrice,
        basePrice: product.basePrice,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
      });

      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.error,
        });
      }

      // Check if pricing already exists
      const existingPricing = await prisma.customerPricing.findFirst({
        where: {
          customerId: input.customerId,
          productId: input.productId,
        },
      });

      let pricing;

      if (existingPricing) {
        // Update existing pricing
        pricing = await prisma.customerPricing.update({
          where: { id: existingPricing.id },
          data: {
            customPrice: input.customPrice,
            effectiveFrom: input.effectiveFrom || new Date(),
            effectiveTo: input.effectiveTo,
          },
          include: {
            customer: {
              select: {
                businessName: true,
              },
            },
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        });

        // Log to audit trail
        await logPricingChangeWithUser(
          ctx.userId,
          undefined, // userEmail not available in context
          ctx.userRole,
          ctx.userName,
          pricing.id,
          input.customerId,
          input.productId,
          existingPricing.customPrice,
          input.customPrice,
          'update'
        );
      } else {
        // Create new pricing
        pricing = await prisma.customerPricing.create({
          data: {
            customerId: input.customerId,
            productId: input.productId,
            customPrice: input.customPrice,
            effectiveFrom: input.effectiveFrom || new Date(),
            effectiveTo: input.effectiveTo,
          },
          include: {
            customer: {
              select: {
                businessName: true,
              },
            },
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        });

        // Log to audit trail
        await logPricingChangeWithUser(
          ctx.userId,
          undefined, // userEmail not available in context
          ctx.userRole,
          ctx.userName,
          pricing.id,
          input.customerId,
          input.productId,
          null,
          input.customPrice,
          'create'
        );
      }

      return pricing;
    }),

  /**
   * Delete custom pricing
   */
  deleteCustomerPrice: requirePermission('pricing:delete')
    .input(
      z.object({
        pricingId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const pricing = await prisma.customerPricing.findUnique({
        where: { id: input.pricingId },
        include: {
          customer: {
            select: {
              businessName: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!pricing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pricing not found',
        });
      }

      await prisma.customerPricing.delete({
        where: { id: input.pricingId },
      });

      // Log to audit trail
      await logPricingChangeWithUser(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        input.pricingId,
        pricing.customerId,
        pricing.productId,
        pricing.customPrice,
        0,
        'delete'
      );

      return { success: true, message: 'Pricing deleted successfully' };
    }),

  /**
   * Bulk import pricing from CSV data
   * NOTE: customPrice must be in cents (Int)
   */
  bulkImport: requirePermission('pricing:create')
    .input(
      z.object({
        pricings: z.array(
          z.object({
            customerAbn: z.string().optional(), // ABN to identify customer
            customerClerkId: z.string().optional(), // Or Clerk ID
            productSku: z.string(), // SKU to identify product
            customPrice: z.number().int().positive(), // In cents
            effectiveFrom: z.date().optional(),
            effectiveTo: z.date().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as { row: number; error: string }[],
      };

      for (let i = 0; i < input.pricings.length; i++) {
        const item = input.pricings[i];

        try {
          // Find customer by ABN or Clerk ID
          const customer = await prisma.customer.findFirst({
            where: item.customerAbn
              ? { abn: item.customerAbn }
              : { clerkUserId: item.customerClerkId! },
          });

          if (!customer) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: 'Customer not found',
            });
            continue;
          }

          // Find product by SKU
          const product = await prisma.product.findUnique({
            where: { sku: item.productSku },
          });

          if (!product) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: 'Product not found',
            });
            continue;
          }

          // Validate pricing
          const validation = validateCustomerPricing({
            customPrice: item.customPrice,
            basePrice: product.basePrice,
            effectiveFrom: item.effectiveFrom,
            effectiveTo: item.effectiveTo,
          });

          if (!validation.valid) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: validation.error || 'Invalid pricing',
            });
            continue;
          }

          // Upsert pricing
          await prisma.customerPricing.upsert({
            where: {
              customerId_productId: {
                customerId: customer.id,
                productId: product.id,
              },
            },
            update: {
              customPrice: item.customPrice,
              effectiveFrom: item.effectiveFrom || new Date(),
              effectiveTo: item.effectiveTo,
            },
            create: {
              customerId: customer.id,
              productId: product.id,
              customPrice: item.customPrice,
              effectiveFrom: item.effectiveFrom || new Date(),
              effectiveTo: item.effectiveTo,
            },
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Log to audit trail
      await logBulkPricingImport(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        input.pricings.length,
        results.success,
        results.failed
      );

      return results;
    }),

  /**
   * Get pricing statistics for a customer
   */
  getCustomerPricingStats: requirePermission('pricing:view')
    .input(
      z.object({
        customerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const pricings = await prisma.customerPricing.findMany({
        where: { customerId: input.customerId },
        include: {
          product: {
            select: {
              basePrice: true,
            },
          },
        },
      });

      const activePricings = pricings.filter(isCustomPriceValid);

      // Calculate total savings (all values in cents)
      let totalSavingsCents = 0;
      pricings.forEach((pricing) => {
        if (pricing.product?.basePrice !== null && pricing.product?.basePrice !== undefined) {
          const savings = pricing.product.basePrice - pricing.customPrice;
          if (savings > 0) {
            totalSavingsCents += savings;
          }
        }
      });

      return {
        totalProducts: pricings.length,
        activeProducts: activePricings.length,
        expiredProducts: pricings.length - activePricings.length,
        averageSavings: pricings.length > 0 ? Math.round(totalSavingsCents / pricings.length) : 0, // Average in cents
        totalPotentialSavings: totalSavingsCents, // Total in cents
      };
    }),
});
