import { z } from "zod";
import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        businessName: z.string().min(1),
        abn: z.string().min(11).max(11),
        contactPerson: z.string().min(1),
        phone: z.string().min(1),
        businessStreet: z.string().min(1),
        businessSuburb: z.string().min(1),
        businessState: z.string().min(1),
        businessPostcode: z.string().min(1),
        deliveryStreet: z.string().min(1),
        deliverySuburb: z.string().min(1),
        deliveryState: z.string().min(1),
        deliveryPostcode: z.string().min(1),
        requestedCreditLimit: z.number().optional(),
        yearsInBusiness: z.number().optional(),
        annualRevenue: z.string().optional(),
        businessType: z.string().optional(),
        bankName: z.string().optional(),
        bankAccount: z.string().optional(),
        bankBsb: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Check if ABN already exists
      const existingAbn = await ctx.db.customer.findUnique({
        where: { abn: input.abn },
      });

      if (existingAbn) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Business with this ABN already exists",
        });
      }

      const passwordHash = await hash(input.password, 12);

      // Auto-assign delivery area based on suburb (simplified)
      const deliveryArea = getDeliveryAreaFromSuburb(input.deliverySuburb);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: "CUSTOMER",
          name: input.contactPerson,
          phone: input.phone,
          customer: {
            create: {
              businessName: input.businessName,
              abn: input.abn,
              contactPerson: input.contactPerson,
              businessStreet: input.businessStreet,
              businessSuburb: input.businessSuburb,
              businessState: input.businessState,
              businessPostcode: input.businessPostcode,
              deliveryStreet: input.deliveryStreet,
              deliverySuburb: input.deliverySuburb,
              deliveryState: input.deliveryState,
              deliveryPostcode: input.deliveryPostcode,
              deliveryArea,
              requestedCreditLimit: input.requestedCreditLimit,
              yearsInBusiness: input.yearsInBusiness,
              annualRevenue: input.annualRevenue,
              businessType: input.businessType,
              bankName: input.bankName,
              bankAccount: input.bankAccount,
              bankBsb: input.bankBsb,
              status: "PENDING",
            },
          },
        },
      });

      return {
        success: true,
        message: "Registration successful. Your account is pending approval.",
      };
    }),
});

// Helper function to determine delivery area from suburb
// In production, this should use a proper suburb-to-area mapping database
function getDeliveryAreaFromSuburb(suburb: string): string {
  const suburbLower = suburb.toLowerCase();

  // Simplified mapping - in production use a proper database
  const northSuburbs = ["northbridge", "chatswood", "mosman", "manly"];
  const southSuburbs = ["hurstville", "kogarah", "cronulla", "sutherland"];
  const eastSuburbs = ["bondi", "randwick", "maroubra", "coogee"];
  const westSuburbs = ["parramatta", "penrith", "blacktown", "liverpool"];

  if (northSuburbs.some((s) => suburbLower.includes(s))) return "North";
  if (southSuburbs.some((s) => suburbLower.includes(s))) return "South";
  if (eastSuburbs.some((s) => suburbLower.includes(s))) return "East";
  if (westSuburbs.some((s) => suburbLower.includes(s))) return "West";

  return "Central"; // Default
}
