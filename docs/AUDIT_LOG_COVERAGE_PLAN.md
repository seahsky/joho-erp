# Audit Log Coverage Plan

## Overview

This document describes the audit logging system in the Joho ERP application, including current coverage, implementation details, and the audit log viewer feature.

**Last Updated:** 2025-12-29

---

## Executive Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Audit Logging (Write) | 100% Complete | All critical operations logged |
| Audit Viewing (Read) | 100% Complete | API and UI implemented |
| Database Schema | 100% Complete | Optimized indexes in place |

**The audit logging feature is now fully production-ready!**

---

## Current Implementation

### Database Schema

**Location:** `packages/database/prisma/schema.prisma` (lines 366-387)

```prisma
model AuditLog {
  id                  String              @id @default(auto()) @map("_id") @db.ObjectId
  userId              String              // Who performed the action
  userEmail           String?             // Email of the user
  userRole            String?             // Role (admin, sales, packer, driver, manager)
  action              AuditAction         // create, update, delete, approve, reject
  entity              String              // Entity type affected
  entityId            String?             // ID of the entity
  changes             Json?               // Array of field changes (old/new values)
  metadata            Json?               // Additional context
  ipAddress           String?             // Source IP address
  userAgent           String?             // Browser/client info
  timestamp           DateTime            // When the action occurred

  @@index([userId, timestamp(sort: Desc)])
  @@index([entity, entityId, timestamp(sort: Desc)])
  @@index([action, timestamp(sort: Desc)])
  @@index([timestamp(sort: Desc)])
  @@index([userRole, timestamp(sort: Desc)])
  @@map("auditlogs")
}

enum AuditAction {
  create
  update
  delete
  approve
  reject
}
```

### Audit Service

**Location:** `packages/api/src/services/audit.ts` (1,527 lines)

The audit service provides 51 specialized logging functions organized by domain:

#### Order Domain (9 functions)
| Function | Description |
|----------|-------------|
| `logOrderCreated` | New order placed |
| `logOrderStatusChange` | Status transitions |
| `logOrderCancellation` | Order cancelled |
| `logOrderConfirmation` | Order confirmed |
| `logReorder` | Reorder from previous order |
| `logResendConfirmation` | Confirmation email resent |
| `logBackorderApproval` | Backorder approved (full/partial) |
| `logBackorderRejection` | Backorder rejected |
| `logOrderReadyForDelivery` | Order marked ready |

#### Customer Domain (6 functions)
| Function | Description |
|----------|-------------|
| `logCustomerRegistration` | Customer self-registration |
| `logCustomerProfileUpdate` | Profile changes |
| `logCustomerCreatedByAdmin` | Admin-created customer |
| `logCreditApproval` | Credit application approved |
| `logCreditRejection` | Credit application rejected |
| `logCustomerStatusChange` | Suspend/activate customer |

#### Product & Inventory (3 functions)
| Function | Description |
|----------|-------------|
| `logProductCreated` | New product created |
| `logProductUpdated` | Product updated |
| `logStockAdjustment` | Stock level adjusted |

#### Pricing Domain (3 functions)
| Function | Description |
|----------|-------------|
| `logPricingChange` | Customer pricing change |
| `logPricingChangeWithUser` | Pricing change with user info |
| `logBulkPricingImport` | Bulk import operation |

#### Packing Domain (6 functions)
| Function | Description |
|----------|-------------|
| `logPackingItemUpdate` | Item packed/unpacked |
| `logPackingNotesUpdate` | Packing notes updated |
| `logPackingOrderPauseResume` | Pause/resume packing |
| `logPackingOrderReset` | Reset packing progress |
| `logPackingItemQuantityUpdate` | Quantity modified during packing |

#### Delivery Domain (4 functions)
| Function | Description |
|----------|-------------|
| `logDriverAssignment` | Driver assigned to order |
| `logDeliveryStatusChange` | Delivery status change |
| `logProofOfDeliveryUpload` | POD uploaded |
| `logReturnToWarehouse` | Order returned to warehouse |

