import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma, SupplierStatus, PaymentMethod, AustralianState } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { paginatePrismaQuery, buildPrismaOrderBy, validateABN } from '@joho-erp/shared';
import { sortInputSchema } from '../schemas';
import { createAuditLog, type AuditChange } from '../services/audit';

// Validation schemas for supplier composite types
const supplierContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  position: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  mobile: z.string().optional(),
});

const supplierAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.nativeEnum(AustralianState),
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  country: z.string().default('Australia'),
});

const bankDetailsSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bsb: z.string().regex(/^\d{6}$/, 'BSB must be 6 digits'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().optional(),
});

// Create supplier input schema
const createSupplierSchema = z.object({
  supplierCode: z.string().min(1, 'Supplier code is required'),
  businessName: z.string().min(1, 'Business name is required'),
  tradingName: z.string().optional(),
  abn: z.string().length(11).refine(validateABN, 'Invalid ABN checksum').optional(),
  acn: z.string().optional(),
  primaryContact: supplierContactSchema,
  secondaryContact: supplierContactSchema.optional(),
  accountsContact: supplierContactSchema.optional(),
  businessAddress: supplierAddressSchema,
  deliveryAddress: supplierAddressSchema.optional(),
  paymentTerms: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default('account_credit'),
  creditLimit: z.number().int().nonnegative().default(0), // In cents
  minimumOrderValue: z.number().int().nonnegative().optional(), // In cents
  minimumOrderQty: z.number().positive().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  deliveryDays: z.string().optional(),
  deliveryNotes: z.string().optional(),
  primaryCategories: z.array(z.string()).default([]),
  bankDetails: bankDetailsSchema.optional(),
  internalNotes: z.string().optional(),
  qualityRating: z.number().min(0).max(5).optional(),
  foodSafetyLicense: z.string().optional(),
  licenseExpiry: z.date().optional(),
  insuranceExpiry: z.date().optional(),
});

// Sort field mapping for suppliers
const supplierSortFieldMapping: Record<string, string> = {
  name: 'businessName',
  businessName: 'businessName',
  code: 'supplierCode',
  supplierCode: 'supplierCode',
  status: 'status',
  createdAt: 'createdAt',
  creditLimit: 'creditLimit',
};

