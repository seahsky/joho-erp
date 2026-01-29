/**
 * Xero Sync Admin Router
 *
 * Provides endpoints for managing and monitoring Xero sync jobs.
 */

import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import {
  enqueueXeroJob,
  retryJob,
  getSyncJobs,
  getSyncStats,
} from '../services/xero-queue';
import { isXeroIntegrationEnabled } from '../services/xero';
import { logXeroSyncTrigger, logXeroJobRetry } from '../services/audit';

export const xeroRouter = router({
  /**
   * Get sync jobs with filtering and pagination
   */
  getSyncJobs: requirePermission('settings.xero:view')
    .input(
      z.object({
        status: z
          .enum(['pending', 'processing', 'completed', 'failed'])
          .optional(),
        type: z
          .enum(['sync_contact', 'create_invoice', 'create_credit_note', 'update_invoice'])
          .optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return getSyncJobs({
        status: input.status,
        type: input.type,
        page: input.page,
        limit: input.limit,
      });
    }),

  /**
   * Get sync stats for dashboard
   */
  getSyncStats: requirePermission('settings.xero:view').query(async () => {
    return getSyncStats();
  }),

  /**
   * Retry a failed sync job
   */
  retryJob: requirePermission('settings.xero:sync')
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Get job details for audit
      const job = await prisma.xeroSyncJob.findUnique({
        where: { id: input.jobId },
      });

      const result = await retryJob(input.jobId);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to retry job',
        });
      }

      // Audit log - MEDIUM: Job retry tracked
      await logXeroJobRetry(ctx.userId, undefined, ctx.userRole, ctx.userName, {
        jobId: input.jobId,
        jobType: job?.type || 'unknown',
        entityType: job?.entityType || 'unknown',
        entityId: job?.entityId || '',
        previousAttempts: job?.attempts || 0,
      }).catch((error) => {
        console.error('Audit log failed for Xero job retry:', error);
      });

      return { success: true };
    }),

  /**
   * Manually trigger contact sync for a customer
   */
  syncContact: requirePermission('settings.xero:sync')
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true, creditApplication: true },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      // Check if customer has approved credit
      const creditApp = customer.creditApplication as { status?: string } | null;
      if (creditApp?.status !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer must have approved credit to sync to Xero',
        });
      }

      const jobId = await enqueueXeroJob('sync_contact', 'customer', input.customerId);

      // Audit log - MEDIUM: Xero sync trigger tracked
      await logXeroSyncTrigger(ctx.userId, undefined, ctx.userRole, ctx.userName, {
        jobType: 'sync_contact',
        entityType: 'customer',
        entityId: input.customerId,
      }).catch((error) => {
        console.error('Audit log failed for Xero sync trigger:', error);
      });

      return { success: true, jobId };
    }),

  /**
   * Manually trigger invoice creation for an order
   */
  createInvoice: requirePermission('settings.xero:sync')
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, status: true, xero: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Allow invoice creation for ready_for_delivery and later statuses
      const allowedStatuses = ['ready_for_delivery', 'out_for_delivery', 'delivered'];
      if (!allowedStatuses.includes(order.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order must be at least ready for delivery to create an invoice',
        });
      }

      const xeroInfo = order.xero as { invoiceId?: string | null } | null;
      if (xeroInfo?.invoiceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice already exists for this order',
        });
      }

      const jobId = await enqueueXeroJob('create_invoice', 'order', input.orderId);

      // Audit log - MEDIUM: Xero sync trigger tracked
      await logXeroSyncTrigger(ctx.userId, undefined, ctx.userRole, ctx.userName, {
        jobType: 'create_invoice',
        entityType: 'order',
        entityId: input.orderId,
      }).catch((error) => {
        console.error('Audit log failed for Xero invoice trigger:', error);
      });

      return { success: true, jobId };
    }),

  /**
   * Manually trigger credit note creation for an order
   */
  createCreditNote: requirePermission('settings.xero:sync')
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, status: true, xero: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      if (order.status !== 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order must be cancelled to create a credit note',
        });
      }

      const xeroInfo = order.xero as { invoiceId?: string | null; creditNoteId?: string | null } | null;
      if (!xeroInfo?.invoiceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order has no invoice to credit',
        });
      }

      if (xeroInfo?.creditNoteId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Credit note already exists for this order',
        });
      }

      const jobId = await enqueueXeroJob('create_credit_note', 'order', input.orderId);

      // Audit log - MEDIUM: Xero sync trigger tracked
      await logXeroSyncTrigger(ctx.userId, undefined, ctx.userRole, ctx.userName, {
        jobType: 'create_credit_note',
        entityType: 'order',
        entityId: input.orderId,
      }).catch((error) => {
        console.error('Audit log failed for Xero credit note trigger:', error);
      });

      return { success: true, jobId };
    }),

  /**
   * Get invoice PDF URL for an order (admin use)
   * Returns the Xero online invoice URL that can be used to view/download the invoice
   */
  getInvoicePdfUrlForOrder: requirePermission('orders:view')
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: { xero: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      const xeroInfo = order.xero as { invoiceId?: string | null; invoiceNumber?: string | null } | null;
      if (!xeroInfo?.invoiceId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No invoice exists for this order',
        });
      }

      const { getInvoicePdfUrl } = await import('../services/xero');
      const url = await getInvoicePdfUrl(xeroInfo.invoiceId);

      if (!url) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get invoice URL from Xero',
        });
      }

      return { url, invoiceNumber: xeroInfo.invoiceNumber };
    }),

  /**
   * Resync an existing invoice in Xero (update with current order data)
   */
  resyncInvoice: requirePermission('settings.xero:sync')
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, status: true, xero: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      const xeroInfo = order.xero as { invoiceId?: string | null; invoiceStatus?: string | null } | null;
      if (!xeroInfo?.invoiceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order has no existing invoice to resync',
        });
      }

      // Check if invoice status allows updates (DRAFT or AUTHORISED only)
      const status = xeroInfo.invoiceStatus?.toUpperCase();
      if (status === 'PAID' || status === 'VOIDED' || status === 'DELETED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot resync invoice with status ${status}. Only DRAFT or AUTHORISED invoices can be updated.`,
        });
      }

      const jobId = await enqueueXeroJob('update_invoice', 'order', input.orderId);

      // Audit log - MEDIUM: Xero resync trigger tracked
      await logXeroSyncTrigger(ctx.userId, undefined, ctx.userRole, ctx.userName, {
        jobType: 'update_invoice',
        entityType: 'order',
        entityId: input.orderId,
      }).catch((error) => {
        console.error('Audit log failed for Xero invoice resync trigger:', error);
      });

      return { success: true, jobId };
    }),

  /**
   * Resync an existing contact in Xero (update with current customer data)
   */
  resyncContact: requirePermission('settings.xero:sync')
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { id: true, xeroContactId: true, creditApplication: true },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      if (!customer.xeroContactId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Customer has no existing Xero contact to resync',
        });
      }

      const jobId = await enqueueXeroJob('sync_contact', 'customer', input.customerId);

      // Audit log - MEDIUM: Xero resync trigger tracked
      await logXeroSyncTrigger(ctx.userId, undefined, ctx.userRole, ctx.userName, {
        jobType: 'sync_contact',
        entityType: 'customer',
        entityId: input.customerId,
      }).catch((error) => {
        console.error('Audit log failed for Xero contact resync trigger:', error);
      });

      return { success: true, jobId };
    }),

  /**
   * Get order sync status
   */
  getOrderSyncStatus: requirePermission('settings.xero:view')
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      // Check if Xero integration is enabled
      const integrationEnabled = isXeroIntegrationEnabled();

      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: { xero: true },
      });

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      const xeroInfo = order.xero as {
        invoiceId?: string | null;
        invoiceNumber?: string | null;
        invoiceStatus?: string | null;
        creditNoteId?: string | null;
        creditNoteNumber?: string | null;
        syncedAt?: Date | null;
        syncError?: string | null;
        lastSyncJobId?: string | null;
      } | null;

      return {
        integrationEnabled,
        synced: !!xeroInfo?.invoiceId,
        invoiceId: xeroInfo?.invoiceId || null,
        invoiceNumber: xeroInfo?.invoiceNumber || null,
        invoiceStatus: xeroInfo?.invoiceStatus || null,
        creditNoteId: xeroInfo?.creditNoteId || null,
        creditNoteNumber: xeroInfo?.creditNoteNumber || null,
        syncedAt: xeroInfo?.syncedAt || null,
        syncError: xeroInfo?.syncError || null,
        lastSyncJobId: xeroInfo?.lastSyncJobId || null,
      };
    }),

  /**
   * Get customer sync status
   */
  getCustomerSyncStatus: requirePermission('settings.xero:view')
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input }) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { xeroContactId: true },
      });

      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }

      return {
        synced: !!customer.xeroContactId,
        contactId: customer.xeroContactId,
      };
    }),

  /**
   * Get a specific sync job by ID
   */
  getJob: requirePermission('settings.xero:view')
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const job = await prisma.xeroSyncJob.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sync job not found',
        });
      }

      return job;
    }),
});
