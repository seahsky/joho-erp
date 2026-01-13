/**
 * Xero Sync Job Queue Service
 *
 * This service handles on-demand processing of Xero sync jobs.
 * Jobs are processed immediately when triggered (no background polling).
 * Failed jobs can be manually retried via the admin API.
 */
// @ts-nocheck

import { prisma } from '@joho-erp/database';
import type { XeroSyncJob, XeroSyncJobType, XeroSyncJobStatus } from '@joho-erp/database';
import {
  syncContactToXero,
  createInvoiceInXero,
  createCreditNoteInXero,
  isConnected,
  isXeroIntegrationEnabled,
} from './xero';
import { sendCreditNoteIssuedEmail } from './email';

// ============================================================================
// Job Enqueueing
// ============================================================================

/**
 * Enqueue a Xero sync job and process it immediately
 * Returns the job ID for tracking, or null if Xero integration is disabled
 */
export async function enqueueXeroJob(
  type: 'sync_contact' | 'create_invoice' | 'create_credit_note',
  entityType: 'customer' | 'order',
  entityId: string,
  payload?: Record<string, unknown>
): Promise<string | null> {
  // Skip if Xero integration is disabled
  if (!isXeroIntegrationEnabled()) {
    console.log('Xero integration is disabled, skipping job creation');
    return null;
  }

  // Create the job record
  const job = await prisma.xeroSyncJob.create({
    data: {
      type: type as XeroSyncJobType,
      entityType,
      entityId,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      status: 'pending' as XeroSyncJobStatus,
      nextAttemptAt: new Date(),
    },
  });

  // Process immediately (fire and forget)
  processJob(job).catch((error) => {
    console.error(`Failed to process Xero job ${job.id}:`, error);
  });

  return job.id;
}

// ============================================================================
// Job Processing
// ============================================================================

/**
 * Process a single Xero sync job
 */
async function processJob(job: XeroSyncJob): Promise<void> {
  // Check if Xero is connected
  const connected = await isConnected();
  if (!connected) {
    await prisma.xeroSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        error: 'Xero is not connected',
        lastAttemptAt: new Date(),
        attempts: job.attempts + 1,
      },
    });
    return;
  }

  // Mark as processing
  await prisma.xeroSyncJob.update({
    where: { id: job.id },
    data: {
      status: 'processing',
      lastAttemptAt: new Date(),
      attempts: job.attempts + 1,
    },
  });

  try {
    let result: {
      success: boolean;
      error?: string;
      [key: string]: unknown;
    };

    switch (job.type) {
      case 'sync_contact':
        result = await processSyncContact(job.entityId);
        break;
      case 'create_invoice':
        result = await processCreateInvoice(job.entityId, job.id);
        break;
      case 'create_credit_note':
        result = await processCreateCreditNote(job.entityId, job.id);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    if (result.success) {
      await prisma.xeroSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: JSON.parse(JSON.stringify(result)),
          completedAt: new Date(),
          error: null,
        },
      });
    } else {
      await prisma.xeroSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: result.error || 'Unknown error',
        },
      });
    }
  } catch (error) {
    await prisma.xeroSyncJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// ============================================================================
// Job Processors
// ============================================================================

/**
 * Process a sync_contact job
 * Syncs a customer to Xero and updates their xeroContactId
 */
async function processSyncContact(customerId: string): Promise<{
  success: boolean;
  contactId?: string;
  error?: string;
}> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  // Cast to the expected type for sync
  const customerForSync = {
    id: customer.id,
    businessName: customer.businessName,
    xeroContactId: customer.xeroContactId,
    contactPerson: customer.contactPerson as {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      mobile?: string | null;
    },
    deliveryAddress: customer.deliveryAddress as {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    },
    billingAddress: customer.billingAddress as {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    } | null,
    creditApplication: customer.creditApplication as {
      paymentTerms?: string | null;
    },
  };

  const result = await syncContactToXero(customerForSync);

  if (result.success && result.contactId) {
    // Update customer with Xero contact ID
    await prisma.customer.update({
      where: { id: customerId },
      data: { xeroContactId: result.contactId },
    });
  }

  return result;
}

/**
 * Process a create_invoice job
 * Creates an invoice in Xero and updates the order's xero info
 */