export const supplierRouter = router({
  // Get all suppliers with filtering, sorting, and pagination
  getAll: requirePermission('suppliers:view')
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.nativeEnum(SupplierStatus).optional(),
          category: z.string().optional(),
          paymentMethod: z.nativeEnum(PaymentMethod).optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .merge(sortInputSchema)
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, ...filters } = input;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (filters.search) {
        where.OR = [
          { businessName: { contains: filters.search, mode: 'insensitive' } },
          { supplierCode: { contains: filters.search, mode: 'insensitive' } },
          { tradingName: { contains: filters.search, mode: 'insensitive' } },
          { abn: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.category) {
        where.primaryCategories = { has: filters.category };
      }

      if (filters.paymentMethod) {
        where.paymentMethod = filters.paymentMethod;
      }

      // Build orderBy
      const orderBy =
        sortBy && supplierSortFieldMapping[sortBy]
          ? buildPrismaOrderBy(sortBy, sortOrder, supplierSortFieldMapping)
          : { businessName: 'asc' as const };

      // Execute query with pagination
      const result = await paginatePrismaQuery(prisma.supplier, where, {
        page,
        limit,
        orderBy,
        include: {
          _count: { select: { products: true, inventoryBatches: true } },
        },
      });

      return {
        suppliers: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Get supplier by ID with full details
  getById: requirePermission('suppliers:view')
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const supplier = await prisma.supplier.findUnique({
        where: { id: input.id },
        include: {
          products: {
            include: {
              product: true,
            },
            where: { isActive: true },
            orderBy: { isPreferredSupplier: 'desc' },
          },
          inventoryBatches: {
            where: { isConsumed: false },
            orderBy: { receivedAt: 'desc' },
            take: 10,
            include: {
              product: true,
            },
          },
        },
      });

      if (!supplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      return supplier;
    }),

  // Get aggregate statistics
  getStats: requirePermission('suppliers:view').query(async () => {
    const [total, active, inactive, suspended, pendingApproval] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { status: 'active' } }),
      prisma.supplier.count({ where: { status: 'inactive' } }),
      prisma.supplier.count({ where: { status: 'suspended' } }),
      prisma.supplier.count({ where: { status: 'pending_approval' } }),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
      pendingApproval,
    };
  }),

  // Create new supplier
  create: requirePermission('suppliers:create')
    .input(createSupplierSchema)
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate supplier code
      const existingByCode = await prisma.supplier.findUnique({
        where: { supplierCode: input.supplierCode },
      });

      if (existingByCode) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A supplier with this code already exists',
        });
      }

      // Create supplier
      const supplier = await prisma.supplier.create({
        data: {
          ...input,
          status: 'active',
          createdBy: ctx.userId!,
        },
      });

      // Audit log
      await createAuditLog({
        userId: ctx.userId!,
        userRole: ctx.userRole,
        userName: ctx.userName,
        action: 'create',
        entity: 'supplier',
        entityId: supplier.id,
        metadata: {
          supplierCode: supplier.supplierCode,
          businessName: supplier.businessName,
        },
      });

      return supplier;
    }),

  // Update supplier
  update: requirePermission('suppliers:edit')
    .input(
      z.object({
        id: z.string(),
        data: createSupplierSchema.partial().omit({ supplierCode: true }), // Can't change supplier code
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Fetch current supplier for change tracking
      const existing = await prisma.supplier.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Build update data with merged composite types
      const updateData: Record<string, unknown> = {};
      const changes: AuditChange[] = [];

      // Handle simple fields
      const simpleFields = [
        'businessName',
        'tradingName',
        'abn',
        'acn',
        'paymentTerms',
        'paymentMethod',
        'creditLimit',
        'minimumOrderValue',
        'minimumOrderQty',
        'leadTimeDays',
        'deliveryDays',
        'deliveryNotes',
        'primaryCategories',
        'internalNotes',
        'qualityRating',
        'foodSafetyLicense',
        'licenseExpiry',
        'insuranceExpiry',
      ] as const;

      for (const field of simpleFields) {
        if (field in data) {
          const oldValue = existing[field as keyof typeof existing];
          const newValue = data[field as keyof typeof data];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            updateData[field] = newValue;
            changes.push({ field, oldValue, newValue });
          }
        }
      }

      // Handle composite types (contacts, addresses) - merge with existing
      if (data.primaryContact) {
        const newContact = {
          ...existing.primaryContact,
          ...data.primaryContact,
        };
        updateData.primaryContact = newContact;
        changes.push({
          field: 'primaryContact',
          oldValue: existing.primaryContact,
          newValue: newContact,
        });
      }

      if (data.secondaryContact !== undefined) {
        updateData.secondaryContact = data.secondaryContact
          ? { ...existing.secondaryContact, ...data.secondaryContact }
          : null;
        changes.push({
          field: 'secondaryContact',
          oldValue: existing.secondaryContact,
          newValue: updateData.secondaryContact,
        });
      }

      if (data.accountsContact !== undefined) {
        updateData.accountsContact = data.accountsContact
          ? { ...existing.accountsContact, ...data.accountsContact }
          : null;
        changes.push({
          field: 'accountsContact',
          oldValue: existing.accountsContact,
          newValue: updateData.accountsContact,
        });
      }

      if (data.businessAddress) {
        const newAddress = {
          ...existing.businessAddress,
          ...data.businessAddress,
        };
        updateData.businessAddress = newAddress;
        changes.push({
          field: 'businessAddress',
          oldValue: existing.businessAddress,
          newValue: newAddress,
        });
      }

      if (data.deliveryAddress !== undefined) {
        updateData.deliveryAddress = data.deliveryAddress
          ? { ...existing.deliveryAddress, ...data.deliveryAddress }
          : null;
        changes.push({
          field: 'deliveryAddress',
          oldValue: existing.deliveryAddress,
          newValue: updateData.deliveryAddress,
        });
      }

      if (data.bankDetails !== undefined) {
        updateData.bankDetails = data.bankDetails
          ? { ...existing.bankDetails, ...data.bankDetails }
          : null;
        changes.push({
          field: 'bankDetails',
          oldValue: existing.bankDetails,
          newValue: updateData.bankDetails,
        });
      }

      // Update supplier
      const supplier = await prisma.supplier.update({
        where: { id },
        data: updateData,
      });

      // Audit log with changes
      if (changes.length > 0) {
        await createAuditLog({
          userId: ctx.userId!,
          userRole: ctx.userRole,
          userName: ctx.userName,
          action: 'update',
          entity: 'supplier',
          entityId: id,
          changes,
          metadata: { supplierCode: supplier.supplierCode },
        });
      }

      return supplier;
    }),

  // Update supplier status
  updateStatus: requirePermission('suppliers:suspend')
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(SupplierStatus),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, status, reason } = input;

      // Fetch current supplier
      const existing = await prisma.supplier.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      const oldStatus = existing.status;
      const updateData: Record<string, unknown> = { status };

      if (status === 'suspended') {
        if (!reason) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Suspension reason is required',
          });
        }
        updateData.suspensionReason = reason;
        updateData.suspendedAt = new Date();
        updateData.suspendedBy = ctx.userId;
      } else {
        // Clear suspension data
        updateData.suspensionReason = null;
        updateData.suspendedAt = null;
        updateData.suspendedBy = null;
      }

      const supplier = await prisma.supplier.update({
        where: { id },
        data: updateData,
      });

      // Audit log status change
      await createAuditLog({
        userId: ctx.userId!,
        userRole: ctx.userRole,
        userName: ctx.userName,
        action: 'update',
        entity: 'supplier',
        entityId: id,
        changes: [{ field: 'status', oldValue: oldStatus, newValue: status }],
        metadata: {
          supplierCode: supplier.supplierCode,
          reason,
        },
      });

      return supplier;
    }),

  // Link product to supplier
  linkProduct: requirePermission('suppliers:edit')
    .input(
      z.object({
        supplierId: z.string(),
        productId: z.string(),
        supplierSku: z.string().optional(),
        supplierProductName: z.string().optional(),
        costPrice: z.number().int().positive(), // In cents
        packSize: z.number().positive().optional(),
        moq: z.number().positive().optional(),
        leadTimeDays: z.number().int().positive().optional(),
        isPreferredSupplier: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for existing link
      const existing = await prisma.productSupplier.findUnique({
        where: {
          productId_supplierId: {
            productId: input.productId,
            supplierId: input.supplierId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Product is already linked to this supplier',
        });
      }

      // Create link
      const link = await prisma.productSupplier.create({
        data: input,
        include: {
          product: true,
          supplier: true,
        },
      });

      // Audit log
      await createAuditLog({
        userId: ctx.userId!,
        userRole: ctx.userRole,
        userName: ctx.userName,
        action: 'create',
        entity: 'productSupplier',
        entityId: link.id,
        metadata: {
          supplierId: input.supplierId,
          productId: input.productId,
          costPrice: input.costPrice,
          isPreferredSupplier: input.isPreferredSupplier,
        },
      });

      return link;
    }),

  // Update product-supplier link
  updateProductLink: requirePermission('suppliers:edit')
    .input(
      z.object({
        id: z.string(),
        costPrice: z.number().int().positive().optional(), // In cents
        supplierSku: z.string().optional(),
        supplierProductName: z.string().optional(),
        packSize: z.number().positive().optional(),
        moq: z.number().positive().optional(),
        leadTimeDays: z.number().int().positive().optional(),
        isPreferredSupplier: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, costPrice, ...rest } = input;

      // Fetch current for change tracking
      const existing = await prisma.productSupplier.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product-supplier link not found',
        });
      }

      const updateData: Record<string, unknown> = { ...rest };

      // If cost price changed, track the last cost price
      if (costPrice !== undefined && costPrice !== existing.costPrice) {
        updateData.lastCostPrice = existing.costPrice;
        updateData.costPrice = costPrice;
      }

      const link = await prisma.productSupplier.update({
        where: { id },
        data: updateData,
        include: {
          product: true,
          supplier: true,
        },
      });

      // Audit log
      await createAuditLog({
        userId: ctx.userId!,
        userRole: ctx.userRole,
        userName: ctx.userName,
        action: 'update',
        entity: 'productSupplier',
        entityId: id,
        metadata: {
          supplierId: link.supplierId,
          productId: link.productId,
          costPriceChanged: costPrice !== undefined && costPrice !== existing.costPrice,
        },
      });

      return link;
    }),

  // Get products for supplier
  getProducts: requirePermission('suppliers:view')
    .input(
      z.object({
        supplierId: z.string(),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = { supplierId: input.supplierId };

      if (!input.includeInactive) {
        where.isActive = true;
      }

      const products = await prisma.productSupplier.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: [{ isPreferredSupplier: 'desc' }, { product: { name: 'asc' } }],
      });

      return products;
    }),

  // Delete supplier (soft delete by setting status to inactive)
  delete: requirePermission('suppliers:delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supplier = await prisma.supplier.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { products: true, inventoryBatches: true } },
        },
      });

      if (!supplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Check if supplier has active relationships
      if (supplier._count.inventoryBatches > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Cannot delete supplier with inventory batches. Set status to inactive instead.',
        });
      }

      // Soft delete - set status to inactive
      const updatedSupplier = await prisma.supplier.update({
        where: { id: input.id },
        data: { status: 'inactive' },
      });

      // Audit log
      await createAuditLog({
        userId: ctx.userId!,
        userRole: ctx.userRole,
        userName: ctx.userName,
        action: 'delete',
        entity: 'supplier',
        entityId: input.id,
        metadata: {
          supplierCode: supplier.supplierCode,
          businessName: supplier.businessName,
          softDelete: true,
        },
      });

      return updatedSupplier;
    }),

  // Get unique categories from all suppliers
  getCategories: requirePermission('suppliers:view').query(async () => {
    const suppliers = await prisma.supplier.findMany({
      select: { primaryCategories: true },
      where: { status: { not: 'inactive' } },
    });

    const categories = new Set<string>();
    suppliers.forEach((s) => {
      s.primaryCategories.forEach((c) => categories.add(c));
    });

    return Array.from(categories).sort();
  }),
});
