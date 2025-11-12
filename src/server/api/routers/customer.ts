import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const customerRouter = createTRPCRouter({
  // Get current customer profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if ((user as any).role !== "CUSTOMER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only customers can access this",
      });
    }

    const customer = await ctx.db.customer.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!customer) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
    }

    return customer;
  }),

  // Admin: Get all customers
  getAll: adminProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
        search: z.string().optional(),
        deliveryArea: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const customers = await ctx.db.customer.findMany({
        where: {
          ...(input.status && { status: input.status }),
          ...(input.deliveryArea && { deliveryArea: input.deliveryArea }),
          ...(input.search && {
            OR: [
              { businessName: { contains: input.search, mode: "insensitive" } },
              { contactPerson: { contains: input.search, mode: "insensitive" } },
              { abn: { contains: input.search, mode: "insensitive" } },
              { user: { email: { contains: input.search, mode: "insensitive" } } },
            ],
          }),
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return customers;
    }),

  // Admin: Get single customer
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              phone: true,
              lastLogin: true,
            },
          },
          tradeReferences: true,
          creditApplicationDocs: true,
        },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      return customer;
    }),

  // Admin: Update customer
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        businessName: z.string().optional(),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        creditLimit: z.number().optional(),
        paymentTerms: z.string().optional(),
        deliveryArea: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, phone, ...customerData } = input;

      const customer = await ctx.db.customer.update({
        where: { id },
        data: customerData,
      });

      if (phone) {
        await ctx.db.user.update({
          where: { id: customer.userId },
          data: { phone },
        });
      }

      return customer;
    }),

  // Admin: Approve credit application
  approveCredit: adminProcedure
    .input(
      z.object({
        id: z.string(),
        creditLimit: z.number().positive(),
        paymentTerms: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          creditLimit: input.creditLimit,
          paymentTerms: input.paymentTerms,
        },
      });

      // TODO: Send approval email to customer

      return customer;
    }),

  // Admin: Reject credit application
  rejectCredit: adminProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          notes: input.reason,
        },
      });

      // TODO: Send rejection email to customer with reason

      return customer;
    }),
});