async function processCreateInvoice(
  orderId: string,
  jobId: string
): Promise<{
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  // Check if customer is synced to Xero
  if (!order.customer.xeroContactId) {
    // Try to sync customer first
    const customerSync = await processSyncContact(order.customer.id);
    if (!customerSync.success) {
      return { success: false, error: `Customer sync failed: ${customerSync.error}` };
    }
    // Refresh customer data
    const updatedCustomer = await prisma.customer.findUnique({
      where: { id: order.customer.id },
    });
    if (!updatedCustomer?.xeroContactId) {
      return { success: false, error: 'Failed to get customer Xero contact ID' };
    }
    order.customer.xeroContactId = updatedCustomer.xeroContactId;
  }

  // Cast to the expected types for sync
  const orderForSync = {
    id: order.id,
    orderNumber: order.orderNumber,
    items: (order.items as Array<{
      productId: string;
      sku: string;
      productName: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>).map((item) => ({
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    xero: order.xero as {
      invoiceId?: string | null;
      invoiceNumber?: string | null;
      invoiceStatus?: string | null;
    } | null,
    delivery: order.delivery as {
      deliveredAt?: Date | null;
    } | null,
  };

  const customerForSync = {
    id: order.customer.id,
    businessName: order.customer.businessName,
    xeroContactId: order.customer.xeroContactId,
    contactPerson: order.customer.contactPerson as {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      mobile?: string | null;
    },
    deliveryAddress: order.customer.deliveryAddress as {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    },
    billingAddress: order.customer.billingAddress as {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    } | null,
    creditApplication: order.customer.creditApplication as {
      paymentTerms?: string | null;
    },
  };

  const result = await createInvoiceInXero(orderForSync, customerForSync);

  if (result.success) {
    // Update order with Xero invoice info
    const currentXero = (order.xero as Record<string, unknown>) || {};
    await prisma.order.update({
      where: { id: orderId },
      data: {
        xero: {
          ...currentXero,
          invoiceId: result.invoiceId,
          invoiceNumber: result.invoiceNumber,
          invoiceStatus: 'AUTHORISED',
          syncedAt: new Date(),
          syncError: null,
          lastSyncJobId: jobId,
        },
      },
    });
  } else {
    // Record error in order
    const currentXero = (order.xero as Record<string, unknown>) || {};
    await prisma.order.update({
      where: { id: orderId },
      data: {
        xero: {
          ...currentXero,
          syncError: result.error,
          lastSyncJobId: jobId,
        },
      },
    });
  }

  return result;
}

/**
 * Process a create_credit_note job
 * Creates a credit note in Xero and updates the order's xero info
 */
async function processCreateCreditNote(
  orderId: string,
  jobId: string
): Promise<{
  success: boolean;
  creditNoteId?: string;
  creditNoteNumber?: string;
  error?: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  // Cast to the expected types for sync
  const orderForSync = {
    id: order.id,
    orderNumber: order.orderNumber,
    items: (order.items as Array<{
      productId: string;
      sku: string;
      productName: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>).map((item) => ({
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    xero: order.xero as {
      invoiceId?: string | null;
      invoiceNumber?: string | null;
      invoiceStatus?: string | null;
    } | null,
    delivery: order.delivery as {
      deliveredAt?: Date | null;
    } | null,
  };

  const customerForSync = {
    id: order.customer.id,
    businessName: order.customer.businessName,
    xeroContactId: order.customer.xeroContactId,
    contactPerson: order.customer.contactPerson as {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      mobile?: string | null;
    },
    deliveryAddress: order.customer.deliveryAddress as {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    },
    billingAddress: order.customer.billingAddress as {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    } | null,
    creditApplication: order.customer.creditApplication as {
      paymentTerms?: string | null;
    },
  };

  const result = await createCreditNoteInXero(orderForSync, customerForSync);

  if (result.success) {
    // Update order with credit note info
    const currentXero = (order.xero as Record<string, unknown>) || {};
    await prisma.order.update({
      where: { id: orderId },
      data: {
        xero: {
          ...currentXero,
          creditNoteId: result.creditNoteId,
          creditNoteNumber: result.creditNoteNumber,
          invoiceStatus: 'CREDITED',
          syncedAt: new Date(),
          syncError: null,
          lastSyncJobId: jobId,
        },
      },
    });

    // Send credit note issued email to customer
    const cancellationReason = (order as { cancellationReason?: string }).cancellationReason;
    await sendCreditNoteIssuedEmail({
      customerEmail: customerForSync.contactPerson.email,
      customerName: customerForSync.businessName,
      orderNumber: order.orderNumber,
      creditNoteNumber: result.creditNoteNumber || '',
      refundAmount: order.totalAmount,
      reason: cancellationReason || 'Order cancelled',
    }).catch((error) => {
      console.error('Failed to send credit note issued email:', error);
    });
  } else {
    // Record error in order
    const currentXero = (order.xero as Record<string, unknown>) || {};
    await prisma.order.update({
      where: { id: orderId },
      data: {
        xero: {
          ...currentXero,
          syncError: result.error,
          lastSyncJobId: jobId,
        },
      },
    });
  }

  return result;
}

// ============================================================================
// Manual Retry
// ============================================================================

/**
 * Manually retry a failed job
 * Resets the job status and processes it again
 */
export async function retryJob(jobId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const job = await prisma.xeroSyncJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'failed') {
    return { success: false, error: 'Only failed jobs can be retried' };
  }

  // Reset job for retry
  const updatedJob = await prisma.xeroSyncJob.update({
    where: { id: jobId },
    data: {
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(),
      error: null,
    },
  });

  // Process immediately
  processJob(updatedJob).catch((error) => {
    console.error(`Failed to process Xero job ${jobId}:`, error);
  });

  return { success: true };
}

// ============================================================================
// Job Queries
// ============================================================================

/**
 * Get sync jobs with filtering and pagination
 */
export async function getSyncJobs(options: {
  status?: XeroSyncJobStatus;
  type?: XeroSyncJobType;
  page?: number;
  limit?: number;
}): Promise<{
  jobs: XeroSyncJob[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: { status?: XeroSyncJobStatus; type?: XeroSyncJobType } = {};
  if (options.status) where.status = options.status;
  if (options.type) where.type = options.type;

  const [jobs, total] = await Promise.all([
    prisma.xeroSyncJob.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.xeroSyncJob.count({ where }),
  ]);

  return {
    jobs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get sync stats for the dashboard
 */
export async function getSyncStats(): Promise<{
  pending: number;
  failed: number;
  completedToday: number;
}> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [pending, failed, completedToday] = await Promise.all([
    prisma.xeroSyncJob.count({ where: { status: 'pending' } }),
    prisma.xeroSyncJob.count({ where: { status: 'failed' } }),
    prisma.xeroSyncJob.count({
      where: {
        status: 'completed',
        completedAt: { gte: startOfDay },
      },
    }),
  ]);

  return { pending, failed, completedToday };
}
