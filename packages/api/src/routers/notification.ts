import { z } from 'zod';
import { router, isAdminOrSales } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { sendTestEmail } from '../services/email';

export const notificationRouter = router({
  /**
   * Get notification settings
   */
  getSettings: isAdminOrSales.query(async () => {
    const company = await prisma.company.findFirst({
      select: {
        notificationSettings: true,
      },
    });

    if (!company) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Company not found',
      });
    }

    // Return default settings if none exist
    if (!company.notificationSettings) {
      return {
        emailRecipients: [],
        orderNotifications: {
          newOrder: true,
          orderConfirmed: true,
          orderDelivered: true,
        },
        inventoryNotifications: {
          lowStock: true,
          outOfStock: true,
        },
        customerNotifications: {
          newCustomer: true,
          creditApplication: true,
          creditApproved: true,
        },
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      };
    }

    return company.notificationSettings;
  }),

  /**
   * Update notification settings
   */
  updateSettings: isAdminOrSales
    .input(
      z.object({
        emailRecipients: z.array(z.string().email('Valid email is required')),
        orderNotifications: z.object({
          newOrder: z.boolean(),
          orderConfirmed: z.boolean(),
          orderDelivered: z.boolean(),
        }),
        inventoryNotifications: z.object({
          lowStock: z.boolean(),
          outOfStock: z.boolean(),
        }),
        customerNotifications: z.object({
          newCustomer: z.boolean(),
          creditApplication: z.boolean(),
          creditApproved: z.boolean(),
        }),
        quietHoursEnabled: z.boolean(),
        quietHoursStart: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional().nullable(),
        quietHoursEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const company = await prisma.company.findFirst();

      if (!company) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company not found',
        });
      }

      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          notificationSettings: {
            emailRecipients: input.emailRecipients,
            orderNotifications: input.orderNotifications,
            inventoryNotifications: input.inventoryNotifications,
            customerNotifications: input.customerNotifications,
            quietHoursEnabled: input.quietHoursEnabled,
            quietHoursStart: input.quietHoursStart || null,
            quietHoursEnd: input.quietHoursEnd || null,
          },
        },
      });

      return {
        success: true,
        message: 'Notification settings updated successfully',
        settings: updated.notificationSettings,
      };
    }),

  /**
   * Send a test notification email
   */
  sendTestEmail: isAdminOrSales
    .input(
      z.object({
        recipient: z.string().email('Valid email is required'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendTestEmail(input.recipient);
      return result;
    }),
});