#### Company/Settings Domain (7 functions)
| Function | Description |
|----------|-------------|
| `logCompanyProfileUpdate` | Company info changed |
| `logCompanyLogoUpdate` | Logo updated |
| `logXeroSettingsUpdate` | Xero settings changed |
| `logDeliverySettingsUpdate` | Delivery settings changed |
| `logPackingPinUpdate` | Packing PIN changed |
| `logNotificationSettingsUpdate` | Email notifications changed |
| `logSmsSettingsUpdate` | SMS settings changed |

#### User/Permission Domain (7 functions) - CRITICAL SECURITY
| Function | Description |
|----------|-------------|
| `logUserRoleChange` | User role modified |
| `logUserStatusChange` | User deactivated/activated |
| `logUserInvitation` | User invitation sent |
| `logInvitationRevoke` | Invitation revoked |
| `logPermissionToggle` | Single permission toggled |
| `logBulkPermissionUpdate` | Bulk permission update |
| `logRolePermissionReset` | Role reset to defaults |

#### Category Domain (2 functions)
| Function | Description |
|----------|-------------|
| `logCategoryCreate` | Category created |
| `logCategoryUpdate` | Category updated |

#### Xero Integration (2 functions)
| Function | Description |
|----------|-------------|
| `logXeroSyncTrigger` | Sync job triggered |
| `logXeroJobRetry` | Failed job retried |

---

## Router Coverage Analysis

All mutation endpoints are covered with audit logging:

| Router | Mutations | Audit Calls | Coverage |
|--------|-----------|-------------|----------|
| customer.ts | 8 | 13 | 100% |
| order.ts | 9 | 19 | 100% |
| delivery.ts | 6 | 10 | 100% |
| packing.ts | 8 | 13 | 100% |
| product.ts | 3 | 4 | 100% |
| pricing.ts | 3 | 5 | 100% |
| category.ts | 2 | 3 | 100% |
| permission.ts | 3 | 6 | 100% |
| user.ts | 4 | 8 | 100% |
| company.ts | 8 | 11 | 100% |
| notification.ts | 2 | 2 | 100% |
| sms.ts | 2 | 2 | 100% |
| xero.ts | 4 | 5 | 100% |
| **cart.ts** | 4 | 0 | N/A* |
| upload.ts | 2 | 2 | 100% |

*Cart operations are intentionally not logged (temporary user state)

**Total: 103 audit logging calls across 14 routers**

---

## What Gets Logged

Each audit entry captures:

| Field | Description | Required |
|-------|-------------|----------|
| `userId` | Clerk user ID who performed the action | Yes |
| `userEmail` | User's email address | No |
| `userRole` | User's role (admin, sales, etc.) | No |
| `action` | Action type (create, update, delete, approve, reject) | Yes |
| `entity` | Entity type being changed | Yes |
| `entityId` | ID of the affected entity | No |
| `changes` | Array of field-level changes with old/new values | No |
| `metadata` | Additional context-specific data | No |
| `ipAddress` | Source IP address | No |
| `userAgent` | Browser/client information | No |
| `timestamp` | When the action occurred | Yes (auto) |

### Changes Array Format

```typescript
interface AuditChange {
  field: string;      // Field name that changed
  oldValue: unknown;  // Previous value
  newValue: unknown;  // New value
}
```

---

## Known Gaps

### 1. IP Address Not Consistently Populated (LOW PRIORITY)

The `ipAddress` field exists but is not populated in most operations. Would require extracting IP from request headers in each router.

---

## Audit Log Viewer

### API Router

**File:** `packages/api/src/routers/audit.ts`

