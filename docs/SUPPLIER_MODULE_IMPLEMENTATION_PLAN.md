# Supplier Management Module - Complete Implementation Plan

**Status:** Implementation In Progress - Phases 1-6 Complete, Phase 7 Pending
**Created:** 2026-01-12
**Last Updated:** 2026-01-12
**Estimated Duration:** 17-19 days (7 phases)

### Implementation Progress
- [x] Phase 1: Database Foundation - COMPLETE (Schema already existed)
- [x] Phase 2: Permissions & API - COMPLETE (11 endpoints with validation)
- [x] Phase 3: Navigation & i18n - COMPLETE (50+ keys in 3 languages)
- [x] Phase 4: List Page - COMPLETE (Stats cards, search, filters, responsive table)
- [x] Phase 5: Create Page - COMPLETE (Tabbed form with 6 sections, validation, monetary handling)
- [x] Phase 6: Detail Page & Product Linking - COMPLETE (Edit mode toggle, floating action bar, product linking)
- [ ] Phase 7: Integration & Testing - PENDING (Build verification, testing)

> **Plan Update (2026-01-12)**: Comprehensive update to match Customer module patterns:
> - Added 2 missing API endpoints (delete, getCategories) - now 11 total
> - Added complete SupplierStatusBadge component implementation
> - Added complete LinkProductDialog component with product search
> - Expanded Create Page with 7 key form patterns (state management, error tracking, validation)
> - Enhanced Detail Page with edit mode toggle, floating action bar, and suspension dialogs
> - Added performance metrics, compliance, and linked products table patterns
> - Expanded i18n keys (90+ keys for supplierDetail namespace)
> - Uses full page pattern for create/edit operations (not dialogs) due to form complexity (40+ fields)

> **Plan Update (2026-01-12)**: Phases 4-6 marked COMPLETE. All frontend pages implemented:
> - **List Page**: Stats cards (total/active/pending/suspended), search, status filter, responsive table with mobile card view
> - **Create Page**: 6-tab form (business info, contact & address, financial terms, delivery terms, categories, compliance), per-tab validation, monetary handling with parseToCents
> - **Detail Page**: Two-column layout, edit mode with floating action bar, product linking via LinkProductDialog, suspend/activate dialogs with reason validation
> - **Components**: SupplierStatusBadge (maps status to StatusBadge), LinkProductDialog (product search, cost price, preferred supplier)
> - Files pending commit: `[id]/page.tsx`, `new/page.tsx`, `LinkProductDialog.tsx`

---

