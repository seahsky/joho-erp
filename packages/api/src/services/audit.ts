/**
 * Audit Trail Logging Service
 *
 * This service provides centralized audit logging for tracking
 * changes to business entities across the system.
 */

import { prisma } from '@joho-erp/database';
import type { AuditAction } from '@joho-erp/database';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLogParams {
  userId: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        changes: params.changes ? JSON.parse(JSON.stringify(params.changes)) : undefined,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log the error but don't throw - audit logging should not block business operations
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log order creation
 */
export async function logOrderCreated(
  userId: string,
  orderId: string,
  orderNumber: string,
  customerId: string,
  totalAmount: number
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'create',
    entity: 'order',
    entityId: orderId,
    metadata: {
      orderNumber,
      customerId,
      totalAmount,
    },
  });
}

/**
 * Log order status change
 */
export async function logOrderStatusChange(
  userId: string,
  orderId: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'update',
    entity: 'order',
    entityId: orderId,
    changes: [
      {
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
      },
    ],
    metadata: {
      orderNumber,
      reason,
    },
  });
}

/**
 * Log order cancellation
 */
export async function logOrderCancellation(
  userId: string,
  orderId: string,
  orderNumber: string,
  reason: string,
  previousStatus: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'update',
    entity: 'order',
    entityId: orderId,
    changes: [
      {
        field: 'status',
        oldValue: previousStatus,
        newValue: 'cancelled',
      },
    ],
    metadata: {
      orderNumber,
      cancellationReason: reason,
    },
  });
}

/**
 * Log backorder approval
 */
export async function logBackorderApproval(
  userId: string,
  orderId: string,
  orderNumber: string,
  approvalType: 'full' | 'partial',
  approvedQuantities?: Record<string, number>
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'approve',
    entity: 'order',
    entityId: orderId,
    metadata: {
      orderNumber,
      approvalType,
      approvedQuantities,
    },
  });
}

/**
 * Log backorder rejection
 */
export async function logBackorderRejection(
  userId: string,
  orderId: string,
  orderNumber: string,
  reason: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'reject',
    entity: 'order',
    entityId: orderId,
    metadata: {
      orderNumber,
      rejectionReason: reason,
    },
  });
}

/**
 * Log credit approval
 */
export async function logCreditApproval(
  userId: string,
  customerId: string,
  customerName: string,
  creditLimit: number,
  paymentTerms?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'approve',
    entity: 'customer',
    entityId: customerId,
    metadata: {
      customerName,
      creditLimit,
      paymentTerms,
      type: 'credit_application',
    },
  });
}

/**
 * Log credit rejection
 */
export async function logCreditRejection(
  userId: string,
  customerId: string,
  customerName: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'reject',
    entity: 'customer',
    entityId: customerId,
    metadata: {
      customerName,
      rejectionReason: reason,
      type: 'credit_application',
    },
  });
}

/**
 * Log pricing change
 */
export async function logPricingChange(
  userId: string,
  pricingId: string,
  customerId: string,
  productId: string,
  oldPrice: number | null,
  newPrice: number,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entity: 'customer_pricing',
    entityId: pricingId,
    changes:
      action === 'update'
        ? [
            {
              field: 'customPrice',
              oldValue: oldPrice,
              newValue: newPrice,
            },
          ]
        : undefined,
    metadata: {
      customerId,
      productId,
      newPrice,
    },
  });
}

/**
 * Log customer registration
 */
export async function logCustomerRegistration(
  userId: string,
  customerId: string,
  businessName: string,
  abn: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'create',
    entity: 'customer',
    entityId: customerId,
    metadata: {
      businessName,
      abn,
      type: 'registration',
    },
  });
}

/**
 * Log customer profile update
 */
export async function logCustomerProfileUpdate(
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  customerId: string,
  customerName: string,
  changes: AuditChange[]
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userRole,
    action: 'update',
    entity: 'customer',
    entityId: customerId,
    changes,
    metadata: {
      customerName,
      type: 'profile_update',
    },
  });
}

/**
 * Log customer creation by admin
 */
export async function logCustomerCreatedByAdmin(
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  customerId: string,
  businessName: string,
  abn: string
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userRole,
    action: 'create',
    entity: 'customer',
    entityId: customerId,
    metadata: {
      businessName,
      abn,
      type: 'admin_created',
    },
  });
}

/**
 * Log product creation
 */
export async function logProductCreated(
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  productId: string,
  sku: string,
  productName: string,
  basePrice: number
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userRole,
    action: 'create',
    entity: 'product',
    entityId: productId,
    metadata: {
      sku,
      productName,
      basePrice,
    },
  });
}

/**
 * Log product update
 */
export async function logProductUpdated(
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  productId: string,
  sku: string,
  changes: AuditChange[]
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userRole,
    action: 'update',
    entity: 'product',
    entityId: productId,
    changes,
    metadata: {
      sku,
    },
  });
}

/**
 * Log pricing change with user info
 */
export async function logPricingChangeWithUser(
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  pricingId: string,
  customerId: string,
  productId: string,
  oldPrice: number | null,
  newPrice: number,
  action: 'create' | 'update' | 'delete',
  notes?: string
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userRole,
    action,
    entity: 'customer_pricing',
    entityId: pricingId,
    changes:
      action === 'update'
        ? [
            {
              field: 'customPrice',
              oldValue: oldPrice,
              newValue: newPrice,
            },
          ]
        : undefined,
    metadata: {
      customerId,
      productId,
      newPrice,
      notes,
    },
  });
}

/**
 * Log bulk pricing import
 */
export async function logBulkPricingImport(
  userId: string,
  userEmail: string | undefined,
  userRole: string | undefined,
  importCount: number,
  successCount: number,
  errorCount: number
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userRole,
    action: 'create',
    entity: 'customer_pricing',
    metadata: {
      type: 'bulk_import',
      importCount,
      successCount,
      errorCount,
    },
  });
}
