import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { sendTestSms, isSmsConfigured } from '../services/sms';
import { DEFAULT_SMS_TEMPLATE, DEFAULT_SMS_SEND_TIME } from '@joho-erp/shared';
import { logSmsSettingsUpdate } from '../services/audit';

export const smsRouter = router({
  /**
   * Get SMS settings
   */
  getSettings: requirePermission('settings.sms:view').query(async () => {
    const company = await prisma.company.findFirst({
      select: {
        smsSettings: true,
      },
    });

    if (!company) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Company not found',
      });
    }

    // Return default settings if none exist
    const settings = company.smsSettings || {
      enabled: false,
      messageTemplate: DEFAULT_SMS_TEMPLATE,
      sendTime: DEFAULT_SMS_SEND_TIME,
    };

    return {
      ...settings,
      // Include whether Twilio is configured via env vars
      isConfigured: isSmsConfigured(),
    };
  }),

  /**
   * Update SMS settings
   */
  updateSettings: requirePermission('settings.sms:edit')
    .input(
      z.object({
        enabled: z.boolean(),
        messageTemplate: z
          .string()
          .max(160, 'Message template must be 160 characters or less')
          .optional()
          .nullable(),
        sendTime: z
          .string()
          .regex(
            /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
            'Invalid time format (HH:mm)'
          )
          .optional()
          .nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
          smsSettings: {
            enabled: input.enabled,
            messageTemplate: input.messageTemplate || DEFAULT_SMS_TEMPLATE,
            sendTime: input.sendTime || DEFAULT_SMS_SEND_TIME,
          },
        },
      });

      // Audit log for SMS settings update
      await logSmsSettingsUpdate(
        ctx.userId,
        undefined, // userEmail not available in context
        ctx.userRole,
        company.id,
        [],
        { fieldsChanged: Object.keys(input) }
      ).catch((error) => {
        console.error('Audit log failed for SMS settings update:', error);
      });

      return {
        success: true,
        message: 'SMS settings updated successfully',
        settings: updated.smsSettings,
      };
    }),

  /**
   * Send a test SMS
   */
  sendTestSms: requirePermission('settings.sms:edit')
    .input(
      z.object({
        phoneNumber: z
          .string()
          .min(10, 'Phone number is required')
          .regex(
            /^\+?[0-9]{10,15}$/,
            'Invalid phone number format'
          ),
      })
    )
    .mutation(async ({ input }) => {
      if (!isSmsConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'SMS service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.',
        });
      }

      const result = await sendTestSms(input.phoneNumber);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.message,
        });
      }

      return result;
    }),

  /**
   * Check if SMS service is configured (for UI indication)
   */
  checkConfiguration: requirePermission('settings.sms:view').query(async () => {
    return {
      isConfigured: isSmsConfigured(),
    };
  }),
});