## Table of Contents
1. [Overview](#overview)
2. [Critical Files](#critical-files)
3. [Database Schema Design](#database-schema-design)
4. [API Layer Design](#api-layer-design)
5. [Permission System](#permission-system)
6. [Frontend Architecture](#frontend-architecture)
7. [Internationalization](#internationalization)
8. [Monetary Handling](#monetary-handling)
9. [Implementation Phases](#implementation-phases)
10. [Code Patterns & Examples](#code-patterns--examples)
11. [Testing Strategy](#testing-strategy)
12. [Challenges & Solutions](#challenges--solutions)

---

## Overview

### Goal
Add a comprehensive supplier management module to the Joho Foods ERP admin portal that seamlessly integrates with existing systems for inventory management, product tracking, and financial reconciliation.

### Key Features
- Full CRUD operations for suppliers
- Contact and address management
- Payment terms and credit limit tracking (all in cents)
- Delivery terms configuration
- Many-to-many product relationships with cost tracking
- Integration with inventory batch tracking
- Status management (active, inactive, pending, suspended)
- Permission-based access control
- Multi-language support (English, Simplified Chinese, Traditional Chinese)
- Mobile-responsive UI

### Principles
- **KISS** - Keep implementations simple and straightforward
- **DRY** - Reuse existing patterns and components
- **Type Safety** - Full TypeScript coverage
- **i18n First** - All text internationalized
- **Money Safety** - All monetary values as integers (cents)

---

## Critical Files

### 1. Database Schema
**File:** `/packages/database/prisma/schema.prisma`

**Additions:**
- Enums: `SupplierStatus`, `PaymentMethod`
- Composite Types: `SupplierContact`, `SupplierAddress`, `SupplierBankDetails`
- Model: `Supplier` (primary entity)
- Model: `ProductSupplier` (junction table for product relationships)

**Modifications:**
- `Product` model: Add `suppliers ProductSupplier[]` relation
- `InventoryBatch` model: Add `supplierId` and `supplier` relation

### 2. API Layer
**File:** `/packages/api/src/routers/supplier.ts` (NEW)
- Complete tRPC router with all CRUD endpoints
- Validation schemas using Zod
- Permission middleware integration

**File:** `/packages/api/src/root.ts`
- Register supplier router

### 3. Permissions
**File:** `/packages/shared/src/constants/permissions.ts`
- Add supplier permissions

**File:** `/packages/shared/src/types/permissions.ts`
- Add permission type definitions

### 4. Navigation
**File:** `/apps/admin-portal/config/navigation.ts`
- Add supplier navigation item

### 5. Translation Files (ALL THREE)
- `/apps/admin-portal/messages/en.json`
- `/apps/admin-portal/messages/zh-CN.json`
- `/apps/admin-portal/messages/zh-TW.json`

### 6. Frontend Pages & Components (ALL NEW)
```
apps/admin-portal/app/[locale]/(app)/suppliers/
├── page.tsx                           # List page with stats, search, filters
├── new/
│   └── page.tsx                       # Create page (tabbed form, matches Customer pattern)
├── [id]/
│   └── page.tsx                       # Detail/Edit page (view mode + edit mode toggle)
└── components/
    ├── SupplierStatusBadge.tsx        # Status badge component
    └── LinkProductDialog.tsx          # Product linking dialog (simple)
```

> **Note**: Uses full page pattern (like Customers) instead of dialogs for create/edit operations due to form complexity (40+ fields across multiple sections).

---

## Database Schema Design

### Enums

```prisma
enum SupplierStatus {
  active
  inactive
  pending_approval
  suspended
}

enum PaymentMethod {
  bank_transfer
  credit_card
  cheque
  cash_on_delivery
  account_credit
}
```

### Composite Types

```prisma
type SupplierContact {
  name                String
  position            String?
  email               String
  phone               String
  mobile              String?
}

type SupplierAddress {
  street              String
  suburb              String
  state               AustralianState
  postcode            String
  country             String              @default("Australia")
}

type SupplierBankDetails {
  accountName         String
  bsb                 String
  accountNumber       String
  bankName            String?
}
```

### Supplier Model

```prisma
model Supplier {
  id                  String              @id @default(auto()) @map("_id") @db.ObjectId

  // Business Information
  supplierCode        String              @unique
  businessName        String
  tradingName         String?
  abn                 String?             // Australian Business Number
  acn                 String?             // Australian Company Number

  // Contact Information
  primaryContact      SupplierContact
  secondaryContact    SupplierContact?
  accountsContact     SupplierContact?    // For invoicing/payments

  // Address
  businessAddress     SupplierAddress
  deliveryAddress     SupplierAddress?    // If different from business

  // Financial Terms (ALL IN CENTS)
  paymentTerms        String?             // e.g., "Net 30", "COD"
  paymentMethod       PaymentMethod       @default(account_credit)
  creditLimit         Int                 @default(0)        // In cents
  currentBalance      Int                 @default(0)        // In cents
  bankDetails         SupplierBankDetails?

  // Delivery Terms
  minimumOrderValue   Int?                                   // In cents
  minimumOrderQty     Float?
  leadTimeDays        Int?                // Standard lead time in days
  deliveryDays        String?             // e.g., "Mon, Wed, Fri"
  deliveryNotes       String?

  // Product Categories (what they supply)
  primaryCategories   String[]            // e.g., ["Beef", "Lamb"]

  // Performance & Compliance
  qualityRating       Float?              // 0-5 stars (optional)
  onTimeDeliveryRate  Float?              // 0-100 percentage
  foodSafetyLicense   String?
  licenseExpiry       DateTime?
  insuranceExpiry     DateTime?

  // Status & Metadata
  status              SupplierStatus      @default(active)
  suspensionReason    String?             // Required if suspended
  suspendedAt         DateTime?
  suspendedBy         String?             // User who suspended
  internalNotes       String?

  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  createdBy           String              // Clerk user ID

  // Relations
  products            ProductSupplier[]   // Many-to-many with products
  inventoryBatches    InventoryBatch[]    // Batches received from supplier

  // Indexes
  @@index([status])
  @@index([supplierCode])
  @@index([businessName])
  @@index([primaryCategories])
  @@index([createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])  // Filtered list queries
  @@index([businessName, status])           // Search with filter
  @@map("suppliers")
}
```

### ProductSupplier Junction Model

```prisma
model ProductSupplier {
  id                  String              @id @default(auto()) @map("_id") @db.ObjectId
  productId           String              @db.ObjectId
  supplierId          String              @db.ObjectId

  // Product-specific supplier details
  supplierSku         String?             // Supplier's SKU for this product
  supplierProductName String?             // Supplier's name for product
  costPrice           Int                 // In cents - current cost
  lastCostPrice       Int?                // In cents - previous cost for comparison

  // Ordering
  packSize            Float?              // How product is packed by supplier
  moq                 Float?              // Minimum order quantity
  leadTimeDays        Int?                // Product-specific lead time

  // Performance & Status
  isPreferredSupplier Boolean             @default(false)
  lastOrderDate       DateTime?
  lastReceiveDate     DateTime?
  totalOrdersCount    Int                 @default(0)
  isActive            Boolean             @default(true)
  discontinuedAt      DateTime?

  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  // Relations
  product             Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier            Supplier            @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  // Constraints & Indexes
  @@unique([productId, supplierId])       // One record per product-supplier pair
  @@index([supplierId, isActive])
  @@index([productId, isActive])
  @@index([isPreferredSupplier])
  @@map("productsuppliers")
}
```

### Updates to Existing Models

**Product Model:**
```prisma
model Product {
  // ... existing fields

  // ADD THIS:
  suppliers           ProductSupplier[]   // Suppliers for this product

  // ... rest of model
}
```

**InventoryBatch Model:**
```prisma
model InventoryBatch {
  // ... existing fields

  // ADD THESE:
  supplierId          String?             @db.ObjectId
  supplier            Supplier?           @relation(fields: [supplierId], references: [id])

  // ... rest of model

  // ADD THIS INDEX:
  @@index([supplierId])
}
```

---

## API Layer Design

### Router Structure

**File:** `/packages/api/src/routers/supplier.ts`

```typescript
import { z } from 'zod';
import { router, requirePermission, protectedProcedure } from '../trpc';
import { prisma, SupplierStatus, PaymentMethod, AustralianState } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { buildPrismaOrderBy, paginatePrismaQuery } from '@joho-erp/shared';
import { sortInputSchema } from '../schemas';
import { createAuditLog } from '../services/audit';
import type { AuditChange } from '../services/audit';

// Validation Schemas
const supplierContactSchema = z.object({
  name: z.string().min(1),
  position: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(1),
  mobile: z.string().optional(),
});

const supplierAddressSchema = z.object({
  street: z.string().min(1),
  suburb: z.string().min(1),
  state: z.nativeEnum(AustralianState),
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  country: z.string().default('Australia'),
});

const bankDetailsSchema = z.object({
  accountName: z.string().min(1),
  bsb: z.string().regex(/^\d{6}$/, 'BSB must be 6 digits'),
  accountNumber: z.string().min(1),
  bankName: z.string().optional(),
});

const createSupplierSchema = z.object({
  supplierCode: z.string().min(1),
  businessName: z.string().min(1),
  tradingName: z.string().optional(),
  abn: z.string().optional(),
  acn: z.string().optional(),
  primaryContact: supplierContactSchema,
  secondaryContact: supplierContactSchema.optional(),
  accountsContact: supplierContactSchema.optional(),
  businessAddress: supplierAddressSchema,
  deliveryAddress: supplierAddressSchema.optional(),
  paymentTerms: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default('account_credit'),
  creditLimit: z.number().int().nonnegative(), // In cents
  minimumOrderValue: z.number().int().nonnegative().optional(), // In cents
  leadTimeDays: z.number().int().positive().optional(),
  deliveryDays: z.string().optional(),
  deliveryNotes: z.string().optional(),
  primaryCategories: z.array(z.string()),
  bankDetails: bankDetailsSchema.optional(),
  internalNotes: z.string().optional(),
});

// Sort field mapping
const supplierSortFieldMapping: Record<string, string> = {
  name: 'businessName',
  code: 'supplierCode',
  status: 'status',
  createdAt: 'createdAt',
};

export const supplierRouter = router({
  // List all suppliers with filtering, sorting, pagination
  getAll: requirePermission('suppliers:view')
    .input(
      z.object({
        search: z.string().optional(),
        status: z.nativeEnum(SupplierStatus).optional(),
        category: z.string().optional(),
      }).merge(sortInputSchema)  // Adds sortBy, sortOrder, page, limit
    )
    .query(async ({ input }) => {
      const { page, limit, sortBy, sortOrder, ...filters } = input;

      // Build where clause
      const where: any = {};

      if (filters.search) {
        where.OR = [
          { businessName: { contains: filters.search, mode: 'insensitive' } },
          { supplierCode: { contains: filters.search, mode: 'insensitive' } },
          { tradingName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.category) {
        where.primaryCategories = { has: filters.category };
      }

      // Build order by
      const orderBy = sortBy && supplierSortFieldMapping[sortBy]
        ? buildPrismaOrderBy(sortBy, sortOrder, supplierSortFieldMapping)
        : { businessName: 'asc' as const };

      // Execute with paginatePrismaQuery utility
      const result = await paginatePrismaQuery(prisma.supplier, where, {
        page,
        limit,
        orderBy,
        include: {
          _count: { select: { products: true, inventoryBatches: true } },
        },
      });

      return {
        suppliers: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      };
    }),

  // Get supplier by ID with full details
  getById: requirePermission('suppliers:view')
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const supplier = await prisma.supplier.findUnique({
        where: { id: input.id },
        include: {
          products: {
            include: {
              product: true,
            },
            where: { isActive: true },
          },
          inventoryBatches: {
            where: { isConsumed: false },
            orderBy: { receivedAt: 'desc' },
            take: 10,
            include: {
              product: true,
            },
          },
        },
      });

      if (!supplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      return supplier;
    }),

  // Get aggregate statistics
  getStats: requirePermission('suppliers:view')
    .query(async () => {
      const [total, active, inactive, suspended, pendingApproval] = await Promise.all([
        prisma.supplier.count(),
        prisma.supplier.count({ where: { status: 'active' } }),
        prisma.supplier.count({ where: { status: 'inactive' } }),
        prisma.supplier.count({ where: { status: 'suspended' } }),
        prisma.supplier.count({ where: { status: 'pending_approval' } }),
      ]);

      return {
        total,
        active,
        inactive,
        suspended,
        pendingApproval,
      };
    }),

  // Create new supplier
  create: requirePermission('suppliers:create')
    .input(createSupplierSchema)
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate supplier code
      const existing = await prisma.supplier.findUnique({
        where: { supplierCode: input.supplierCode },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Supplier code already exists',
        });
      }

      // Create supplier
      const supplier = await prisma.supplier.create({
        data: {
          ...input,
          createdBy: ctx.userId!,
        },
      });

      // Audit log
      await createAuditLog({
        userId: ctx.userId!,
        action: 'create',
        entity: 'supplier',
        entityId: supplier.id,
        metadata: { supplierCode: supplier.supplierCode, businessName: supplier.businessName },
      });

      return supplier;
    }),

  // Update supplier
  update: requirePermission('suppliers:edit')
    .input(
      z.object({
        id: z.string(),
        data: createSupplierSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Fetch current for change tracking
      const existing = await prisma.supplier.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Update supplier
      const supplier = await prisma.supplier.update({
        where: { id },
        data,
      });

      // Calculate field-level changes
      const changes: AuditChange[] = [];
      for (const [key, newValue] of Object.entries(data)) {
        const oldValue = existing[key as keyof typeof existing];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({ field: key, oldValue, newValue });
        }
      }

      // Audit log with changes
      await createAuditLog({
        userId: ctx.userId!,
        action: 'update',
        entity: 'supplier',
        entityId: id,
        changes,
        metadata: { supplierCode: supplier.supplierCode },
      });

      return supplier;
    }),

  // Update supplier status
  updateStatus: requirePermission('suppliers:edit')
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(SupplierStatus),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, status, reason } = input;

      // Fetch current for change tracking
      const existing = await prisma.supplier.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      const oldStatus = existing.status;
      const updateData: any = { status };

      if (status === 'suspended') {
        if (!reason) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Suspension reason is required',
          });
        }
        updateData.suspensionReason = reason;
        updateData.suspendedAt = new Date();
        updateData.suspendedBy = ctx.userId;
      } else {
        // Clear suspension data
        updateData.suspensionReason = null;
        updateData.suspendedAt = null;
        updateData.suspendedBy = null;
      }

      const supplier = await prisma.supplier.update({
        where: { id },
        data: updateData,
      });

      // Audit log status change with field-level tracking
      await createAuditLog({
        userId: ctx.userId!,
        action: 'update',
        entity: 'supplier',
        entityId: id,
        changes: [{ field: 'status', oldValue: oldStatus, newValue: status }],
        metadata: { supplierCode: supplier.supplierCode, reason },
      });

      return supplier;
    }),

  // Link product to supplier
  linkProduct: requirePermission('suppliers:edit')
    .input(
      z.object({
        supplierId: z.string(),
        productId: z.string(),
        supplierSku: z.string().optional(),
        supplierProductName: z.string().optional(),
        costPrice: z.number().int().positive(), // In cents
        packSize: z.number().positive().optional(),
        moq: z.number().positive().optional(),
        leadTimeDays: z.number().int().positive().optional(),
        isPreferredSupplier: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // Check for existing link
      const existing = await prisma.productSupplier.findUnique({
        where: {
          productId_supplierId: {
            productId: input.productId,
            supplierId: input.supplierId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Product is already linked to this supplier',
        });
      }

      // Create link
      const link = await prisma.productSupplier.create({
        data: input,
      });

      return link;
    }),

  // Update product-supplier link
  updateProductLink: requirePermission('suppliers:edit')
    .input(
      z.object({
        id: z.string(),
        costPrice: z.number().int().positive().optional(), // In cents
        packSize: z.number().positive().optional(),
        moq: z.number().positive().optional(),
        leadTimeDays: z.number().int().positive().optional(),
        isPreferredSupplier: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const link = await prisma.productSupplier.update({
        where: { id },
        data,
      });

      return link;
    }),

  // Get products for supplier
  getProducts: requirePermission('suppliers:view')
    .input(
      z.object({
        supplierId: z.string(),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const where: any = { supplierId: input.supplierId };

      if (!input.includeInactive) {
        where.isActive = true;
      }

      const products = await prisma.productSupplier.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: { isPreferredSupplier: 'desc' },
      });

      return products;
    }),

  // Delete supplier (soft delete)
  delete: requirePermission('suppliers:delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;

      // Fetch supplier for validation
      const existing = await prisma.supplier.findUnique({
        where: { id },
        include: { _count: { select: { inventoryBatches: true } } },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Prevent deletion if supplier has inventory batches
      if (existing._count.inventoryBatches > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete supplier with existing inventory batches',
        });
      }

      // Soft delete - set status to inactive
      const supplier = await prisma.supplier.update({
        where: { id },
        data: { status: 'inactive' },
      });

      // Audit log
      await createAuditLog({
        userId: ctx.userId!,
        action: 'delete',
        entity: 'supplier',
        entityId: id,
        metadata: { supplierCode: supplier.supplierCode, businessName: supplier.businessName },
      });

      return supplier;
    }),

  // Get unique categories from active suppliers
  getCategories: requirePermission('suppliers:view')
    .query(async () => {
      const suppliers = await prisma.supplier.findMany({
        where: { status: 'active' },
        select: { primaryCategories: true },
      });

      // Flatten and deduplicate categories
      const categories = [...new Set(suppliers.flatMap((s) => s.primaryCategories))];
      
      return categories.sort();
    }),
});
```

### Audit Logging Interface

The audit logging system uses the following interface for field-level change tracking:

**File:** `/packages/api/src/services/audit.ts`

```typescript
export interface AuditLogParams {
  userId: string;
  userEmail?: string;
  userRole?: string;
  userName?: string | null;
  action: AuditAction;        // 'create' | 'update' | 'delete'
  entity: string;             // 'supplier' | 'productSupplier'
  entityId?: string;
  changes?: AuditChange[];    // Field-level change tracking
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditChange {
  field: string;              // Field name that changed
  oldValue: unknown;          // Previous value
  newValue: unknown;          // New value
}
```

**Usage Pattern:**
```typescript
// For updates with change tracking
const changes: AuditChange[] = [];
for (const [key, newValue] of Object.entries(data)) {
  const oldValue = existing[key as keyof typeof existing];
  if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
    changes.push({ field: key, oldValue, newValue });
  }
}

await createAuditLog({
  userId: ctx.userId!,
  action: 'update',
  entity: 'supplier',
  entityId: id,
  changes,
  metadata: { supplierCode: supplier.supplierCode },
});
```

### Register Router

**File:** `/packages/api/src/root.ts`

```typescript
import { supplierRouter } from './routers/supplier';

export const appRouter = router({
  // ... existing routers
  supplier: supplierRouter,
});
```

---

## Permission System

### Add Permissions

**File:** `/packages/shared/src/constants/permissions.ts`

```typescript
export const PERMISSIONS = {
  // ... existing permissions

  // Supplier permissions
  'suppliers:view': {
    module: 'suppliers',
    action: 'view',
    description: 'View supplier list and details',
  },
  'suppliers:create': {
    module: 'suppliers',
    action: 'create',
    description: 'Create new suppliers',
  },
  'suppliers:edit': {
    module: 'suppliers',
    action: 'edit',
    description: 'Edit supplier information',
  },
  'suppliers:delete': {
    module: 'suppliers',
    action: 'delete',
    description: 'Delete suppliers',
  },
} as const;

// Update role assignments
export const ROLE_PERMISSIONS = {
  admin: [
    // ... all existing permissions
    'suppliers:view',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:delete',
  ],
  manager: [
    // ... existing manager permissions
    'suppliers:view',
    'suppliers:edit',
  ],
  sales: [
    // ... existing sales permissions
    'suppliers:view',
  ],
  // ... other roles
};
```

**File:** `/packages/shared/src/types/permissions.ts`

```typescript
export type Permission =
  // ... existing permissions
  | 'suppliers:view'
  | 'suppliers:create'
  | 'suppliers:edit'
  | 'suppliers:delete';
```

---

## Frontend Architecture

### Navigation Integration

**File:** `/apps/admin-portal/config/navigation.ts`

**Note:** Suppliers navigation item should be placed **before Customers** in the navigation for high visibility.

```typescript
import { Building2 } from 'lucide-react';

export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    permission: 'dashboard:view',
  },
  // ADD SUPPLIERS HERE (before customers):
  {
    id: 'suppliers',
    labelKey: 'suppliers',
    icon: Building2,
    path: '/suppliers',
    permission: 'suppliers:view',
  },
  {
    id: 'customers',
    labelKey: 'customers',
    icon: Users,
    path: '/customers',
    permission: 'customers:view',
  },
  // ... rest of existing items (orders, products, inventory, etc.)
];
```

### Page Structure

#### 1. List Page

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useTableSort } from '@joho-erp/shared/hooks';
import { PermissionGate } from '@/components/permission-gate';
import {
  ResponsiveTable,
  type TableColumn,
  CountUp,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@joho-erp/ui';
import { Button } from '@joho-erp/ui/components/button';
import { Input } from '@joho-erp/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@joho-erp/ui/components/select';
import { formatAUD } from '@joho-erp/shared';
import { SupplierStatusBadge } from './components/SupplierStatusBadge';
import { Building2, Plus, Search, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Supplier = {
  id: string;
  supplierCode: string;
  businessName: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  status: string;
  creditLimit: number;
  _count: {
    products: number;
    inventoryBatches: number;
  };
};

export default function SuppliersPage() {
  const router = useRouter();
  const t = useTranslations('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { sortBy, sortOrder, handleSort } = useTableSort('name', 'asc');

  // Fetch suppliers
  const { data, isLoading, refetch } = api.supplier.getAll.useQuery({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    sortBy,
    sortOrder,
  });

  // Fetch stats
  const { data: stats } = api.supplier.getStats.useQuery();

  const suppliers = (data?.suppliers ?? []) as Supplier[];

  // Table columns
  const columns: TableColumn<Supplier>[] = [
    {
      key: 'supplierCode',
      label: t('code'),
      sortable: true,
      render: (supplier) => (
        <div className="font-mono text-sm">{supplier.supplierCode}</div>
      ),
    },
    {
      key: 'businessName',
      label: t('businessName'),
      sortable: true,
      render: (supplier) => (
        <div>
          <div className="font-medium">{supplier.businessName}</div>
          <div className="text-sm text-muted-foreground">
            {supplier._count.products} {t('productsLinked')}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: t('contact'),
      render: (supplier) => (
        <div className="text-sm">
          <div>{supplier.primaryContact.name}</div>
          <div className="text-muted-foreground">
            {supplier.primaryContact.email}
          </div>
        </div>
      ),
    },
    {
      key: 'creditLimit',
      label: t('creditLimit'),
      sortable: true,
      render: (supplier) => (
        <div className="text-right font-medium">
          {formatAUD(supplier.creditLimit)}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (supplier) => (
        <SupplierStatusBadge status={supplier.status} />
      ),
    },
    {
      key: 'actions',
      label: t('common:actions'),
      render: (supplier) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/suppliers/${supplier.id}`)}
          >
            {t('common:view')}
          </Button>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCard = (supplier: Supplier) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{supplier.businessName}</div>
          <div className="text-sm text-muted-foreground font-mono">
            {supplier.supplierCode}
          </div>
        </div>
        <SupplierStatusBadge status={supplier.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">{t('contact')}</div>
          <div>{supplier.primaryContact.name}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t('creditLimit')}</div>
          <div className="font-medium">{formatAUD(supplier.creditLimit)}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => router.push(`/suppliers/${supplier.id}`)}
        >
          {t('common:view')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <PermissionGate permission="suppliers:create">
          <Link href="/suppliers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('addSupplier')}
            </Button>
          </Link>
        </PermissionGate>
      </div>

      {/* Stats Cards - Uses inline Card pattern (no StatsCard component exists) */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <CountUp end={stats.total} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.active')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                <CountUp end={stats.active} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.pending')}</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                <CountUp end={stats.pendingApproval} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.suspended')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                <CountUp end={stats.suspended} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('allStatuses')}</SelectItem>
            <SelectItem value="active">{t('active')}</SelectItem>
            <SelectItem value="inactive">{t('inactive')}</SelectItem>
            <SelectItem value="suspended">{t('suspended')}</SelectItem>
            <SelectItem value="pending_approval">{t('pending')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ResponsiveTable
        data={suppliers}
        columns={columns}
        mobileCard={mobileCard}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={isLoading}
        emptyState={{
          icon: Building2,
          title: t('emptyState.title'),
          description: t('emptyState.description'),
          action: {
            label: t('addSupplier'),
            onClick: () => router.push('/suppliers/new'),
          },
        }}
      />
    </div>
  );
}
```

#### 1.5 SupplierStatusBadge Component

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/components/SupplierStatusBadge.tsx`

```typescript
'use client';

import { StatusBadge } from '@joho-erp/ui';
import type { SupplierStatus } from '@joho-erp/database';

// Map supplier-specific statuses to generic StatusBadge types
const statusMap: Record<SupplierStatus, 'active' | 'inactive' | 'suspended' | 'pending'> = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
  pending_approval: 'pending',
};

interface SupplierStatusBadgeProps {
  status: SupplierStatus;
  showIcon?: boolean;
  className?: string;
}

export function SupplierStatusBadge({
  status,
  showIcon = true,
  className
}: SupplierStatusBadgeProps) {
  return (
    <StatusBadge
      status={statusMap[status]}
      showIcon={showIcon}
      className={className}
    />
  );
}
```

**Usage:**
```typescript
import { SupplierStatusBadge } from './components/SupplierStatusBadge';

// In list table column
{
  key: 'status',
  label: t('status'),
  render: (supplier) => <SupplierStatusBadge status={supplier.status} />,
}

// In detail page header
<div className="flex items-center gap-3">
  <h1 className="text-3xl font-bold">{supplier.businessName}</h1>
  <SupplierStatusBadge status={supplier.status} />
</div>
```

#### 2. Detail Page

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/[id]/page.tsx`

```typescript
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { Button } from '@joho-erp/ui/components/button';
import { Card } from '@joho-erp/ui/components/card';
import { Badge, Skeleton } from '@joho-erp/ui';
import { formatAUD } from '@joho-erp/shared';
import { ArrowLeft, Edit, Building2, Ban, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { SupplierStatusBadge } from '../components/SupplierStatusBadge';
import { LinkProductDialog } from '../components/LinkProductDialog';

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default function SupplierDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const t = useTranslations('supplierDetail');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLinkProductDialog, setShowLinkProductDialog] = useState(false);

  const { data: supplier, isLoading, refetch } = api.supplier.getById.useQuery({
    id: resolvedParams.id,
  });

  // Loading state with skeleton UI
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // Error state with back button
  if (!supplier) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-destructive mb-4">{t('errorLoading')}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:back')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:back')}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{supplier.businessName}</h1>
              <SupplierStatusBadge status={supplier.status} />
            </div>
            <p className="text-muted-foreground font-mono">
              {supplier.supplierCode}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowEditDialog(true)}>
          <Edit className="h-4 w-4 mr-2" />
          {t('common:edit')}
        </Button>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Primary Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information - Uses inline pattern (no InfoItem component exists) */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('businessInfo')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('businessName')}</p>
                <p className="font-medium">{supplier.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('tradingName')}</p>
                <p className="font-medium">{supplier.tradingName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('abn')}</p>
                <p className="font-medium font-mono">{supplier.abn || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('acn')}</p>
                <p className="font-medium font-mono">{supplier.acn || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('contactInfo')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  {t('primaryContact')}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('name')}</p>
                    <p className="font-medium">{supplier.primaryContact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('position')}</p>
                    <p className="font-medium">{supplier.primaryContact.position || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('email')}</p>
                    <p className="font-medium">{supplier.primaryContact.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('phone')}</p>
                    <p className="font-medium">{supplier.primaryContact.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Terms */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('financialTerms')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('creditLimit')}</p>
                <p className="font-medium">{formatAUD(supplier.creditLimit)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('currentBalance')}</p>
                <p className="font-medium">{formatAUD(supplier.currentBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('paymentTerms')}</p>
                <p className="font-medium">{supplier.paymentTerms || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('paymentMethod')}</p>
                <p className="font-medium">{supplier.paymentMethod}</p>
              </div>
            </div>
          </Card>

          {/* Linked Products */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('linkedProducts')}</h2>
              <Button
                size="sm"
                onClick={() => setShowLinkProductDialog(true)}
              >
                {t('linkProduct')}
              </Button>
            </div>
            <ProductsTable products={supplier.products} />
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Suspension Info - Shown when supplier is suspended */}
          {supplier.status === 'suspended' && (
            <Card className="p-6 border-destructive bg-destructive/5">
              <div className="flex items-center gap-2 mb-4">
                <Ban className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-destructive">{t('suspended')}</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('reason')}: </span>
                  <span>{supplier.suspensionReason}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('date')}: </span>
                  <span>{new Date(supplier.suspendedAt!).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Delivery Terms */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('deliveryTerms')}</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('minimumOrder')}</p>
                <p className="font-medium">
                  {supplier.minimumOrderValue ? formatAUD(supplier.minimumOrderValue) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('leadTime')}</p>
                <p className="font-medium">
                  {supplier.leadTimeDays ? `${supplier.leadTimeDays} ${t('days')}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('deliveryDays')}</p>
                <p className="font-medium">{supplier.deliveryDays || '-'}</p>
              </div>
            </div>
          </Card>

          {/* Categories */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('categories')}</h2>
            <div className="flex flex-wrap gap-2">
              {supplier.primaryCategories.map((cat) => (
                <Badge key={cat}>{cat}</Badge>
              ))}
            </div>
          </Card>

          {/* Metadata */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('metadata')}</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('createdAt')}: </span>
                {new Date(supplier.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">{t('updatedAt')}: </span>
                {new Date(supplier.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <EditSupplierDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        supplier={supplier}
        onSuccess={() => refetch()}
      />

      <LinkProductDialog
        open={showLinkProductDialog}
        onOpenChange={setShowLinkProductDialog}
        supplierId={supplier.id}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
```

**Enhanced Detail Page Patterns (from Customer module):**

**1. Edit Mode Toggle with Floating Action Bar:**
```typescript
const [isEditing, setIsEditing] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [editData, setEditData] = useState<SupplierEditData | null>(null);

// Start editing - copy supplier data to edit state
const handleStartEdit = () => {
  setEditData({
    businessName: supplier.businessName,
    tradingName: supplier.tradingName || '',
    abn: supplier.abn || '',
    acn: supplier.acn || '',
    primaryContact: { ...supplier.primaryContact },
    // ... copy all editable fields
  });
  setIsEditing(true);
};

// Cancel editing
const handleCancelEdit = () => {
  setEditData(null);
  setIsEditing(false);
};

// Save changes
const handleSave = async () => {
  setIsSaving(true);
  try {
    await updateMutation.mutateAsync({
      id: supplier.id,
      data: editData,
    });
    setIsEditing(false);
    toast({ description: t('updateSuccess') });
  } catch (error) {
    toast({ variant: 'destructive', description: error.message });
  } finally {
    setIsSaving(false);
  }
};

// In JSX - Floating Action Bar
{isEditing && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-background border rounded-lg shadow-lg p-3">
    <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
      {t('common:cancel')}
    </Button>
    <Button onClick={handleSave} disabled={isSaving}>
      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('common:save')}
    </Button>
  </div>
)}
```

**2. Conditional Rendering for View/Edit Modes:**
```typescript
// In card content
{isEditing ? (
  <Input
    value={editData.businessName}
    onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
  />
) : (
  <InfoItem label={t('businessName')} value={supplier.businessName} />
)}
```

**3. PermissionGate for Actions:**
```typescript
<div className="flex gap-2">
  <PermissionGate permission="suppliers:edit">
    {!isEditing && (
      <Button onClick={handleStartEdit}>
        <Edit className="h-4 w-4 mr-2" />
        {t('common:edit')}
      </Button>
    )}
  </PermissionGate>

  <PermissionGate permission="suppliers:suspend">
    {supplier.status === 'active' && (
      <Button variant="destructive" onClick={() => setShowSuspendDialog(true)}>
        {t('suspend')}
      </Button>
    )}
    {supplier.status === 'suspended' && (
      <Button variant="outline" onClick={() => setShowActivateDialog(true)}>
        {t('activate')}
      </Button>
    )}
  </PermissionGate>
</div>
```

**4. Suspension Dialog with Reason Validation:**
```typescript
const [showSuspendDialog, setShowSuspendDialog] = useState(false);
const [suspensionReason, setSuspensionReason] = useState('');

const suspendMutation = api.supplier.updateStatus.useMutation({
  onSuccess: () => {
    toast({ description: t('suspendSuccess') });
    setShowSuspendDialog(false);
    setSuspensionReason('');
    refetch();
  },
});

// In JSX
<AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('suspendTitle')}</AlertDialogTitle>
      <AlertDialogDescription>{t('suspendDescription')}</AlertDialogDescription>
    </AlertDialogHeader>

    <div className="space-y-2">
      <Label>{t('suspensionReason')} *</Label>
      <Textarea
        value={suspensionReason}
        onChange={(e) => setSuspensionReason(e.target.value)}
        placeholder={t('suspensionReasonPlaceholder')}
        rows={3}
      />
      {suspensionReason.length > 0 && suspensionReason.length < 10 && (
        <p className="text-sm text-destructive">
          {t('suspensionReasonMinLength')}
        </p>
      )}
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => suspendMutation.mutate({
          id: supplier.id,
          status: 'suspended',
          reason: suspensionReason,
        })}
        disabled={suspensionReason.length < 10}
        className="bg-destructive hover:bg-destructive/90"
      >
        {t('suspend')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**5. Additional Sidebar Cards:**

**Performance Metrics Card:**
```typescript
<Card className="p-6">
  <h2 className="text-lg font-semibold mb-4">{t('performance')}</h2>
  <div className="space-y-4">
    <div>
      <Label className="text-muted-foreground">{t('qualityRating')}</Label>
      <div className="flex items-center gap-2 mt-1">
        {/* StarRating component or simple display */}
        <span className="font-medium">
          {supplier.qualityRating?.toFixed(1) || '-'}/5
        </span>
      </div>
    </div>
    <div>
      <Label className="text-muted-foreground">{t('onTimeDelivery')}</Label>
      <p className="font-medium">
        {supplier.onTimeDeliveryRate ? `${supplier.onTimeDeliveryRate.toFixed(1)}%` : '-'}
      </p>
    </div>
  </div>
</Card>
```

**Compliance Card:**
```typescript
<Card className="p-6">
  <h2 className="text-lg font-semibold mb-4">{t('compliance')}</h2>
  <div className="space-y-4">
    <div>
      <Label className="text-muted-foreground">{t('foodSafetyLicense')}</Label>
      <p>{supplier.foodSafetyLicense || '-'}</p>
      {supplier.licenseExpiry && (
        <p className={cn(
          "text-sm",
          isExpiringSoon(supplier.licenseExpiry) ? "text-destructive" : "text-muted-foreground"
        )}>
          {t('expires')}: {formatDate(supplier.licenseExpiry)}
        </p>
      )}
    </div>
    <div>
      <Label className="text-muted-foreground">{t('insurance')}</Label>
      {supplier.insuranceExpiry ? (
        <p className={cn(
          "text-sm",
          isExpiringSoon(supplier.insuranceExpiry) ? "text-destructive" : "text-muted-foreground"
        )}>
          {t('expires')}: {formatDate(supplier.insuranceExpiry)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">-</p>
      )}
    </div>
  </div>
</Card>
```

**Suspension Info Card (shown when suspended):**
```typescript
{supplier.status === 'suspended' && (
  <Card className="p-6 border-destructive">
    <h2 className="text-lg font-semibold text-destructive mb-4">
      {t('suspended')}
    </h2>
    <div className="space-y-2 text-sm">
      <p><strong>{t('reason')}:</strong> {supplier.suspensionReason}</p>
      <p><strong>{t('date')}:</strong> {formatDate(supplier.suspendedAt!)}</p>
      <p><strong>{t('by')}:</strong> {supplier.suspendedBy}</p>
    </div>
  </Card>
)}
```

**6. Linked Products Table with Actions:**
```typescript
<Card className="p-6">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold">{t('linkedProducts')}</h2>
    <PermissionGate permission="suppliers:edit">
      <Button size="sm" onClick={() => setShowLinkProductDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('linkProduct')}
      </Button>
    </PermissionGate>
  </div>

  {supplier.products.length === 0 ? (
    <EmptyState
      icon={Package}
      title={t('noLinkedProducts')}
      description={t('noLinkedProductsDescription')}
    />
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">{t('product')}</th>
            <th className="text-left py-2">{t('supplierSku')}</th>
            <th className="text-right py-2">{t('costPrice')}</th>
            <th className="text-center py-2">{t('preferred')}</th>
            <th className="text-right py-2">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {supplier.products.map((link) => (
            <tr key={link.id} className="border-b last:border-0">
              <td className="py-3">
                <div>
                  <p className="font-medium">{link.product.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{link.product.sku}</p>
                </div>
              </td>
              <td className="py-3 font-mono text-sm">{link.supplierSku || '-'}</td>
              <td className="py-3 text-right font-medium">{formatAUD(link.costPrice)}</td>
              <td className="py-3 text-center">
                {link.isPreferredSupplier && <Badge variant="success">{t('preferred')}</Badge>}
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => handleEditProductLink(link)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</Card>
```

#### 2.5 LinkProductDialog Component

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/components/LinkProductDialog.tsx`

This dialog allows linking products to suppliers with cost tracking, minimum order quantities, and preferred supplier designation.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui/hooks/use-toast';
import { parseToCents } from '@joho-erp/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@joho-erp/ui';
import { Loader2, Search } from 'lucide-react';

interface LinkProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  onSuccess: () => void;
}

export function LinkProductDialog({
  open,
  onOpenChange,
  supplierId,
  onSuccess,
}: LinkProductDialogProps) {
  const t = useTranslations('supplierDetail');
  const tCommon = useTranslations('common');
  const { toast } = useToast();

  // Form state
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [supplierProductName, setSupplierProductName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [packSize, setPackSize] = useState('');
  const [moq, setMoq] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [isPreferredSupplier, setIsPreferredSupplier] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch products for dropdown (with search)
  const { data: productsData, isLoading: isLoadingProducts } = api.product.getAll.useQuery(
    {
      search: productSearch || undefined,
      limit: 50,
      status: 'active',
    },
    { enabled: open } // Only fetch when dialog is open
  );

  const products = productsData?.products ?? [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setProductId('');
    setProductSearch('');
    setSupplierSku('');
    setSupplierProductName('');
    setCostPrice('');
    setPackSize('');
    setMoq('');
    setLeadTimeDays('');
    setIsPreferredSupplier(false);
    setErrors({});
  };

  const linkMutation = api.supplier.linkProduct.useMutation({
    onSuccess: () => {
      toast({ description: t('productLinked') });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      if (error.message.includes('already linked')) {
        setErrors({ productId: t('productAlreadyLinked') });
      } else {
        toast({ variant: 'destructive', description: error.message });
      }
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!productId) {
      newErrors.productId = t('validation.productRequired');
    }

    if (!costPrice.trim()) {
      newErrors.costPrice = t('validation.costPriceRequired');
    } else {
      const cents = parseToCents(costPrice);
      if (cents === null || cents <= 0) {
        newErrors.costPrice = t('validation.costPriceInvalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    linkMutation.mutate({
      supplierId,
      productId,
      supplierSku: supplierSku.trim() || undefined,
      supplierProductName: supplierProductName.trim() || undefined,
      costPrice: parseToCents(costPrice)!,
      packSize: packSize ? parseFloat(packSize) : undefined,
      moq: moq ? parseFloat(moq) : undefined,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
      isPreferredSupplier,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t('linkProduct')}</DialogTitle>
          <DialogDescription>{t('linkProductDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Product Search & Select */}
          <div className="space-y-2">
            <Label htmlFor="productId">{t('product')} *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10 mb-2"
              />
            </div>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectProduct')} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingProducts ? (
                  <div className="p-2 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    {tCommon('loading')}
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-2 text-center text-muted-foreground">
                    {t('noProductsFound')}
                  </div>
                ) : (
                  products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </span>
                        <span>{product.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.productId && (
              <p className="text-sm text-destructive">{errors.productId}</p>
            )}
          </div>

          {/* Cost Price (required) */}
          <div className="space-y-2">
            <Label htmlFor="costPrice">{t('costPrice')} *</Label>
            <Input
              id="costPrice"
              type="text"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => {
                setCostPrice(e.target.value);
                setErrors((prev) => ({ ...prev, costPrice: '' }));
              }}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">{t('enterDollars')}</p>
            {errors.costPrice && (
              <p className="text-sm text-destructive">{errors.costPrice}</p>
            )}
          </div>

          {/* Supplier's Product Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierSku">{t('supplierSku')}</Label>
              <Input
                id="supplierSku"
                value={supplierSku}
                onChange={(e) => setSupplierSku(e.target.value)}
                placeholder={t('supplierSkuPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierProductName">{t('supplierProductName')}</Label>
              <Input
                id="supplierProductName"
                value={supplierProductName}
                onChange={(e) => setSupplierProductName(e.target.value)}
                placeholder={t('supplierProductNamePlaceholder')}
              />
            </div>
          </div>

          {/* Ordering Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packSize">{t('packSize')}</Label>
              <Input
                id="packSize"
                type="number"
                step="0.01"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moq">{t('moq')}</Label>
              <Input
                id="moq"
                type="number"
                step="0.01"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">{t('leadTimeDays')}</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {/* Preferred Supplier */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPreferredSupplier"
              checked={isPreferredSupplier}
              onCheckedChange={(checked) => setIsPreferredSupplier(checked === true)}
            />
            <Label htmlFor="isPreferredSupplier" className="text-sm font-normal">
              {t('preferredSupplier')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {t('preferredSupplierDescription')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={linkMutation.isPending}>
            {linkMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('linkProduct')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Props Interface:**
| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Called when dialog should open/close |
| `supplierId` | `string` | The supplier ID to link products to |
| `onSuccess` | `() => void` | Called after successful link (typically to refetch supplier data) |

#### 3. Create Page Component

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/new/page.tsx`

> **Note**: This component follows the Customer module pattern (`/customers/new/page.tsx`) with a tabbed form layout instead of a dialog, due to the complexity of supplier data (40+ fields across multiple sections).

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui/hooks/use-toast';
import { parseToCents, validateABN, validateACN } from '@joho-erp/shared';
import { cn } from '@joho-erp/ui/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@joho-erp/ui';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function NewSupplierPage() {
  const router = useRouter();
  const t = useTranslations('supplierForm');
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('business');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state - organized by tab
  const [formData, setFormData] = useState({
    // Business Information
    supplierCode: '',
    businessName: '',
    tradingName: '',
    abn: '',
    acn: '',
    
    // Primary Contact
    primaryContact: {
      name: '',
      position: '',
      email: '',
      phone: '',
      mobile: '',
    },
    
    // Business Address
    businessAddress: {
      street: '',
      suburb: '',
      state: 'NSW',
      postcode: '',
      country: 'Australia',
    },
    
    // Financial Terms
    paymentTerms: '',
    paymentMethod: 'account_credit',
    creditLimit: 0, // In cents
    
    // Delivery Terms
    minimumOrderValue: undefined as number | undefined, // In cents
    leadTimeDays: undefined as number | undefined,
    deliveryDays: '',
    deliveryNotes: '',
    
    // Categories
    primaryCategories: [] as string[],
  });
  
  // Per-tab error tracking
  const [businessErrors, setBusinessErrors] = useState<Record<string, string>>({});
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  
  const createMutation = api.supplier.create.useMutation({
    onSuccess: () => {
      toast({ description: t('messages.createSuccess') });
      router.push('/suppliers');
    },
    onError: (error) => {
      toast({ variant: 'destructive', description: error.message });
    },
  });
  
  const validateBusinessInfo = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.supplierCode.trim()) {
      errors.supplierCode = t('validation.supplierCodeRequired');
    }
    if (!formData.businessName.trim()) {
      errors.businessName = t('validation.businessNameRequired');
    }
    if (formData.abn && !validateABN(formData.abn)) {
      errors.abn = t('validation.abnInvalid');
    }
    
    setBusinessErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validateBusinessInfo()) {
      toast({ variant: 'destructive', description: t('messages.fixValidationErrors') });
      return;
    }
    
    setIsSubmitting(true);
    createMutation.mutate({
      ...formData,
      // Ensure monetary values are in cents
      creditLimit: formData.creditLimit,
      minimumOrderValue: formData.minimumOrderValue,
    });
  };
  
  // Tab navigation with error indicators
  const tabs = [
    { id: 'business', label: t('tabs.business'), hasError: Object.keys(businessErrors).length > 0 },
    { id: 'contact', label: t('tabs.contact'), hasError: Object.keys(contactErrors).length > 0 },
    { id: 'address', label: t('tabs.address'), hasError: Object.keys(addressErrors).length > 0 },
    { id: 'financial', label: t('tabs.financial'), hasError: false },
    { id: 'delivery', label: t('tabs.delivery'), hasError: false },
    { id: 'categories', label: t('tabs.categories'), hasError: false },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/suppliers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('title.create')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      {/* Tab Navigation - Uses underline pattern from Customer module */}
      <div className="mb-6 flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
              tab.hasError && "text-destructive"
            )}
          >
            {tab.label}
            {tab.hasError && <span className="ml-1 text-destructive">*</span>}
          </button>
        ))}
      </div>
      
      {/* Tab Content - Business Information */}
      {activeTab === 'business' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('tabs.business')}</CardTitle>
            <CardDescription>{t('sections.businessDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="supplierCode">{t('fields.supplierCode')} *</Label>
              <Input
                id="supplierCode"
                value={formData.supplierCode}
                onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                placeholder={t('fields.supplierCodePlaceholder')}
              />
              {businessErrors.supplierCode && (
                <p className="text-sm text-destructive mt-1">{businessErrors.supplierCode}</p>
              )}
            </div>
            {/* Additional fields: businessName, tradingName, abn, acn */}
          </CardContent>
        </Card>
      )}
      
      {/* Additional tabs: contact, address, financial, delivery, categories */}
      {/* Follow the same Card pattern as above */}
      
      {/* Submit Button */}
      <div className="mt-6 flex justify-end gap-2">
        <Link href="/suppliers">
          <Button variant="outline">{t('buttons.cancel')}</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('buttons.createSupplier')}
        </Button>
      </div>
    </div>
  );
}
```

> **Implementation Note**: This is a simplified example. The full implementation should include all 6 tabs with complete form fields, following the patterns established in `/customers/new/page.tsx`.

**Key Patterns to Follow (from Customer module):**

**1. Comprehensive Form State with Optional Sections:**
```typescript
const [formData, setFormData] = useState({
  // Required sections
  supplierCode: '',
  businessName: '',
  primaryContact: { name: '', email: '', phone: '', position: '', mobile: '' },
  businessAddress: { street: '', suburb: '', state: 'NSW', postcode: '', country: 'Australia' },

  // Optional sections with toggles
  includeSecondaryContact: false,
  secondaryContact: { name: '', email: '', phone: '', position: '', mobile: '' },
  includeAccountsContact: false,
  accountsContact: { name: '', email: '', phone: '', position: '', mobile: '' },

  // Address toggle
  sameAsBusinessAddress: true,
  deliveryAddress: { street: '', suburb: '', state: 'NSW', postcode: '', country: 'Australia' },

  // Bank details toggle
  includeBankDetails: false,
  bankDetails: { accountName: '', bsb: '', accountNumber: '', bankName: '' },

  // Categories management
  primaryCategories: [] as string[],
  newCategory: '', // For input field

  // Monetary fields (user enters dollars, convert on submit)
  creditLimit: '',
  minimumOrderValue: '',
});
```

**2. Per-Section Error Tracking with Clear Helpers:**
```typescript
const [businessErrors, setBusinessErrors] = useState<Record<string, string>>({});
const [primaryContactErrors, setPrimaryContactErrors] = useState<Record<string, string>>({});
const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
const [financialErrors, setFinancialErrors] = useState<Record<string, string>>({});

// Clear error on field change
const clearBusinessError = (field: string) => {
  setBusinessErrors((prev) => {
    const next = { ...prev };
    delete next[field];
    return next;
  });
};

// Usage in input onChange
onChange={(e) => {
  setFormData({ ...formData, supplierCode: e.target.value.toUpperCase() });
  clearBusinessError('supplierCode');
}}
```

**3. Nested Object Update Helpers:**
```typescript
const updateContact = (
  contactType: 'primaryContact' | 'secondaryContact' | 'accountsContact',
  field: string,
  value: string
) => {
  setFormData((prev) => ({
    ...prev,
    [contactType]: {
      ...prev[contactType],
      [field]: value,
    },
  }));
  if (contactType === 'primaryContact') {
    clearPrimaryContactError(field);
  }
};
```

**4. Tab Error Indicators:**
```typescript
const tabs = [
  { id: 'business', label: t('tabs.business'), hasError: Object.keys(businessErrors).length > 0 },
  { id: 'contact', label: t('tabs.contact'), hasError: Object.keys(primaryContactErrors).length > 0 },
  // ... more tabs
];

// In JSX
<Button
  variant={activeTab === tab.id ? 'default' : 'outline'}
  className={tab.hasError ? 'border-destructive' : ''}
>
  {tab.label}
  {tab.hasError && <span className="ml-1 text-destructive">*</span>}
</Button>
```

**5. Composite Validation with Tab Navigation:**
```typescript
const validateAllTabs = (): boolean => {
  const isBusinessValid = validateBusinessInfo();
  const isContactValid = validatePrimaryContact();
  const isAddressValid = validateAddress();
  const isFinancialValid = validateFinancial();

  // Navigate to first tab with errors
  if (!isBusinessValid) setActiveTab('business');
  else if (!isContactValid) setActiveTab('contact');
  else if (!isAddressValid) setActiveTab('address');
  else if (!isFinancialValid) setActiveTab('financial');

  return isBusinessValid && isContactValid && isAddressValid && isFinancialValid;
};
```

**6. Category Array Management:**
```typescript
const handleAddCategory = () => {
  if (formData.newCategory.trim() && !formData.primaryCategories.includes(formData.newCategory.trim())) {
    setFormData((prev) => ({
      ...prev,
      primaryCategories: [...prev.primaryCategories, prev.newCategory.trim()],
      newCategory: '',
    }));
  }
};

const handleRemoveCategory = (category: string) => {
  setFormData((prev) => ({
    ...prev,
    primaryCategories: prev.primaryCategories.filter((c) => c !== category),
  }));
};
```

**7. Monetary Field Conversion on Submit:**
```typescript
const handleSubmit = () => {
  if (!validateAllTabs()) {
    toast({ variant: 'destructive', description: t('messages.fixValidationErrors') });
    return;
  }

  createMutation.mutate({
    ...formData,
    creditLimit: parseToCents(formData.creditLimit) || 0, // Convert to cents
    minimumOrderValue: parseToCents(formData.minimumOrderValue) || undefined,
    // Only include optional sections if toggled
    secondaryContact: formData.includeSecondaryContact ? formData.secondaryContact : undefined,
    accountsContact: formData.includeAccountsContact ? formData.accountsContact : undefined,
    deliveryAddress: formData.sameAsBusinessAddress ? undefined : formData.deliveryAddress,
    bankDetails: formData.includeBankDetails ? formData.bankDetails : undefined,
  });
};
```

---

## Internationalization

### Translation Keys Structure

Add to all three files: `en.json`, `zh-CN.json`, `zh-TW.json`

```json
{
  "navigation": {
    "suppliers": "Suppliers"
  },
  "suppliers": {
    "title": "Suppliers",
    "subtitle": "Manage your supply chain and supplier relationships",
    "addSupplier": "Add Supplier",
    "code": "Code",
    "businessName": "Business Name",
    "contact": "Contact",
    "creditLimit": "Credit Limit",
    "status": "Status",
    "productsLinked": "products",
    "active": "Active",
    "inactive": "Inactive",
    "suspended": "Suspended",
    "pending": "Pending Approval",
    "searchPlaceholder": "Search suppliers...",
    "filterByStatus": "Filter by status",
    "allStatuses": "All Statuses",
    "stats": {
      "total": "Total Suppliers",
      "active": "Active",
      "pending": "Pending Approval",
      "suspended": "Suspended"
    },
    "emptyState": {
      "title": "No suppliers found",
      "description": "Get started by adding your first supplier"
    }
  },
  "supplierForm": {
    "title": {
      "create": "Add New Supplier",
      "edit": "Edit Supplier"
    },
    "description": "Enter supplier information",
    "tabs": {
      "business": "Business Info",
      "contact": "Contact & Address",
      "financial": "Financial Terms"
    },
    "sections": {
      "primaryContact": "Primary Contact",
      "businessAddress": "Business Address"
    },
    "fields": {
      "supplierCode": "Supplier Code",
      "supplierCodePlaceholder": "e.g., SUP001",
      "businessName": "Business Name",
      "businessNamePlaceholder": "Enter business name",
      "abn": "ABN",
      "abnPlaceholder": "11 digit ABN",
      "contactName": "Contact Name",
      "contactNamePlaceholder": "Full name",
      "contactEmail": "Email",
      "contactEmailPlaceholder": "email@example.com",
      "contactPhone": "Phone",
      "contactPhonePlaceholder": "Phone number",
      "street": "Street Address",
      "streetPlaceholder": "Street address",
      "suburb": "Suburb",
      "suburbPlaceholder": "Suburb",
      "state": "State",
      "statePlaceholder": "Select state",
      "postcode": "Postcode",
      "postcodePlaceholder": "4 digits",
      "creditLimit": "Credit Limit ($)",
      "creditLimitPlaceholder": "0.00",
      "paymentTerms": "Payment Terms",
      "paymentTermsPlaceholder": "e.g., Net 30, COD",
      "leadTimeDays": "Lead Time (Days)",
      "leadTimeDaysPlaceholder": "Number of days"
    },
    "hints": {
      "enterDollars": "Enter amounts in dollars"
    },
    "buttons": {
      "cancel": "Cancel",
      "createSupplier": "Create Supplier",
      "updateSupplier": "Update Supplier",
      "creating": "Creating...",
      "updating": "Updating..."
    },
    "validation": {
      "supplierCodeRequired": "Supplier code is required",
      "businessNameRequired": "Business name is required",
      "contactNameRequired": "Contact name is required",
      "contactEmailRequired": "Contact email is required",
      "contactEmailInvalid": "Please enter a valid email",
      "contactPhoneRequired": "Contact phone is required",
      "streetRequired": "Street address is required",
      "suburbRequired": "Suburb is required",
      "stateRequired": "State is required",
      "postcodeRequired": "Postcode is required",
      "postcodeInvalid": "Postcode must be 4 digits",
      "creditLimitInvalid": "Please enter a valid amount"
    },
    "messages": {
      "createSuccess": "Supplier created successfully",
      "updateSuccess": "Supplier updated successfully",
      "fixValidationErrors": "Please fix validation errors"
    }
  },
  "supplierDetail": {
    "businessInfo": "Business Information",
    "contactInfo": "Contact Information",
    "financialTerms": "Financial Terms",
    "deliveryTerms": "Delivery Terms",
    "linkedProducts": "Linked Products",
    "categories": "Categories",
    "metadata": "Metadata",
    "primaryContact": "Primary Contact",
    "secondaryContact": "Secondary Contact",
    "accountsContact": "Accounts Contact",
    "addresses": "Addresses",
    "businessAddress": "Business Address",
    "deliveryAddress": "Delivery Address",
    "name": "Name",
    "position": "Position",
    "email": "Email",
    "phone": "Phone",
    "mobile": "Mobile",
    "businessName": "Business Name",
    "tradingName": "Trading Name",
    "abn": "ABN",
    "acn": "ACN",
    "creditLimit": "Credit Limit",
    "currentBalance": "Current Balance",
    "paymentTerms": "Payment Terms",
    "paymentMethod": "Payment Method",
    "minimumOrder": "Minimum Order Value",
    "minimumQty": "Minimum Order Quantity",
    "leadTime": "Lead Time",
    "deliveryDays": "Delivery Days",
    "deliveryNotes": "Delivery Notes",
    "createdAt": "Created",
    "updatedAt": "Last Updated",
    "linkProduct": "Link Product",
    "linkProductDescription": "Link a product to this supplier with pricing and ordering details",
    "productLinked": "Product linked successfully",
    "productAlreadyLinked": "This product is already linked to this supplier",
    "searchProducts": "Search products...",
    "selectProduct": "Select a product...",
    "noProductsFound": "No products found",
    "product": "Product",
    "supplierSku": "Supplier SKU",
    "supplierSkuPlaceholder": "Supplier's product code",
    "supplierProductName": "Supplier Product Name",
    "supplierProductNamePlaceholder": "How the supplier calls this product",
    "costPrice": "Cost Price",
    "packSize": "Pack Size",
    "moq": "Minimum Order Qty",
    "leadTimeDays": "Lead Time (Days)",
    "preferredSupplier": "Mark as preferred supplier",
    "preferredSupplierDescription": "The preferred supplier will be used by default for ordering this product",
    "enterDollars": "Enter amount in dollars",
    "preferred": "Preferred",
    "actions": "Actions",
    "noLinkedProducts": "No linked products",
    "noLinkedProductsDescription": "Link products to track cost pricing and ordering details from this supplier",
    "noCategories": "No categories assigned",
    "performance": "Performance Metrics",
    "qualityRating": "Quality Rating",
    "onTimeDelivery": "On-Time Delivery Rate",
    "compliance": "Compliance",
    "foodSafetyLicense": "Food Safety License",
    "insurance": "Insurance",
    "expires": "Expires",
    "days": "days",
    "bankDetails": "Bank Details",
    "accountName": "Account Name",
    "bsb": "BSB",
    "accountNumber": "Account Number",
    "bankName": "Bank Name",
    "suspended": "Supplier Suspended",
    "suspendTitle": "Suspend Supplier",
    "suspendDescription": "Are you sure you want to suspend this supplier? They will not appear in supplier lists for ordering.",
    "suspendSuccess": "Supplier suspended successfully",
    "suspensionReason": "Suspension Reason",
    "suspensionReasonPlaceholder": "Explain why this supplier is being suspended...",
    "suspensionReasonMinLength": "Reason must be at least 10 characters",
    "reason": "Reason",
    "date": "Date",
    "by": "By",
    "suspend": "Suspend",
    "activate": "Activate",
    "activateTitle": "Activate Supplier",
    "activateDescription": "Are you sure you want to reactivate this supplier?",
    "activateSuccess": "Supplier activated successfully",
    "updateSuccess": "Supplier updated successfully",
    "recentBatches": "Recent Inventory Batches",
    "validation": {
      "productRequired": "Please select a product",
      "costPriceRequired": "Cost price is required",
      "costPriceInvalid": "Please enter a valid cost price greater than 0"
    }
  }
}
```

---

## Monetary Handling

### Critical Rules

1. **Storage:** ALL monetary values stored as **integers (cents)** in database
2. **Validation:** Use `z.number().int().nonnegative()` for all price fields
3. **User Input:** Parse with `parseToCents()` and check for null
4. **Display:** Format with `formatAUD()` for display to users
5. **Form Edit:** Convert to dollars with `formatCentsForInput()`

### Code Examples

**User Input to Database:**
```typescript
// In form
const [creditLimit, setCreditLimit] = useState('');

// On submit
const creditLimitCents = parseToCents(creditLimit);
if (creditLimit && creditLimitCents === null) {
  setError('Please enter a valid amount');
  return;
}

// Send to API
await createMutation.mutateAsync({
  creditLimit: creditLimitCents || 0, // In cents
});
```

**Database to Display:**
```typescript
// In list/detail pages
import { formatAUD } from '@joho-erp/shared';

<div>{formatAUD(supplier.creditLimit)}</div> // "$2,500.00"
```

**Database to Form Edit:**
```typescript
import { formatCentsForInput } from '@joho-erp/shared';

// When loading existing supplier for edit
const [creditLimit, setCreditLimit] = useState(
  formatCentsForInput(supplier.creditLimit) // "2500.00"
);
```

**API Validation:**
```typescript
// In tRPC router
const createSupplierSchema = z.object({
  creditLimit: z.number().int().nonnegative(), // In cents
  minimumOrderValue: z.number().int().nonnegative().optional(), // In cents
});
```

---

## Implementation Phases

### Phase 1: Database Foundation (Day 1-2)

**Tasks:**
1. Add enums, composite types, and models to `/packages/database/prisma/schema.prisma`
2. Update Product and InventoryBatch models with supplier relations
3. Run `pnpm db:generate` to generate Prisma client
4. Verify schema compiles without errors

**Validation:**
- Prisma client generates successfully
- TypeScript types are available for Supplier, ProductSupplier
- No compilation errors

**Files Modified:**
- `/packages/database/prisma/schema.prisma`

---

### Phase 2: Permissions & API (Day 3-5)

**Tasks:**
1. Add supplier permissions to `/packages/shared/src/constants/permissions.ts`
2. Add permission types to `/packages/shared/src/types/permissions.ts`
3. Create `/packages/api/src/routers/supplier.ts` with all CRUD endpoints
4. Add validation schemas (Zod)
5. Register router in `/packages/api/src/root.ts`
6. Test API endpoints manually using tRPC client

**Validation:**
- All endpoints return expected data
- Permission middleware blocks unauthorized access
- Validation catches invalid inputs
- Monetary values stored as integers

**Files Created:**
- `/packages/api/src/routers/supplier.ts`

**Files Modified:**
- `/packages/shared/src/constants/permissions.ts`
- `/packages/shared/src/types/permissions.ts`
- `/packages/api/src/root.ts`

---

### Phase 3: Navigation & i18n (Day 6)

**Tasks:**
1. Add navigation item to `/apps/admin-portal/config/navigation.ts`
2. Add comprehensive translation keys to all 3 language files:
   - `/apps/admin-portal/messages/en.json`
   - `/apps/admin-portal/messages/zh-CN.json`
   - `/apps/admin-portal/messages/zh-TW.json`
3. Test navigation renders correctly
4. Test language switching works

**Validation:**
- Navigation item appears in sidebar (may 404 until page created)
- Icon displays correctly
- Language switching shows translated navigation label
- All translation keys present in all 3 files

**Files Modified:**
- `/apps/admin-portal/config/navigation.ts`
- `/apps/admin-portal/messages/en.json`
- `/apps/admin-portal/messages/zh-CN.json`
- `/apps/admin-portal/messages/zh-TW.json`

---

### Phase 4: List Page (Day 7-9)

**Tasks:**
1. Create `/apps/admin-portal/app/[locale]/(app)/suppliers/page.tsx`
2. Implement ResponsiveTable with columns
3. Add search and status filter
4. Add stats cards (total, active, suspended, pending)
5. Add empty state with CTA
6. Test mobile responsiveness
7. Create SupplierStatusBadge component

**Validation:**
- List page displays suppliers from API
- Search filters suppliers correctly
- Status filter works
- Sorting works on sortable columns
- Mobile card view displays correctly
- Empty state shows when no suppliers
- Stats cards show correct counts

**Files Created:**
- `/apps/admin-portal/app/[locale]/(app)/suppliers/page.tsx`
- `/apps/admin-portal/app/[locale]/(app)/suppliers/components/SupplierStatusBadge.tsx`

---

### Phase 5: Create Page (Day 10-13)

**Tasks:**
1. Create `/suppliers/new/page.tsx` with tabbed form (matches Customer pattern)
2. Implement 6 form tabs:
   - Business Information (supplierCode, businessName, tradingName, abn, acn)
   - Contact Information (primaryContact, secondaryContact, accountsContact)
   - Addresses (businessAddress, deliveryAddress with "same as business" checkbox)
   - Financial Terms (paymentTerms, paymentMethod, creditLimit, bankDetails)
   - Delivery Terms (minimumOrderValue, leadTimeDays, deliveryDays, deliveryNotes)
   - Categories & Compliance (primaryCategories, qualityRating, licenses)
3. Implement form state management with per-tab error tracking
4. Add validation with field-level error display
5. Implement monetary field handling (parseToCents for inputs)
6. Add ABN/ACN validation (11/9 digits respectively)
7. Test CRUD operations end-to-end
8. Test with invalid inputs
9. Test monetary values (cents storage, dollar display)

**Validation:**
- Can create new supplier with all fields
- Tab navigation works correctly
- Validation shows errors for invalid inputs
- Monetary values parse correctly from user input
- Credit limit stored as cents in database
- ABN/ACN validation works
- Success toast and redirect to list on create
- Error toast on failure

**Files Created:**
- `/apps/admin-portal/app/[locale]/(app)/suppliers/new/page.tsx`

---

### Phase 6: Detail Page & Product Linking (Day 14-16)

**Tasks:**
1. Create supplier detail page with two-column layout (matches Customer pattern):
   - Left column (2/3): Main content cards
   - Right column (1/3): Sidebar with quick stats
2. Implement edit mode toggle with floating action bar (Cancel/Save buttons)
3. Display all supplier information in Card components:
   - Business Information card
   - Contact Information card (collapsible sections for each contact)
   - Address cards (business, delivery)
   - Financial Terms card
   - Delivery Terms card
   - Linked Products card with table and Link Product button
   - Recent Inventory Batches card
4. Implement sidebar cards:
   - Categories (as badges)
   - Performance Metrics (quality rating, on-time delivery)
   - Compliance (license expiry, insurance expiry)
   - Audit Log section
5. Create LinkProductDialog component for product linking
6. Implement status management dialogs (Suspend/Activate using AlertDialog)
7. Add PermissionGate for edit/suspend actions

**Validation:**
- Detail page loads with all supplier information
- Edit mode toggle works with floating action bar
- Fields become editable in edit mode
- Validation on save
- All monetary values display formatted with formatAUD()
- Can link products to supplier
- Linked products display with cost prices
- Can update product-supplier links
- Recent inventory batches display
- Status change dialogs work (suspend requires reason)
- Can navigate back to list
- Mobile responsive layout

**Files Created:**
- `/apps/admin-portal/app/[locale]/(app)/suppliers/[id]/page.tsx`
- `/apps/admin-portal/app/[locale]/(app)/suppliers/components/LinkProductDialog.tsx`
- `/apps/admin-portal/app/[locale]/(app)/suppliers/components/SupplierStatusBadge.tsx` (if not created in Phase 4)

---

### Phase 7: Integration & Testing (Day 17-19)

**Tasks:**
1. Update inventory batch UI to display supplier name
2. Update product detail page to show suppliers
3. Run full type check: `pnpm type-check`
4. Run build: `pnpm build`
5. Test all features with all 3 languages
6. Test on mobile devices
7. Test edge cases (zero amounts, large amounts, invalid inputs)
8. Test permission gates hide/show correctly
9. Create test data for demo

**Validation:**
- `pnpm type-check` passes with no errors
- `pnpm build` succeeds for admin-portal
- All features work in English, zh-CN, zh-TW
- Mobile responsive layout works correctly
- Permission gates hide actions for unauthorized users
- All monetary values display correctly everywhere
- Search and filters work as expected
- Status changes reflect immediately

**Files Modified:**
- Inventory batch components (to show supplier)
- Product detail components (to show suppliers)

---

## Testing Strategy

### Unit Tests
- `parseToCents()` with valid/invalid inputs
- `formatAUD()` with various cent values
- `formatCentsForInput()` for form inputs
- Validation schemas (Zod)

### Integration Tests
- All tRPC endpoints (getAll, getById, create, update, updateStatus)
- Database CRUD operations
- Product-supplier linking
- Permission middleware

### E2E Tests
1. **Create Supplier Flow:**
   - Navigate to /suppliers
   - Click "Add Supplier"
   - Fill form with valid data including credit limit "$5,000.00"
   - Submit
   - Verify supplier appears in list
   - Verify credit limit stored as 500000 cents
   - Verify credit limit displays as "$5,000.00"

2. **Edit Supplier Flow:**
   - Click existing supplier
   - Click edit
   - Update credit limit to "$7,500.00"
   - Submit
   - Verify update saved as 750000 cents
   - Verify displays as "$7,500.00"

3. **Search & Filter:**
   - Search by business name
   - Filter by status
   - Verify results update

4. **Product Linking:**
   - Open supplier detail
   - Click "Link Product"
   - Select product and enter cost price
   - Verify ProductSupplier record created
   - Verify displays in linked products table

### Manual Testing
- Test all 3 languages display correctly
- Test mobile responsiveness on actual devices
- Test permission gates with different user roles
- Test validation messages are clear
- Test error handling (network errors, validation errors)

---

## Challenges & Solutions

### Challenge 1: Many-to-Many Product Relationships
**Problem:** Products can have multiple suppliers, suppliers can supply multiple products, with product-specific data (cost, MOQ, lead time).

**Solution:** ProductSupplier junction model with:
- Unique constraint on (productId, supplierId)
- Product-specific fields (costPrice, MOQ, packSize, leadTime)
- Preferred supplier flag
- Historical tracking (lastOrderDate, totalOrdersCount)

---

### Challenge 2: Monetary Value Validation Pipeline
**Problem:** Ensuring monetary values are always valid integers (cents) from user input through to database.

**Solution:** Strict validation pipeline:
1. User enters dollars: "2500.00"
2. Parse with `parseToCents()` → 250000 or null
3. Check for null → show error if invalid
4. Validate with Zod: `z.number().int().nonnegative()`
5. Store as Int in database
6. Display with `formatAUD()` → "$2,500.00"

---

### Challenge 3: Translation Consistency Across 3 Languages
**Problem:** Missing keys or inconsistent translations can break UI.

**Solution:**
- Create comprehensive key structure upfront
- Update all 3 files simultaneously
- Use namespaced organization (suppliers, supplierForm, supplierDetail)
- Consider CI check for missing keys (future enhancement)

---

### Challenge 4: Mobile Responsive Complex Forms
**Problem:** Multi-tab forms with many fields can be overwhelming on mobile.

**Solution:**
- Use vertical tabs on mobile (Tabs component handles this)
- Single column layout on small screens
- Group related fields with clear section headers
- Consider wizard pattern for create flow (future enhancement)
- Sticky footer for action buttons

---

### Challenge 5: Supplier Code Uniqueness
**Problem:** Duplicate supplier codes would cause confusion.

**Solution:**
- Unique constraint in Prisma schema
- Validation in API create mutation
- Clear error message: "Supplier code already exists"
- Auto-suggest next available code in UI (future enhancement)

---

### Challenge 6: ABN Validation
**Problem:** ABN has specific format and checksum algorithm.

**Solution:**
- Phase 1: Regex validation (11 digits)
- Future: Implement ABN checksum algorithm
- Future: ABN lookup API integration

---

### Challenge 7: Credit Limit vs Current Balance Tracking
**Problem:** Tracking outstanding payments against credit limit.

**Solution:**
- Store both creditLimit and currentBalance
- Manual updates initially
- Future: Integrate with Xero for auto-calculation from unpaid invoices
- Future: Alert when approaching credit limit

---

## Pre-Completion Checklist

Before marking implementation complete:

### Database
- [x] Run `pnpm db:generate` successfully
- [x] All models have proper indexes
- [x] All monetary fields are `Int` type (not Float/Decimal)
- [x] Relations defined correctly (Product, InventoryBatch)

### API
- [x] All 11 CRUD endpoints work (getAll, getById, getStats, create, update, updateStatus, linkProduct, updateProductLink, getProducts, delete, getCategories)
- [x] Permission middleware applied to all endpoints
- [x] Validation schemas catch invalid inputs
- [x] Monetary values validated as integers
- [x] Error handling implemented
- [x] Audit logging working with field-level change tracking

### Permissions
- [x] Permissions defined in constants
- [x] Permission types added
- [x] Assigned to appropriate roles
- [x] Permission gates work in UI

### Frontend - List Page
- [x] List page displays suppliers
- [x] Search filters suppliers
- [x] Status filter works
- [x] Sorting works
- [x] Stats cards show correct counts
- [x] Mobile card view displays correctly
- [x] Empty state shows when no data

### Frontend - Create Page
- [x] Create page loads with all 6 tabs
- [x] Tab navigation works correctly
- [x] Tab error indicators show when validation fails
- [x] All form fields work (40+ fields across tabs)
- [x] Optional sections toggle correctly (secondary contact, accounts contact, bank details)
- [x] "Same as business" checkbox works for delivery address
- [x] Category add/remove works
- [x] Per-tab validation shows field-level errors
- [x] Composite validation on submit navigates to first error tab
- [x] Monetary fields parse correctly with parseToCents
- [x] Success/error toasts display
- [x] Redirects to list page on success

### Frontend - Detail Page
- [x] Detail page loads all supplier information
- [x] Two-column layout displays correctly (2/3 main + 1/3 sidebar)
- [x] All section cards display correctly
- [x] Edit mode toggle works (view → edit → save/cancel)
- [x] Floating action bar appears in edit mode
- [x] PermissionGate hides edit button for unauthorized users
- [x] Monetary values formatted with formatAUD
- [x] Suspend/Activate buttons work with dialogs
- [x] Suspension reason validation (min 10 chars)
- [x] Performance metrics card displays
- [x] Compliance card displays with expiry dates
- [x] Suspension info card shows when suspended
- [x] Can link products to supplier via LinkProductDialog
- [x] Linked products table displays with actions
- [x] Recent inventory batches display
- [x] Can navigate back to list

### i18n
- [x] All text uses `t()` function (no hardcoded strings)
- [x] Translation keys added to ALL 3 language files
- [x] English translations complete (90+ keys in supplierDetail namespace)
- [x] Chinese (Simplified) translations complete
- [x] Chinese (Traditional) translations complete
- [x] Language switching works
- [x] All validation messages translated
- [x] All dialog/modal texts translated
- [x] Suspension dialog messages work correctly

### Money Handling
- [x] All monetary values stored as integers (cents)
- [x] All monetary displays use formatAUD
- [x] All monetary inputs use parseToCents
- [x] All monetary edits use formatCentsForInput
- [x] Validation rejects non-integer cents
- [x] No floating-point arithmetic on money

### Build & Type Check
- [x] `pnpm type-check` passes with no errors
- [x] `pnpm build` succeeds for admin-portal
- [ ] No console errors in development
- [ ] No console warnings about missing keys

### Mobile & Responsiveness
- [ ] List page responsive on mobile
- [ ] Create/edit dialogs work on mobile
- [ ] Detail page layout adapts to mobile
- [ ] Navigation works on mobile
- [ ] Touch interactions work

### Integration
- [ ] Inventory batch UI shows supplier
- [ ] Product detail shows suppliers
- [x] Navigation item appears in sidebar
- [x] Permission gates hide/show correctly

### Testing
- [ ] Manual testing completed
- [ ] Edge cases tested (zero, large amounts, invalid inputs)
- [ ] Error scenarios tested (network error, validation error)
- [ ] All 3 languages tested
- [ ] Mobile devices tested

---

## Success Criteria

### Functional Requirements
✅ Create suppliers with full business, contact, financial, and delivery information
✅ Edit supplier information
✅ Manage supplier status (active, inactive, suspended, pending)
✅ Link products to suppliers with cost tracking
✅ View supplier details with all related data
✅ Search and filter suppliers
✅ Track credit limits and payment terms

### Technical Requirements
✅ Full TypeScript type safety throughout
✅ No build errors or type errors
✅ All monetary values stored as integers (cents)
✅ Proper monetary handling (parseToCents, formatAUD)
✅ Permission-based access control
✅ Follows existing patterns (tRPC, Prisma, next-intl)

### UX Requirements
✅ Mobile responsive design
✅ All text internationalized (3 languages)
✅ Clear validation messages
✅ Loading and error states handled
✅ Empty states with clear CTAs
✅ Consistent UI with existing modules

---

## Verification Steps

After complete implementation, perform these verification steps:

1. **Navigate** to `/suppliers` → List page displays ✅
2. **Click** "Add Supplier" → Dialog opens ✅
3. **Fill** form with test data:
   - Supplier Code: SUP001
   - Business Name: Test Supplier Pty Ltd
   - ABN: 12345678901
   - Contact: John Doe, john@test.com, 0400000000
   - Address: 123 Test St, Sydney, NSW, 2000
   - Credit Limit: "$5,000.00"
   - Payment Terms: "Net 30"
4. **Submit** → Supplier created ✅
5. **Verify** in database: creditLimit = 500000 (cents) ✅
6. **Verify** in list: displays "$5,000.00" ✅
7. **Click** supplier name → Detail page loads ✅
8. **Click** edit → Dialog pre-fills with correct values ✅
9. **Update** credit limit to "$7,500.00" → Saves successfully ✅
10. **Verify** in database: creditLimit = 750000 (cents) ✅
11. **Click** "Link Product" → Can associate products ✅
12. **Verify** ProductSupplier record created ✅
13. **Switch** to Chinese (Simplified) → All text displays in Chinese ✅
14. **Switch** to Chinese (Traditional) → All text displays in Traditional Chinese ✅
15. **Run** `pnpm type-check` → No errors ✅
16. **Run** `pnpm build` → Successful build ✅

---

## Future Enhancements

Consider these enhancements after initial implementation:

1. **Purchase Order Management**
   - Create POs directly from supplier page
   - Track PO status and delivery
   - Reconcile deliveries against POs

2. **Performance Analytics**
   - Charts showing delivery performance
   - Cost trend analysis
   - Supplier comparison dashboard

3. **Xero Integration**
   - Sync suppliers as Xero contacts
   - Auto-update currentBalance from unpaid bills
   - Link Xero bills to suppliers

4. **Supplier Portal**
   - External login for suppliers
   - View POs and delivery schedules
   - Update product availability

5. **Contract Management**
   - Upload and store supplier contracts
   - Track contract expiry dates
   - Link pricing tiers to contracts

6. **Multi-Currency Support**
   - Support international suppliers
   - Currency conversion
   - Multi-currency pricing

7. **Quality Tracking**
   - Log quality issues
   - Track defect rates
   - Supplier scorecards

8. **Automated Ordering**
   - Reorder point automation
   - Generate POs based on inventory levels
   - Preferred supplier selection

---

## Notes

- This plan follows all established patterns from the customer and product modules
- All monetary values are consistently handled as integers (cents)
- Full internationalization with 3 languages from the start
- Mobile-first responsive design
- Permission-based security throughout
- Comprehensive validation at all layers
- Ready for future enhancements (Xero integration, PO management, supplier portal)

---

**Plan Status:** ✅ Ready for Implementation
**Next Step:** Begin Phase 1 - Database Foundation
