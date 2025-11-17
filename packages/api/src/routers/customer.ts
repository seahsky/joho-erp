import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, isAdmin, isAdminOrSales } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import { paginatePrismaQuery } from '@jimmy-beef/shared';

export const customerRouter = router({
  // Public registration
  register: publicProcedure
    .input(
      z.object({
        clerkUserId: z.string(),
        businessName: z.string().min(1),
        abn: z.string().length(11),
        contactPerson: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          phone: z.string(),
          mobile: z.string().optional(),
        }),
        deliveryAddress: z.object({
          street: z.string().min(1),
          suburb: z.string().min(1),
          state: z.string(),
          postcode: z.string(),
          areaTag: z.enum(['north', 'south', 'east', 'west']),
          deliveryInstructions: z.string().optional(),
        }),
        billingAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string(),
            postcode: z.string(),
          })
          .optional(),
        requestedCreditLimit: z.number().optional(),
        agreedToTerms: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      // Check if customer already exists
      const existing = await prisma.customer.findUnique({
        where: { clerkUserId: input.clerkUserId },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer already registered',
        });
      }

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          clerkUserId: input.clerkUserId,
          businessName: input.businessName,
          abn: input.abn,
          contactPerson: input.contactPerson,
          deliveryAddress: {
            ...input.deliveryAddress,
            country: 'Australia',
          },
          billingAddress: input.billingAddress
            ? { ...input.billingAddress, country: 'Australia' }
            : undefined,
          creditApplication: {
            status: 'pending',
            appliedAt: new Date(),
            creditLimit: input.requestedCreditLimit || 0,
          },
          status: 'active',
        },
      });

      // TODO: Send confirmation email to customer
      // TODO: Send notification email to admin for approval

      return {
        customerId: customer.id,
        status: 'pending',
      };
    }),

  // Get customer profile (authenticated)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const customer = await prisma.customer.findUnique({
      where: { clerkUserId: ctx.userId },
    });

    if (!customer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Customer profile not found',
      });
    }

    return customer;
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        contactPerson: z
          .object({
            phone: z.string(),
            mobile: z.string().optional(),
          })
          .optional(),
        deliveryAddress: z
          .object({
            street: z.string(),
            suburb: z.string(),
            deliveryInstructions: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch current customer to merge updates
      const currentCustomer = await prisma.customer.findUnique({
        where: { clerkUserId: ctx.userId },
      });

      if (!currentCustomer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Build update data with merged composite types
      const updateData: any = {};

      if (input.contactPerson) {
        updateData.contactPerson = {
          ...currentCustomer.contactPerson,
          ...input.contactPerson,
        };
      }

      if (input.deliveryAddress) {
        updateData.deliveryAddress = {
          ...currentCustomer.deliveryAddress,
          ...input.deliveryAddress,
        };
      }

      const customer = await prisma.customer.update({
        where: { clerkUserId: ctx.userId },
        data: updateData,
      });

      // TODO: Log to audit trail

      return customer;
    }),

  // Admin: Get all customers
  getAll: isAdminOrSales
    .input(
      z.object({
        status: z.enum(['active', 'suspended', 'closed']).optional(),
        approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
        areaTag: z.enum(['north', 'south', 'east', 'west']).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input.status) {
        where.status = input.status;
      }

      if (input.approvalStatus) {
        where.creditApplication = {
          is: { status: input.approvalStatus },
        };
      }

      if (input.areaTag) {
        where.deliveryAddress = {
          is: { areaTag: input.areaTag },
        };
      }

      if (input.search) {
        where.OR = [
          { businessName: { contains: input.search, mode: 'insensitive' } },
          { contactPerson: { is: { email: { contains: input.search, mode: 'insensitive' } } } },
          { abn: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const result = await paginatePrismaQuery(prisma.customer, where, {
        page: input.page,
        limit: input.limit,
        orderBy: { createdAt: 'desc' },
      });

      return {
        customers: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Admin: Get customer by ID
  getById: isAdminOrSales
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      return customer;
    }),

  // Admin: Create customer
  createCustomer: isAdmin
    .input(
      z.object({
        businessName: z.string().min(1),
        abn: z.string().length(11),
        contactPerson: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          phone: z.string(),
          mobile: z.string().optional(),
        }),
        deliveryAddress: z.object({
          street: z.string().min(1),
          suburb: z.string().min(1),
          state: z.string(),
          postcode: z.string(),
          areaTag: z.enum(['north', 'south', 'east', 'west']),
          deliveryInstructions: z.string().optional(),
        }),
        billingAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string(),
            postcode: z.string(),
          })
          .optional(),
        creditLimit: z.number().min(0).default(0),
        paymentTerms: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if customer with this email already exists
      const existing = await prisma.customer.findFirst({
        where: {
          contactPerson: {
            is: { email: input.contactPerson.email },
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A customer with this email already exists',
        });
      }

      // Generate a dummy Clerk user ID for admin-created customers
      const dummyClerkId = `admin_created_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          clerkUserId: dummyClerkId,
          businessName: input.businessName,
          abn: input.abn,
          contactPerson: input.contactPerson,
          deliveryAddress: {
            ...input.deliveryAddress,
            country: 'Australia',
          },
          billingAddress: input.billingAddress
            ? { ...input.billingAddress, country: 'Australia' }
            : undefined,
          creditApplication: {
            status: input.creditLimit > 0 ? 'approved' : 'pending',
            appliedAt: new Date(),
            creditLimit: input.creditLimit,
            paymentTerms: input.paymentTerms,
            reviewedAt: input.creditLimit > 0 ? new Date() : undefined,
            reviewedBy: input.creditLimit > 0 ? ctx.userId : undefined,
          },
          status: 'active',
        },
      });

      // TODO: Send welcome email to customer
      // TODO: Log to audit trail

      return customer;
    }),

  // Admin: Approve credit
  approveCredit: isAdmin
    .input(
      z.object({
        customerId: z.string(),
        creditLimit: z.number().min(0),
        paymentTerms: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch current customer to update creditApplication
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!currentCustomer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const customer = await prisma.customer.update({
        where: { id: input.customerId },
        data: {
          creditApplication: {
            ...currentCustomer.creditApplication,
            status: 'approved',
            creditLimit: input.creditLimit,
            paymentTerms: input.paymentTerms,
            notes: input.notes,
            reviewedAt: new Date(),
            reviewedBy: ctx.userId,
          },
        },
      });

      // TODO: Send approval email to customer
      // TODO: Sync to Xero as contact
      // TODO: Log to audit trail

      return customer;
    }),

  // Admin: Reject credit
  rejectCredit: isAdmin
    .input(
      z.object({
        customerId: z.string(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch current customer to update creditApplication
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: input.customerId },
      });

      if (!currentCustomer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const customer = await prisma.customer.update({
        where: { id: input.customerId },
        data: {
          creditApplication: {
            ...currentCustomer.creditApplication,
            status: 'rejected',
            notes: input.notes,
            reviewedAt: new Date(),
            reviewedBy: ctx.userId,
          },
        },
      });

      // TODO: Send rejection email to customer
      // TODO: Log to audit trail

      return customer;
    }),
});