```typescript
export const auditRouter = router({
  // Paginated list with filters
  getAll: requirePermission('settings.audit:view')
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
      entity: z.string().optional(),
      action: z.nativeEnum(AuditAction).optional(),
      userId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ input }) => {
      // Query audit logs with cursor-based pagination
    }),

  // Get audit trail for specific entity
  getByEntity: requirePermission('settings.audit:view')
    .input(z.object({
      entity: z.string(),
      entityId: z.string(),
    }))
    .query(async ({ input }) => {
      // Return all logs for entity
    }),

  // Export to CSV
  export: requirePermission('settings.audit:export')
    .input(/* same filters as getAll */)
    .mutation(async ({ input }) => {
      // Generate and return CSV data
    }),
});
```

### Admin Portal Page

**File:** `apps/admin-portal/app/[locale]/(app)/settings/audit-logs/page.tsx`

Features:
- Data table with pagination (50 items per page)
- Filter by date range, entity type, action, user
- Search by entity ID
- Expandable rows to view changes JSON
- Export to CSV button

### Permission Keys

```
settings.audit:view   - View audit logs list
settings.audit:export - Export audit logs to CSV
```

### Files to Create/Modify

| Action | File Path |
|--------|-----------|
| CREATE | `packages/api/src/routers/audit.ts` |
| MODIFY | `packages/api/src/root.ts` |
| CREATE | `apps/admin-portal/app/[locale]/(app)/settings/audit-logs/page.tsx` |
| MODIFY | `apps/admin-portal/messages/en.json` |
| MODIFY | `apps/admin-portal/messages/zh-CN.json` |
| MODIFY | `apps/admin-portal/messages/zh-TW.json` |

---

## Compliance Readiness

| Requirement | Status | Notes |
|-------------|--------|-------|
| Who (User ID) | ✅ Complete | Captured in all logs |
| What (Action) | ✅ Complete | AuditAction enum |
| When (Timestamp) | ✅ Complete | Auto-timestamped |
| Where (IP) | ⚠️ Partial | Field exists, not always populated |
| Changes (Old/New) | ✅ Complete | Changes array for updates |
| 2-Year Retention | ✅ Complete | No TTL configured |
| Export Capability | ✅ Complete | CSV export available |
| Audit UI | ✅ Complete | Settings → Audit Logs |

### Australian Privacy Principles (APP) Compliance

The audit logging system supports compliance with:
- **APP 11** - Security of personal information (access tracking)
- **APP 12** - Access to personal information (audit trail for requests)
- **GST compliance** - Financial transaction traceability

---

## Error Handling

Audit logging is designed to be non-blocking:

```typescript
await logOrderCreated(...).catch((error) => {
  console.error('Audit log failed:', error);
  // Error is logged but doesn't block the business operation
});
```

This ensures that audit failures don't impact user-facing operations.

---

## Database Indexes

The AuditLog collection has 5 strategic indexes for efficient queries:

1. `{ userId, timestamp: -1 }` - Find all actions by a user
2. `{ entity, entityId, timestamp: -1 }` - Find changes to a specific entity
3. `{ action, timestamp: -1 }` - Find all actions of a type
4. `{ timestamp: -1 }` - Recent activity queries
5. `{ userRole, timestamp: -1 }` - Activity by user role

---

## Usage Examples

### Logging an Order Creation

```typescript
import { logOrderCreated } from '../services/audit';

await logOrderCreated(
  ctx.userId,
  ctx.userEmail,
  ctx.userRole,
  {
    orderId: newOrder.id,
    customerId: input.customerId,
    orderNumber: newOrder.orderNumber,
    items: input.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    totalAmount: newOrder.totalAmount,
    isBackorder: false,
  }
);
```

### Logging a Status Change with Field Tracking

```typescript
import { logOrderStatusChange } from '../services/audit';

await logOrderStatusChange(
  ctx.userId,
  ctx.userEmail,
  ctx.userRole,
  {
    orderId: order.id,
    orderNumber: order.orderNumber,
    previousStatus: order.status,
    newStatus: input.status,
  }
);
```

---

## Conclusion

The Joho ERP audit logging system provides comprehensive coverage of all critical business operations. The logging infrastructure (write) is production-ready. The planned audit log viewer enhancement will complete the feature by enabling admins to view, filter, and export audit trails through the application.
