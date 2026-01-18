import { z } from 'zod';
import { router, protectedProcedure, requirePermission, requireAnyPermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { getEffectivePrice, buildPrismaOrderBy, getCustomerStockStatus, calculateSubproductStock, calculateAllSubproductStocksWithInheritance, isSubproduct, getEffectiveLossPercentage } from '@joho-erp/shared';
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

/**
 * Helper to recalculate and update all subproduct stocks after parent stock changes.
 * @param parentId - The parent product ID
 * @param parentStock - The new parent stock level
 * @param tx - Optional Prisma transaction client
 */
async function updateSubproductStocks(
  parentId: string,
  parentStock: number,
  parentLossPercentage: number | null | undefined,
  tx?: any
): Promise<void> {
  const db = tx || prisma;

  // Find all subproducts of this parent
  const subproducts = await db.product.findMany({
    where: { parentProductId: parentId },
    select: { id: true, parentProductId: true, estimatedLossPercentage: true },
  });

  if (subproducts.length === 0) return;

  // Calculate new stocks for all subproducts with inheritance support
  const updatedStocks = calculateAllSubproductStocksWithInheritance(
    parentStock,
    parentLossPercentage,
    subproducts
  );

  // Update each subproduct's stock
  for (const { id, newStock } of updatedStocks) {
    await db.product.update({
      where: { id },
      data: { currentStock: newStock },
    });
  }
}

export const productRouter = router({
  // Get all products (with customer-specific pricing if authenticated customer)
  getAll: protectedProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
          search: z.string().optional(),
          showAll: z.boolean().optional(), // If true, show all statuses (for admin)
          includeSubproducts: z.boolean().optional().default(true), // Include nested subproducts (default true)
          onlyParents: z.boolean().optional().default(true), // Only fetch parent products at top level (default true)
        })
        .merge(sortInputSchema)
        .merge(paginationInputSchema)
    )
    .query(async ({ input, ctx: _ctx }) => {
      const { page, limit, sortBy, sortOrder, showAll, includeSubproducts, onlyParents, ...filters } = input;
      const where: any = {};

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
        where.categoryRelation = { isActive: true }; // Only show products with active categories
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

      // By default, only fetch top-level products (not subproducts)
      // Subproducts will be included nested under their parents
      if (onlyParents) {
        where.parentProductId = null;
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
          // Include subproducts nested under their parent
          ...(includeSubproducts && {
            subProducts: {
              include: {
                categoryRelation: true,
              },
              orderBy: { name: 'asc' },
            },
          }),
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
        // Collect all product IDs including subproducts for pricing lookup
        const allProductIds = products.flatMap((p) => [
          p.id,
          ...(p.subProducts?.map((sub: any) => sub.id) || [])
        ]);

        const customerPricings = await prisma.customerPricing.findMany({
          where: {
            customerId,
            productId: { in: allProductIds },
          },
        });

        // Map pricing to products
        const pricingMap = new Map(customerPricings.map((p) => [p.productId, p]));

        const items = products.map((product) => {
          const customPricing = pricingMap.get(product.id);
          // Pass GST options from product to calculate GST-inclusive price
          const gstOptions = { applyGst: product.applyGst, gstRate: product.gstRate };
          const priceInfo = getEffectivePrice(product.basePrice, customPricing, gstOptions);

          // Transform subProducts if present
          const transformedSubProducts = product.subProducts?.map((sub: any) => {
            const subCustomPricing = pricingMap.get(sub.id);
            const subGstOptions = { applyGst: sub.applyGst, gstRate: sub.gstRate };
            const subPriceInfo = getEffectivePrice(sub.basePrice, subCustomPricing, subGstOptions);
            const fullSub = { ...sub, ...subPriceInfo };
            return isCustomer ? transformForCustomer(fullSub) : fullSub;
          });

          const fullProduct = {
            ...product,
            ...priceInfo,
            ...(transformedSubProducts && { subProducts: transformedSubProducts })
          };
          return isCustomer ? transformForCustomer(fullProduct) : fullProduct;
        });

        return { items, ...paginationMeta };
      }

      // No customer pricing, return products with base price as effective price
      const items = products.map((product) => {
        // Pass GST options from product to calculate GST-inclusive price
        const gstOptions = { applyGst: product.applyGst, gstRate: product.gstRate };

        // Transform subProducts if present (no customer pricing in this branch)
        const transformedSubProducts = product.subProducts?.map((sub: any) => {
          const subGstOptions = { applyGst: sub.applyGst, gstRate: sub.gstRate };
          const fullSub = { ...sub, ...getEffectivePrice(sub.basePrice, undefined, subGstOptions) };
          return isCustomer ? transformForCustomer(fullSub) : fullSub;
        });

        const fullProduct = {
          ...product,
          ...getEffectivePrice(product.basePrice, undefined, gstOptions),
          ...(transformedSubProducts && { subProducts: transformedSubProducts })
        };
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

      // GST options from product
      const gstOptions = { applyGst: product.applyGst, gstRate: product.gstRate };

      if (customerId) {
        const customPricing = await prisma.customerPricing.findFirst({
          where: {
            customerId,
            productId: input.productId,
          },
        });

        const priceInfo = getEffectivePrice(product.basePrice, customPricing, gstOptions);
        const fullProduct = { ...product, ...priceInfo };

        return isCustomer ? transformForCustomer(fullProduct) : fullProduct;
      }

      // No customer pricing, return product with base price
      const fullProduct = { ...product, ...getEffectivePrice(product.basePrice, undefined, gstOptions) };
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
        estimatedLossPercentage: z.number().min(0).max(100).optional(), // Processing loss percentage (0-100)
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
        applyGst: z.boolean().optional(),
        gstRate: z.number().min(0).max(100).nullish(), // GST rate as percentage (null to remove)
        currentStock: z.number().min(0).optional(),
        lowStockThreshold: z.number().min(0).optional(),
        status: z.enum(['active', 'discontinued', 'out_of_stock']).optional(),
        imageUrl: z.string().url().nullish(), // R2 public URL (null to remove)
        estimatedLossPercentage: z.number().min(0).max(100).nullish(), // Processing loss percentage (0-100, null to remove)
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
        include: { parentProduct: true },
      });

      if (!currentProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Subproduct-specific restrictions
      if (isSubproduct(currentProduct)) {
        // Cannot change unit for subproducts (must match parent)
        if (updates.unit && updates.unit !== currentProduct.unit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot change unit for subproducts. Unit must match parent product.',
          });
        }

        // Cannot directly change currentStock for subproducts (it's calculated)
        if (updates.currentStock !== undefined) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot directly change subproduct stock. Adjust the parent product instead.',
          });
        }

        // If loss percentage changes (including switching to/from inheritance), recalculate stock
        if (updates.estimatedLossPercentage !== undefined &&
            updates.estimatedLossPercentage !== currentProduct.estimatedLossPercentage &&
            currentProduct.parentProduct) {
          const effectiveLoss = getEffectiveLossPercentage(
            updates.estimatedLossPercentage,
            currentProduct.parentProduct.estimatedLossPercentage
          );
          updates.currentStock = calculateSubproductStock(
            currentProduct.parentProduct.currentStock,
            effectiveLoss
          );
        }
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

      // Cascade loss percentage changes to inheriting subproducts
      // This happens when a parent product's loss rate changes
      if (!isSubproduct(currentProduct) && 
          updates.estimatedLossPercentage !== undefined &&
          updates.estimatedLossPercentage !== currentProduct.estimatedLossPercentage) {
        // Update all inheriting subproducts (those with null estimatedLossPercentage)
        await updateSubproductStocks(
          productId,
          result.product.currentStock,
          updates.estimatedLossPercentage
        );
      }

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
  adjustStock: requireAnyPermission(['products:adjust_stock', 'inventory:adjust'])
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
        // NEW: Required for stock_received
        costPerUnit: z.number().int().positive().optional(), // In cents
        expiryDate: z.date().optional(),
        // NEW: Enhanced traceability and compliance fields
        supplierInvoiceNumber: z.string().max(100).optional(),
        stockInDate: z.date().optional(),
        mtvNumber: z.string().max(50).optional(),
        vehicleTemperature: z.number().optional(),
        supplierId: z.string().optional(), // Optional supplier reference
      })
        .refine(
          (data) => {
            // If stock_received, costPerUnit is REQUIRED
            if (data.adjustmentType === 'stock_received') {
              return data.costPerUnit !== undefined;
            }
            return true;
          },
          {
            message: 'costPerUnit is required when adjustmentType is stock_received',
            path: ['costPerUnit'],
          }
        )
        .refine(
          (data) => {
            // expiryDate must be in future if provided
            if (data.expiryDate) {
              return data.expiryDate > new Date();
            }
            return true;
          },
          {
            message: 'expiryDate must be in the future',
            path: ['expiryDate'],
          }
        )
        .refine(
          (data) => {
            // If stock_received, stockInDate is REQUIRED
            if (data.adjustmentType === 'stock_received') {
              return data.stockInDate !== undefined;
            }
            return true;
          },
          {
            message: 'stockInDate is required when adjustmentType is stock_received',
            path: ['stockInDate'],
          }
        )
        .refine(
          (data) => {
            // stockInDate cannot be in the future
            if (data.stockInDate) {
              return data.stockInDate <= new Date();
            }
            return true;
          },
          {
            message: 'stockInDate cannot be in the future',
            path: ['stockInDate'],
          }
        )
        .refine(
          (data) => {
            // Vehicle temperature must be within valid range
            if (data.vehicleTemperature !== undefined) {
              return data.vehicleTemperature >= -30 && data.vehicleTemperature <= 25;
            }
            return true;
          },
          {
            message: 'Vehicle temperature must be between -30°C and 25°C',
            path: ['vehicleTemperature'],
          }
        )
    )
    .mutation(async ({ input, ctx }) => {
      const { productId, adjustmentType, quantity, notes, costPerUnit, expiryDate, supplierInvoiceNumber, stockInDate, mtvNumber, vehicleTemperature, supplierId } = input;

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

      // Reject stock adjustments on subproducts - they have virtual stock from parent
      if (isSubproduct(product)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot adjust subproduct stock directly. Adjust the parent product instead.',
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

      // Use transaction to create inventory transaction, batch, and update product atomically
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create inventory transaction record
        const transaction = await tx.inventoryTransaction.create({
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
            // NEW: Store cost and expiry for stock_received
            costPerUnit: adjustmentType === 'stock_received' ? costPerUnit : null,
            expiryDate: adjustmentType === 'stock_received' ? expiryDate : null,
          },
        });

        // 2. If receiving stock (positive quantity): Create InventoryBatch
        if (adjustmentType === 'stock_received' && quantity > 0) {
          await tx.inventoryBatch.create({
            data: {
              productId,
              quantityRemaining: quantity,
              initialQuantity: quantity,
              costPerUnit: costPerUnit!,
              receivedAt: new Date(),
              expiryDate: expiryDate || null,
              receiveTransactionId: transaction.id,
              notes,
              // NEW: Traceability and compliance fields
              supplierInvoiceNumber: supplierInvoiceNumber || null,
              stockInDate: stockInDate || null,
              mtvNumber: mtvNumber || null,
              vehicleTemperature: vehicleTemperature || null,
              supplierId: supplierId || null,
            },
          });
        }

        // 3. If reducing stock (negative quantity): Consume via FIFO
        if (quantity < 0) {
          const { consumeStock } = await import('../services/inventory-batch');
          const result = await consumeStock(
            productId,
            Math.abs(quantity),
            transaction.id,
            undefined,
            undefined,
            tx
          );

          // Log expiry warnings if any
          if (result.expiryWarnings.length > 0) {
            console.warn(
              `Expiry warnings for product ${product.sku}:`,
              result.expiryWarnings
            );
          }
        }

        // 4. Update product stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        });

        // 5. Recalculate all subproduct stocks after parent stock change
        await updateSubproductStocks(productId, newStock, product.estimatedLossPercentage, tx);

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

  // Admin: Process stock (convert raw materials to processed products)
  processStock: requireAnyPermission(['products:adjust_stock', 'inventory:adjust'])
    .input(
      z.object({
        sourceProductId: z.string(),
        targetProductId: z.string(),
        quantityToProcess: z.number().positive(),
        costPerUnit: z.number().int().positive(), // In cents - cost for target product
        expiryDate: z.date().optional(),
        notes: z.string().optional(),
      })
        .refine(
          (data) => {
            // Source and target must be different
            return data.sourceProductId !== data.targetProductId;
          },
          {
            message: 'Source and target products must be different',
            path: ['targetProductId'],
          }
        )
    )
    .mutation(async ({ input, ctx }) => {
      const { sourceProductId, targetProductId, quantityToProcess, costPerUnit, expiryDate, notes } = input;

      // Get both products
      const [sourceProduct, targetProduct] = await Promise.all([
        prisma.product.findUnique({ where: { id: sourceProductId } }),
        prisma.product.findUnique({ where: { id: targetProductId } }),
      ]);

      if (!sourceProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source product not found',
        });
      }

      if (!targetProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target product not found',
        });
      }

      // Check sufficient source stock
      if (sourceProduct.currentStock < quantityToProcess) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient stock in source product. Available: ${sourceProduct.currentStock}, requested: ${quantityToProcess}`,
        });
      }

      // Calculate output quantity based on target's estimated loss percentage
      const lossPercentage = targetProduct.estimatedLossPercentage || 0;
      const outputQty = parseFloat((quantityToProcess * (1 - lossPercentage / 100)).toFixed(2));

      // Validate output is not zero
      if (outputQty <= 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Output quantity would be zero or negative. Check loss percentage configuration.',
        });
      }

      // Use transaction to process stock atomically
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create source InventoryTransaction (consumption)
        const sourceTransaction = await tx.inventoryTransaction.create({
          data: {
            productId: sourceProductId,
            type: 'adjustment',
            adjustmentType: 'damaged_goods', // Using damaged_goods as proxy for processing
            quantity: -quantityToProcess,
            previousStock: sourceProduct.currentStock,
            newStock: sourceProduct.currentStock - quantityToProcess,
            referenceType: 'manual',
            notes: `Processed to ${targetProduct.name} (${targetProduct.sku})${notes ? ' - ' + notes : ''}`,
            createdBy: ctx.userId || 'system',
          },
        });

        // 2. Consume from source batches using FIFO
        const { consumeStock } = await import('../services/inventory-batch');
        const consumptionResult = await consumeStock(
          sourceProductId,
          quantityToProcess,
          sourceTransaction.id,
          undefined,
          undefined,
          tx
        );

        // 3. Update source product stock
        await tx.product.update({
          where: { id: sourceProductId },
          data: { currentStock: { decrement: quantityToProcess } },
        });

        // 4. Create target InventoryTransaction (receipt)
        const targetTransaction = await tx.inventoryTransaction.create({
          data: {
            productId: targetProductId,
            type: 'adjustment',
            adjustmentType: 'stock_received',
            quantity: outputQty,
            previousStock: targetProduct.currentStock,
            newStock: targetProduct.currentStock + outputQty,
            referenceType: 'manual',
            costPerUnit: costPerUnit,
            expiryDate: expiryDate || null,
            notes: `Processed from ${sourceProduct.name} (${sourceProduct.sku})${notes ? ' - ' + notes : ''}`,
            createdBy: ctx.userId || 'system',
          },
        });

        // 5. Create InventoryBatch for target product
        await tx.inventoryBatch.create({
          data: {
            productId: targetProductId,
            initialQuantity: outputQty,
            quantityRemaining: outputQty,
            costPerUnit: costPerUnit,
            receivedAt: new Date(),
            expiryDate: expiryDate || null,
            receiveTransactionId: targetTransaction.id,
            notes: `Processed from ${sourceProduct.name} - Source COGS: $${(consumptionResult.totalCost / 100).toFixed(2)}`,
          },
        });

        // 6. Update target product stock
        await tx.product.update({
          where: { id: targetProductId },
          data: { currentStock: { increment: outputQty } },
        });

        return {
          sourceTransaction,
          targetTransaction,
          quantityProcessed: quantityToProcess,
          quantityProduced: outputQty,
          lossPercentage,
          sourceCOGS: consumptionResult.totalCost,
          expiryWarnings: consumptionResult.expiryWarnings,
        };
      });

      // Audit logs for both products
      await Promise.all([
        logStockAdjustment(ctx.userId, undefined, ctx.userRole, ctx.userName, sourceProductId, {
          sku: sourceProduct.sku,
          adjustmentType: 'damaged_goods',
          previousStock: sourceProduct.currentStock,
          newStock: sourceProduct.currentStock - quantityToProcess,
          quantity: -quantityToProcess,
          notes: `Processed to ${targetProduct.name}`,
        }).catch((error) => {
          console.error('Audit log failed for source product:', error);
        }),
        logStockAdjustment(ctx.userId, undefined, ctx.userRole, ctx.userName, targetProductId, {
          sku: targetProduct.sku,
          adjustmentType: 'stock_received',
          previousStock: targetProduct.currentStock,
          newStock: targetProduct.currentStock + outputQty,
          quantity: outputQty,
          notes: `Processed from ${sourceProduct.name}`,
        }).catch((error) => {
          console.error('Audit log failed for target product:', error);
        }),
      ]);

      return {
        success: true,
        sourceProduct: {
          id: sourceProduct.id,
          name: sourceProduct.name,
          sku: sourceProduct.sku,
          newStock: sourceProduct.currentStock - quantityToProcess,
        },
        targetProduct: {
          id: targetProduct.id,
          name: targetProduct.name,
          sku: targetProduct.sku,
          newStock: targetProduct.currentStock + outputQty,
        },
        quantityProcessed: result.quantityProcessed,
        quantityProduced: result.quantityProduced,
        lossPercentage: result.lossPercentage,
        sourceCOGS: result.sourceCOGS,
        expiryWarnings: result.expiryWarnings,
      };
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

  // Admin: Create subproduct (derived from parent product with calculated virtual stock)
  // NOTE: basePrice and customPrice must be in cents (Int)
  createSubproduct: requirePermission('products:create')
    .input(
      z.object({
        parentProductId: z.string(), // Required: the parent product ID
        sku: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.string().optional(), // Can differ from parent
        basePrice: z.number().int().positive(), // In cents
        applyGst: z.boolean().default(false),
        gstRate: z.number().min(0).max(100).optional(),
        estimatedLossPercentage: z.number().min(0).max(99).nullish(), // Optional: loss percentage 0-99% (null = inherit from parent)
        imageUrl: z.string().url().optional(),
        // Optional customer-specific pricing
        customerPricing: z
          .array(
            z.object({
              customerId: z.string(),
              customPrice: z.number().int().positive(),
              effectiveFrom: z.date().optional(),
              effectiveTo: z.date().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { parentProductId, customerPricing, estimatedLossPercentage, ...subproductData } = input;

      // 1. Validate parent product exists
      const parentProduct = await prisma.product.findUnique({
        where: { id: parentProductId },
        include: { subProducts: true },
      });

      if (!parentProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent product not found',
        });
      }

      // 2. Validate parent is not itself a subproduct (single-level nesting only)
      if (isSubproduct(parentProduct)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create subproduct of a subproduct',
        });
      }

      // 3. Check if SKU already exists
      const existingSku = await prisma.product.findUnique({
        where: { sku: subproductData.sku },
      });

      if (existingSku) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'SKU already exists',
        });
      }

      // 4. Calculate initial virtual stock from parent using effective loss percentage
      const effectiveLossPercentage = getEffectiveLossPercentage(
        estimatedLossPercentage,
        parentProduct.estimatedLossPercentage
      );
      const initialStock = calculateSubproductStock(parentProduct.currentStock, effectiveLossPercentage);

      // Use transaction to create subproduct and pricing atomically
      const result = await prisma.$transaction(async (tx) => {
        // Create the subproduct
        const subproduct = await tx.product.create({
          data: {
            ...subproductData,
            parentProductId,
            estimatedLossPercentage,
            // Inherit unit from parent (enforced)
            unit: parentProduct.unit,
            // Set calculated virtual stock
            currentStock: initialStock,
            // Default status
            status: 'active',
          },
        });

        // Create customer pricing records if provided
        if (customerPricing && customerPricing.length > 0) {
          await tx.customerPricing.createMany({
            data: customerPricing.map((cp) => ({
              productId: subproduct.id,
              customerId: cp.customerId,
              customPrice: cp.customPrice,
              effectiveFrom: cp.effectiveFrom || new Date(),
              effectiveTo: cp.effectiveTo || null,
            })),
          });
        }

        return {
          subproduct,
          pricingCount: customerPricing?.length || 0,
        };
      });

      // Log to audit trail
      await logProductCreated(
        ctx.userId,
        undefined,
        ctx.userRole,
        ctx.userName,
        result.subproduct.id,
        result.subproduct.sku,
        result.subproduct.name,
        result.subproduct.basePrice
      );

      return {
        product: result.subproduct,
        pricingCount: result.pricingCount,
        parentProduct: {
          id: parentProduct.id,
          name: parentProduct.name,
          sku: parentProduct.sku,
        },
      };
    }),

  // Admin: Delete product (with cascade for subproducts)
  delete: requirePermission('products:delete')
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { productId } = input;

      // Get product with subproducts
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { subProducts: true },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Use transaction to delete product and subproducts atomically
      // MongoDB doesn't support cascade, so we handle it manually
      await prisma.$transaction(async (tx) => {
        // 1. Delete all subproducts first
        if (product.subProducts.length > 0) {
          // Delete customer pricing for subproducts
          await tx.customerPricing.deleteMany({
            where: { productId: { in: product.subProducts.map((sp) => sp.id) } },
          });

          // Delete subproducts
          await tx.product.deleteMany({
            where: { parentProductId: productId },
          });
        }

        // 2. Delete customer pricing for the product
        await tx.customerPricing.deleteMany({
          where: { productId },
        });

        // 3. Delete the product
        await tx.product.delete({
          where: { id: productId },
        });
      });

      // Log to audit trail
      await logProductUpdated(
        ctx.userId,
        undefined,
        ctx.userRole,
        ctx.userName,
        productId,
        product.sku,
        [{ field: 'deleted', oldValue: false, newValue: true }]
      );

      return {
        success: true,
        deletedProductId: productId,
        deletedSubproductsCount: product.subProducts.length,
      };
    }),
});
