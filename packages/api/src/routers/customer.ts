import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, isAdmin, isAdminOrSales } from '../trpc';
import { prisma } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import { paginatePrismaQuery } from '@jimmy-beef/shared';

// Validation schemas for credit application
const residentialAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  country: z.string().default('Australia'),
});

const directorDetailsSchema = z.object({
  familyName: z.string().min(1, 'Family name is required'),
  givenNames: z.string().min(1, 'Given names are required'),
  residentialAddress: residentialAddressSchema,
  dateOfBirth: z.date().or(z.string().transform((str) => new Date(str))),
  driverLicenseNumber: z.string().min(1, 'Driver license number is required'),
  licenseState: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']),
  licenseExpiry: z.date().or(z.string().transform((str) => new Date(str))),
  position: z.string().optional(),
});

const financialDetailsSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountName: z.string().min(1, 'Account name is required'),
  bsb: z.string().regex(/^\d{6}$/, 'BSB must be 6 digits'),
  accountNumber: z.string().min(1, 'Account number is required'),
});

const tradeReferenceSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  verified: z.boolean().default(false),
  verifiedAt: z.date().optional(),
});

export const customerRouter = router({
  // Public registration
  register: publicProcedure
    .input(
      z.object({
        clerkUserId: z.string(),
        accountType: z.enum(['sole_trader', 'partnership', 'company', 'other']),
        businessName: z.string().min(1),
        tradingName: z.string().optional(),
        abn: z.string().length(11),
        acn: z.string().length(9).optional(),
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
        postalAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string(),
            postcode: z.string(),
          })
          .optional(),
        requestedCreditLimit: z.number().optional(),
        forecastPurchase: z.number().optional(),
        directors: z.array(directorDetailsSchema).min(1, 'At least one director is required'),
        financialDetails: financialDetailsSchema.optional(),
        tradeReferences: z.array(tradeReferenceSchema).optional(),
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
          accountType: input.accountType,
          businessName: input.businessName,
          tradingName: input.tradingName,
          abn: input.abn,
          acn: input.acn,
          contactPerson: input.contactPerson,
          deliveryAddress: {
            ...input.deliveryAddress,
            country: 'Australia',
          },
          billingAddress: input.billingAddress
            ? { ...input.billingAddress, country: 'Australia' }
            : undefined,
          postalAddress: input.postalAddress
            ? { ...input.postalAddress, country: 'Australia' }
            : undefined,
          creditApplication: {
            status: 'pending',
            requestedCreditLimit: input.requestedCreditLimit,
            forecastPurchase: input.forecastPurchase,
            appliedAt: new Date(),
            submittedAt: new Date(),
            creditLimit: 0,
          },
          directors: input.directors,
          financialDetails: input.financialDetails,
          tradeReferences: input.tradeReferences || [],
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
        // Business Information
        accountType: z.enum(['sole_trader', 'partnership', 'company', 'other']),
        businessName: z.string().min(1),
        tradingName: z.string().optional(),
        abn: z.string().length(11),
        acn: z.string().length(9).optional(),

        // Contact Person
        contactPerson: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          phone: z.string(),
          mobile: z.string().optional(),
        }),

        // Addresses
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
        postalAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string(),
            postcode: z.string(),
          })
          .optional(),

        // Credit Application
        requestedCreditLimit: z.number().optional(),
        forecastPurchase: z.number().optional(),
        creditLimit: z.number().min(0).default(0),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),

        // Optional: Directors/Proprietors
        directors: z.array(directorDetailsSchema).optional(),

        // Optional: Financial Details
        financialDetails: financialDetailsSchema.optional(),

        // Optional: Trade References
        tradeReferences: z.array(tradeReferenceSchema).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if customer with this email already exists
      const existingByEmail = await prisma.customer.findFirst({
        where: {
          contactPerson: {
            is: { email: input.contactPerson.email },
          },
        },
      });

      if (existingByEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A customer with this email already exists',
        });
      }

      // Check if customer with this ABN already exists
      const existingByABN = await prisma.customer.findFirst({
        where: { abn: input.abn },
      });

      if (existingByABN) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A customer with this ABN already exists',
        });
      }

      // Generate a dummy Clerk user ID for admin-created customers
      const dummyClerkId = `admin_created_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          clerkUserId: dummyClerkId,
          accountType: input.accountType,
          businessName: input.businessName,
          tradingName: input.tradingName,
          abn: input.abn,
          acn: input.acn,
          contactPerson: input.contactPerson,
          deliveryAddress: {
            ...input.deliveryAddress,
            country: 'Australia',
          },
          billingAddress: input.billingAddress
            ? { ...input.billingAddress, country: 'Australia' }
            : undefined,
          postalAddress: input.postalAddress
            ? { ...input.postalAddress, country: 'Australia' }
            : undefined,
          creditApplication: {
            status: input.creditLimit > 0 ? 'approved' : 'pending',
            requestedCreditLimit: input.requestedCreditLimit,
            forecastPurchase: input.forecastPurchase,
            appliedAt: new Date(),
            creditLimit: input.creditLimit,
            paymentTerms: input.paymentTerms,
            notes: input.notes,
            reviewedAt: input.creditLimit > 0 ? new Date() : undefined,
            reviewedBy: input.creditLimit > 0 ? ctx.userId : undefined,
          },
          directors: input.directors || [],
          financialDetails: input.financialDetails,
          tradeReferences: input.tradeReferences || [],
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
