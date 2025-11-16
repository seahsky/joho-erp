import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, isAdmin, isAdminOrSales } from '../trpc';
import { Customer, connectDB } from '@jimmy-beef/database';
import { TRPCError } from '@trpc/server';
import { paginateQuery } from '@jimmy-beef/shared';

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
      await connectDB();

      // Check if customer already exists
      const existing = await Customer.findOne({ clerkUserId: input.clerkUserId });
      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer already registered',
        });
      }

      // Create customer
      const customer = await Customer.create({
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
      });

      // TODO: Send confirmation email to customer
      // TODO: Send notification email to admin for approval

      return {
        customerId: customer._id.toString(),
        status: 'pending',
      };
    }),

  // Get customer profile (authenticated)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    await connectDB();

    const customer = await Customer.findOne({ clerkUserId: ctx.userId });

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
      await connectDB();

      const customer = await Customer.findOneAndUpdate(
        { clerkUserId: ctx.userId },
        { $set: input },
        { new: true }
      );

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

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
      await connectDB();

      const filter: any = {};

      if (input.status) {
        filter.status = input.status;
      }

      if (input.approvalStatus) {
        filter['creditApplication.status'] = input.approvalStatus;
      }

      if (input.areaTag) {
        filter['deliveryAddress.areaTag'] = input.areaTag;
      }

      if (input.search) {
        filter.$or = [
          { businessName: { $regex: input.search, $options: 'i' } },
          { 'contactPerson.email': { $regex: input.search, $options: 'i' } },
          { abn: { $regex: input.search, $options: 'i' } },
        ];
      }

      const result = await paginateQuery(Customer, filter, {
        page: input.page,
        limit: input.limit,
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
      await connectDB();

      const customer = await Customer.findById(input.customerId);

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

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
      await connectDB();

      const customer = await Customer.findByIdAndUpdate(
        input.customerId,
        {
          $set: {
            'creditApplication.status': 'approved',
            'creditApplication.creditLimit': input.creditLimit,
            'creditApplication.paymentTerms': input.paymentTerms,
            'creditApplication.notes': input.notes,
            'creditApplication.reviewedAt': new Date(),
            'creditApplication.reviewedBy': ctx.userId,
          },
        },
        { new: true }
      );

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

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
      await connectDB();

      const customer = await Customer.findByIdAndUpdate(
        input.customerId,
        {
          $set: {
            'creditApplication.status': 'rejected',
            'creditApplication.notes': input.notes,
            'creditApplication.reviewedAt': new Date(),
            'creditApplication.reviewedBy': ctx.userId,
          },
        },
        { new: true }
      );

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // TODO: Send rejection email to customer
      // TODO: Log to audit trail

      return customer;
    }),
});
