import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { paginatePrismaQuery, buildPrismaOrderBy } from '@joho-erp/shared';
import { sortInputSchema } from '../schemas';
import {
  sendCreditApprovedEmail,
  sendCreditRejectedEmail,
  sendCustomerRegistrationEmail,
  sendNewCustomerRegistrationAdminEmail,
} from '../services/email';
import {
  logCreditApproval,
  logCreditRejection,
  logCustomerRegistration,
  logCustomerProfileUpdate,
  logCustomerCreatedByAdmin,
  logCustomerStatusChange,
} from '../services/audit';

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

/**
 * Resolves a customer ID that can be either a MongoDB ObjectID or a Clerk user ID.
 * If a Clerk user ID is provided (starts with 'user_'), looks up the customer by clerkUserId
 * and returns their MongoDB ID.
 * @param customerId - Either a MongoDB ObjectID or Clerk user ID
 * @returns The MongoDB ObjectID of the customer
 * @throws TRPCError if customer not found or invalid ID format
 */
async function resolveCustomerId(customerId: string): Promise<string> {
  // Check if it looks like a Clerk user ID
  if (customerId.startsWith('user_')) {
    const customer = await prisma.customer.findUnique({
      where: { clerkUserId: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      });
    }
    return customer.id;
  }

  // Validate MongoDB ObjectID format (24-char hex)
  if (!/^[a-fA-F0-9]{24}$/.test(customerId)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid customer ID format',
    });
  }

  return customerId;
}

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
        requestedCreditLimit: z.number().int().optional(), // In cents
        forecastPurchase: z.number().int().optional(), // In cents
        directors: z.array(directorDetailsSchema).min(1, 'At least one director is required'),
        financialDetails: financialDetailsSchema.optional(),
        tradeReferences: z.array(tradeReferenceSchema).optional(),
        signatures: z
          .array(
            z.object({
              directorIndex: z.number().int().min(0),
              applicantSignatureUrl: z.string().url(),
              applicantSignedAt: z.date(),
              guarantorSignatureUrl: z.string().url(),
              guarantorSignedAt: z.date(),
              witnessName: z.string().min(1),
              witnessSignatureUrl: z.string().url(),
              witnessSignedAt: z.date(),
            })
          )
          .min(1, 'At least one director must sign'),
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
            agreedToTermsAt: new Date(),
            signatures: input.signatures.flatMap((sig, _idx) => {
              const director = input.directors[sig.directorIndex];
              const signerName = `${director.givenNames} ${director.familyName}`;
              return [
                {
                  signerName,
                  signerPosition: director.position,
                  signatureUrl: sig.applicantSignatureUrl,
                  signedAt: sig.applicantSignedAt,
                  signatureType: 'APPLICANT' as const,
                },
                {
                  signerName,
                  signerPosition: director.position,
                  signatureUrl: sig.guarantorSignatureUrl,
                  signedAt: sig.guarantorSignedAt,
                  signatureType: 'GUARANTOR' as const,
                  witnessName: sig.witnessName,
                  witnessSignatureUrl: sig.witnessSignatureUrl,
                  witnessSignedAt: sig.witnessSignedAt,
                },
              ];
            }),
          },
          directors: input.directors,
          financialDetails: input.financialDetails,
          tradeReferences: input.tradeReferences || [],
          status: 'active',
          onboardingComplete: true,
        },
      });

      // Send confirmation email to customer
      await sendCustomerRegistrationEmail({
        customerEmail: customer.contactPerson.email,
        contactPerson: `${customer.contactPerson.firstName} ${customer.contactPerson.lastName}`,
        businessName: customer.businessName,
      }).catch((error) => {
        console.error('Failed to send customer registration email:', error);
      });

      // Send notification email to admin for credit approval
      await sendNewCustomerRegistrationAdminEmail({
        businessName: customer.businessName,
        contactPerson: `${customer.contactPerson.firstName} ${customer.contactPerson.lastName}`,
        email: customer.contactPerson.email,
        phone: customer.contactPerson.phone,
        abn: customer.abn,
        requestedCreditLimit: input.requestedCreditLimit,
      }).catch((error) => {
        console.error('Failed to send admin notification for new customer:', error);
      });

      // Log customer registration to audit trail
      await logCustomerRegistration(
        input.clerkUserId,
        customer.id,
        customer.businessName,
        customer.abn
      ).catch((error) => {
        console.error('Failed to log customer registration:', error);
      });

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

    // Calculate used credit from unpaid orders
    // Sum totalAmount for orders that are not cancelled and not delivered
    const unpaidOrders = await prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        customerId: customer.id,
        status: {
          in: ['awaiting_approval', 'confirmed', 'packing', 'ready_for_delivery', 'out_for_delivery'],
        },
        // Exclude pending backorders (they don't count against credit limit)
        backorderStatus: {
          not: 'pending_approval',
        },
      },
    });

    const usedCredit = unpaidOrders._sum.totalAmount ?? 0;

    return {
      ...customer,
      usedCredit,
    };
  }),

  // Check onboarding status
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const customer = await prisma.customer.findUnique({
      where: { clerkUserId: ctx.userId },
      select: {
        id: true,
        onboardingComplete: true,
        businessName: true,
        creditApplication: true,
      },
    });

    return {
      hasCustomerRecord: !!customer,
      onboardingComplete: customer?.onboardingComplete ?? false,
      businessName: customer?.businessName ?? null,
      creditStatus: customer?.creditApplication?.status ?? null,
    };
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

      // Build changes array for audit log
      const changes = [];
      if (input.contactPerson) {
        changes.push({
          field: 'contactPerson',
          oldValue: currentCustomer.contactPerson,
          newValue: customer.contactPerson,
        });
      }
      if (input.deliveryAddress) {
        changes.push({
          field: 'deliveryAddress',
          oldValue: currentCustomer.deliveryAddress,
          newValue: customer.deliveryAddress,
        });
      }

      // Log to audit trail
      await logCustomerProfileUpdate(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        customer.id,
        customer.businessName,
        changes
      );

      return customer;
    }),

  // Admin: Get all customers
  getAll: requirePermission('customers:view')
    .input(
      z
        .object({
          status: z.enum(['active', 'suspended', 'closed']).optional(),
          approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
          areaTag: z.enum(['north', 'south', 'east', 'west']).optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .merge(sortInputSchema)
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.approvalStatus) {
        where.creditApplication = {
          is: { status: filters.approvalStatus },
        };
      }

      if (filters.areaTag) {
        where.deliveryAddress = {
          is: { areaTag: filters.areaTag },
        };
      }

      if (filters.search) {
        where.OR = [
          { businessName: { contains: filters.search, mode: 'insensitive' } },
          { contactPerson: { is: { email: { contains: filters.search, mode: 'insensitive' } } } },
          { abn: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy from sort parameters
      const customerSortFieldMapping: Record<string, string> = {
        businessName: 'businessName',
        createdAt: 'createdAt',
        status: 'status',
        creditLimit: 'creditApplication.creditLimit',
        creditStatus: 'creditApplication.status',
        areaTag: 'deliveryAddress.areaTag',
      };

      const orderBy =
        sortBy && customerSortFieldMapping[sortBy]
          ? buildPrismaOrderBy(sortBy, sortOrder, customerSortFieldMapping)
          : { businessName: 'asc' as const };

      const result = await paginatePrismaQuery(prisma.customer, where, {
        page,
        limit,
        orderBy,
      });

      return {
        customers: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Admin: Get customer by ID
  getById: requirePermission('customers:view')
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const resolvedCustomerId = await resolveCustomerId(input.customerId);

      const customer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId },
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
  createCustomer: requirePermission('customers:create')
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
        requestedCreditLimit: z.number().int().optional(), // In cents
        forecastPurchase: z.number().int().optional(), // In cents
        creditLimit: z.number().int().min(0).default(0), // In cents
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
          onboardingComplete: true, // Admin-created customers skip onboarding
        },
      });

      // Send welcome email to customer
      try {
        await sendCustomerRegistrationEmail({
          customerEmail: input.contactPerson.email,
          businessName: input.businessName,
          contactPerson: `${input.contactPerson.firstName} ${input.contactPerson.lastName}`,
        });
      } catch (error) {
        // Log error but don't fail the registration
        console.error('Failed to send welcome email:', error);
      }

      // Log to audit trail
      await logCustomerCreatedByAdmin(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        customer.id,
        customer.businessName,
        customer.abn
      );

      return customer;
    }),

  // Admin: Approve credit
  approveCredit: requirePermission('customers:approve_credit')
    .input(
      z.object({
        customerId: z.string(),
        creditLimit: z.number().int().min(0), // In cents
        paymentTerms: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedCustomerId = await resolveCustomerId(input.customerId);

      // Fetch current customer to update creditApplication
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId },
      });

      if (!currentCustomer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const customer = await prisma.customer.update({
        where: { id: resolvedCustomerId },
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

      // Send approval email to customer
      const contactPerson = customer.contactPerson as { firstName: string; lastName: string; email: string };
      await sendCreditApprovedEmail({
        customerEmail: contactPerson.email,
        customerName: customer.businessName,
        contactPerson: `${contactPerson.firstName} ${contactPerson.lastName}`,
        creditLimit: input.creditLimit,
        paymentTerms: input.paymentTerms,
        notes: input.notes,
      }).catch((error) => {
        console.error('Failed to send credit approved email:', error);
      });

      // Sync to Xero as contact
      const { enqueueXeroJob } = await import('../services/xero-queue');
      await enqueueXeroJob('sync_contact', 'customer', customer.id).catch((error) => {
        console.error('Failed to enqueue Xero contact sync:', error);
      });

      // Log credit approval to audit trail
      await logCreditApproval(
        ctx.userId,
        customer.id,
        customer.businessName,
        input.creditLimit,
        input.paymentTerms
      ).catch((error) => {
        console.error('Failed to log credit approval:', error);
      });

      return customer;
    }),

  // Admin: Reject credit
  rejectCredit: requirePermission('customers:approve_credit')
    .input(
      z.object({
        customerId: z.string(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedCustomerId = await resolveCustomerId(input.customerId);

      // Fetch current customer to update creditApplication
      const currentCustomer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId },
      });

      if (!currentCustomer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      const customer = await prisma.customer.update({
        where: { id: resolvedCustomerId },
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

      // Send rejection email to customer
      const contactPerson = customer.contactPerson as { firstName: string; lastName: string; email: string };
      await sendCreditRejectedEmail({
        customerEmail: contactPerson.email,
        customerName: customer.businessName,
        contactPerson: `${contactPerson.firstName} ${contactPerson.lastName}`,
        reason: input.notes,
      }).catch((error) => {
        console.error('Failed to send credit rejected email:', error);
      });

      // Log credit rejection to audit trail
      await logCreditRejection(
        ctx.userId,
        customer.id,
        customer.businessName,
        input.notes
      ).catch((error) => {
        console.error('Failed to log credit rejection:', error);
      });

      return customer;
    }),

  // Admin: Suspend customer account
  suspend: requirePermission('customers:suspend')
    .input(
      z.object({
        customerId: z.string(),
        reason: z.string().min(10, 'Suspension reason must be at least 10 characters'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedCustomerId = await resolveCustomerId(input.customerId);

      const customer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      if (customer.status === 'suspended') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer is already suspended',
        });
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: resolvedCustomerId },
        data: {
          status: 'suspended',
          suspensionReason: input.reason,
          suspendedAt: new Date(),
          suspendedBy: ctx.userId,
        },
      });

      // Log suspension to audit trail
      await logCustomerStatusChange(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        customer.id,
        {
          businessName: customer.businessName,
          action: 'suspend',
          reason: input.reason,
        }
      ).catch((error) => {
        console.error('Failed to log customer suspension:', error);
      });

      return updatedCustomer;
    }),

  // Admin: Activate (unsuspend) customer account
  activate: requirePermission('customers:suspend')
    .input(
      z.object({
        customerId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedCustomerId = await resolveCustomerId(input.customerId);

      const customer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      if (customer.status !== 'suspended') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer is not suspended',
        });
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: resolvedCustomerId },
        data: {
          status: 'active',
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null,
        },
      });

      // Log activation to audit trail
      await logCustomerStatusChange(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        ctx.userName,
        customer.id,
        {
          businessName: customer.businessName,
          action: 'activate',
        }
      ).catch((error) => {
        console.error('Failed to log customer activation:', error);
      });

      return updatedCustomer;
    }),

  // Admin: Update customer details
  update: requirePermission('customers:edit')
    .input(
      z.object({
        customerId: z.string(),
        // Contact person
        contactPerson: z
          .object({
            firstName: z.string().min(1).optional(),
            lastName: z.string().min(1).optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            mobile: z.string().optional(),
          })
          .optional(),
        // Delivery address
        deliveryAddress: z
          .object({
            street: z.string().min(1).optional(),
            suburb: z.string().min(1).optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            deliveryInstructions: z.string().optional(),
          })
          .optional(),
        // Business information
        businessInfo: z
          .object({
            businessName: z.string().min(1).optional(),
            tradingName: z.string().nullable().optional(),
            abn: z.string().length(11).optional(),
            acn: z.string().length(9).nullable().optional(),
            accountType: z.enum(['sole_trader', 'partnership', 'company', 'other']).optional(),
          })
          .optional(),
        // Billing address
        billingAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string().min(1),
            postcode: z.string().min(1),
            country: z.string().optional(),
          })
          .nullable()
          .optional(),
        // Postal address
        postalAddress: z
          .object({
            street: z.string().min(1),
            suburb: z.string().min(1),
            state: z.string().min(1),
            postcode: z.string().min(1),
            country: z.string().optional(),
          })
          .nullable()
          .optional(),
        // Flag to copy billing address to postal address
        postalSameAsBilling: z.boolean().optional(),
        // Directors array
        directors: z
          .array(
            z.object({
              familyName: z.string().min(1),
              givenNames: z.string().min(1),
              residentialAddress: z.object({
                street: z.string().min(1),
                suburb: z.string().min(1),
                state: z.string().min(1),
                postcode: z.string().min(1),
                country: z.string().optional(),
              }),
              dateOfBirth: z.coerce.date(),
              driverLicenseNumber: z.string().min(1),
              licenseState: z.enum(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']),
              licenseExpiry: z.coerce.date(),
              position: z.string().optional(),
            })
          )
          .optional(),
        // Financial details
        financialDetails: z
          .object({
            bankName: z.string().min(1),
            accountName: z.string().min(1),
            bsb: z.string().regex(/^\d{6}$/, 'BSB must be 6 digits'),
            accountNumber: z.string().min(6).max(10),
          })
          .nullable()
          .optional(),
        // Trade references array
        tradeReferences: z
          .array(
            z.object({
              companyName: z.string().min(1),
              contactPerson: z.string().min(1),
              phone: z.string().min(1),
              email: z.string().email(),
              verified: z.boolean().optional(),
              verifiedAt: z.date().nullable().optional(),
            })
          )
          .optional(),
        // SMS reminder preferences
        smsReminderPreferences: z
          .object({
            enabled: z.boolean(),
            reminderDays: z
              .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
              .optional()
              .default([]),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const resolvedCustomerId = await resolveCustomerId(input.customerId);

      const currentCustomer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId },
      });

      if (!currentCustomer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Build update data with merged composite types
      const updateData: Record<string, unknown> = {};
      const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

      // Handle contact person
      if (input.contactPerson) {
        const currentContact = currentCustomer.contactPerson as Record<string, unknown>;
        const newContact = {
          ...currentContact,
          ...input.contactPerson,
        };
        updateData.contactPerson = newContact;
        changes.push({
          field: 'contactPerson',
          oldValue: currentContact,
          newValue: newContact,
        });
      }

      // Handle delivery address
      if (input.deliveryAddress) {
        const currentAddress = currentCustomer.deliveryAddress as Record<string, unknown>;
        const newAddress = {
          ...currentAddress,
          ...input.deliveryAddress,
        };
        updateData.deliveryAddress = newAddress;
        changes.push({
          field: 'deliveryAddress',
          oldValue: currentAddress,
          newValue: newAddress,
        });
      }

      // Handle business information
      if (input.businessInfo) {
        if (input.businessInfo.businessName !== undefined) {
          updateData.businessName = input.businessInfo.businessName;
          changes.push({
            field: 'businessName',
            oldValue: currentCustomer.businessName,
            newValue: input.businessInfo.businessName,
          });
        }
        if (input.businessInfo.tradingName !== undefined) {
          updateData.tradingName = input.businessInfo.tradingName;
          changes.push({
            field: 'tradingName',
            oldValue: currentCustomer.tradingName,
            newValue: input.businessInfo.tradingName,
          });
        }
        if (input.businessInfo.abn !== undefined) {
          updateData.abn = input.businessInfo.abn;
          changes.push({
            field: 'abn',
            oldValue: currentCustomer.abn,
            newValue: input.businessInfo.abn,
          });
        }
        if (input.businessInfo.acn !== undefined) {
          updateData.acn = input.businessInfo.acn;
          changes.push({
            field: 'acn',
            oldValue: currentCustomer.acn,
            newValue: input.businessInfo.acn,
          });
        }
        if (input.businessInfo.accountType !== undefined) {
          updateData.accountType = input.businessInfo.accountType;
          changes.push({
            field: 'accountType',
            oldValue: currentCustomer.accountType,
            newValue: input.businessInfo.accountType,
          });
        }
      }

      // Handle billing address
      if (input.billingAddress !== undefined) {
        const newBillingAddress = input.billingAddress
          ? { ...input.billingAddress, country: input.billingAddress.country ?? 'Australia' }
          : null;
        updateData.billingAddress = newBillingAddress;
        changes.push({
          field: 'billingAddress',
          oldValue: currentCustomer.billingAddress,
          newValue: newBillingAddress,
        });
      }

      // Handle postal address
      if (input.postalSameAsBilling && input.billingAddress) {
        // Copy billing address to postal address
        const newPostalAddress = { ...input.billingAddress, country: input.billingAddress.country ?? 'Australia' };
        updateData.postalAddress = newPostalAddress;
        changes.push({
          field: 'postalAddress',
          oldValue: currentCustomer.postalAddress,
          newValue: newPostalAddress,
        });
      } else if (input.postalAddress !== undefined) {
        const newPostalAddress = input.postalAddress
          ? { ...input.postalAddress, country: input.postalAddress.country ?? 'Australia' }
          : null;
        updateData.postalAddress = newPostalAddress;
        changes.push({
          field: 'postalAddress',
          oldValue: currentCustomer.postalAddress,
          newValue: newPostalAddress,
        });
      }

      // Handle directors array
      if (input.directors !== undefined) {
        const newDirectors = input.directors.map((director) => ({
          ...director,
          residentialAddress: {
            ...director.residentialAddress,
            country: director.residentialAddress.country ?? 'Australia',
          },
        }));
        updateData.directors = newDirectors;
        changes.push({
          field: 'directors',
          oldValue: currentCustomer.directors,
          newValue: newDirectors,
        });
      }

      // Handle financial details
      if (input.financialDetails !== undefined) {
        updateData.financialDetails = input.financialDetails;
        changes.push({
          field: 'financialDetails',
          oldValue: currentCustomer.financialDetails,
          newValue: input.financialDetails,
        });
      }

      // Handle trade references array
      if (input.tradeReferences !== undefined) {
        // Preserve verified status if not explicitly changed
        const newTradeReferences = input.tradeReferences.map((ref) => ({
          ...ref,
          verified: ref.verified ?? false,
          verifiedAt: ref.verifiedAt ?? null,
        }));
        updateData.tradeReferences = newTradeReferences;
        changes.push({
          field: 'tradeReferences',
          oldValue: currentCustomer.tradeReferences,
          newValue: newTradeReferences,
        });
      }

      // Handle SMS reminder preferences
      if (input.smsReminderPreferences !== undefined) {
        const newSmsPreferences = {
          enabled: input.smsReminderPreferences.enabled,
          reminderDays: input.smsReminderPreferences.enabled
            ? input.smsReminderPreferences.reminderDays ?? []
            : [],
        };
        updateData.smsReminderPreferences = newSmsPreferences;
        changes.push({
          field: 'smsReminderPreferences',
          oldValue: currentCustomer.smsReminderPreferences,
          newValue: newSmsPreferences,
        });
      }

      const customer = await prisma.customer.update({
        where: { id: resolvedCustomerId },
        data: updateData,
      });

      // Log update to audit trail
      await prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          action: 'update',
          entity: 'customer',
          entityId: customer.id,
          changes: changes as unknown as Array<{ field: string; oldValue: string | null; newValue: string | null }>,
          metadata: {
            actionType: 'update_details',
            businessName: customer.businessName,
          },
          timestamp: new Date(),
        },
      }).catch((error) => {
        console.error('Failed to log customer update:', error);
      });

      return customer;
    }),
});
