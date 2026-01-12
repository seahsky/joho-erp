# Supplier Management Module - Complete Implementation Plan

**Status:** Planning Complete - Ready for Implementation
**Created:** 2026-01-12
**Estimated Duration:** 17-19 days (7 phases)

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
├── page.tsx                           # List page
├── [id]/
│   └── page.tsx                       # Detail page
└── components/
    ├── CreateSupplierDialog.tsx       # Create dialog
    ├── EditSupplierDialog.tsx         # Edit dialog
    ├── LinkProductDialog.tsx          # Product linking
    └── SupplierStatusBadge.tsx        # Status badge
```

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
import { router, protectedProcedure, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import { SupplierStatus, PaymentMethod } from '@joho-erp/database/generated/prisma';

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
  getAll: protectedProcedure
    .use(requirePermission('suppliers:view'))
    .input(
      z.object({
        search: z.string().optional(),
        status: z.nativeEnum(SupplierStatus).optional(),
        category: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(20),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, limit, sortBy, sortOrder, search, status, category } = input;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { businessName: { contains: search, mode: 'insensitive' } },
          { supplierCode: { contains: search, mode: 'insensitive' } },
          { tradingName: { contains: search, mode: 'insensitive' } },
          { 'primaryContact.email': { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (category) {
        where.primaryCategories = { has: category };
      }

      // Build order by
      const orderBy = buildPrismaOrderBy(
        sortBy,
        sortOrder,
        supplierSortFieldMapping
      );

      // Execute query
      const skip = (page - 1) * limit;
      const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            _count: {
              select: { products: true, inventoryBatches: true },
            },
          },
        }),
        prisma.supplier.count({ where }),
      ]);

      return {
        suppliers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Get supplier by ID with full details
  getById: protectedProcedure
    .use(requirePermission('suppliers:view'))
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
  getStats: protectedProcedure
    .use(requirePermission('suppliers:view'))
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
  create: protectedProcedure
    .use(requirePermission('suppliers:create'))
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

      // Log creation (assuming audit log function exists)
      await logAuditEvent({
        entityType: 'supplier',
        entityId: supplier.id,
        action: 'create',
        userId: ctx.userId!,
        metadata: { supplierCode: supplier.supplierCode },
      });

      return supplier;
    }),

  // Update supplier
  update: protectedProcedure
    .use(requirePermission('suppliers:edit'))
    .input(
      z.object({
        id: z.string(),
        data: createSupplierSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Check supplier exists
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

      // Log update
      await logAuditEvent({
        entityType: 'supplier',
        entityId: supplier.id,
        action: 'update',
        userId: ctx.userId!,
        metadata: { changes: data },
      });

      return supplier;
    }),

  // Update supplier status
  updateStatus: protectedProcedure
    .use(requirePermission('suppliers:edit'))
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(SupplierStatus),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, status, reason } = input;

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

      // Log status change
      await logAuditEvent({
        entityType: 'supplier',
        entityId: supplier.id,
        action: 'update',
        userId: ctx.userId!,
        metadata: { statusChange: { from: 'previous', to: status, reason } },
      });

      return supplier;
    }),

  // Link product to supplier
  linkProduct: protectedProcedure
    .use(requirePermission('suppliers:edit'))
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
  updateProductLink: protectedProcedure
    .use(requirePermission('suppliers:edit'))
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
  getProducts: protectedProcedure
    .use(requirePermission('suppliers:view'))
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

```typescript
import { Building2 } from 'lucide-react';

export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  // ... existing items
  {
    id: 'products',
    labelKey: 'products',
    icon: Package,
    path: '/products',
    permission: 'products:view',
  },
  // ADD THIS:
  {
    id: 'suppliers',
    labelKey: 'suppliers',
    icon: Building2,
    path: '/suppliers',
    permission: 'suppliers:view',
  },
  {
    id: 'inventory',
    labelKey: 'inventory',
    icon: Warehouse,
    path: '/inventory',
    permission: 'inventory:view',
  },
  // ... rest of items
];
```

### Page Structure

#### 1. List Page

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/page.tsx`

```typescript
'use client';

import { useState } from 'use';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { useTableSort } from '@joho-erp/shared/hooks';
import { ResponsiveTable, type TableColumn } from '@joho-erp/ui';
import { Button } from '@joho-erp/ui/components/button';
import { Input } from '@joho-erp/ui/components/input';
import { formatAUD } from '@joho-erp/shared';
import { CreateSupplierDialog } from './components/CreateSupplierDialog';
import { Building2, Plus, Search } from 'lucide-react';

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
  const t = useTranslations('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addSupplier')}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title={t('stats.total')}
            value={stats.total}
            icon={Building2}
          />
          <StatsCard
            title={t('stats.active')}
            value={stats.active}
            variant="success"
          />
          <StatsCard
            title={t('stats.pending')}
            value={stats.pendingApproval}
            variant="warning"
          />
          <StatsCard
            title={t('stats.suspended')}
            value={stats.suspended}
            variant="destructive"
          />
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
            onClick: () => setShowCreateDialog(true),
          },
        }}
      />

      {/* Create Dialog */}
      <CreateSupplierDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
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
import { formatAUD } from '@joho-erp/shared';
import { ArrowLeft, Edit, Building2 } from 'lucide-react';
import { useState } from 'react';
import { EditSupplierDialog } from '../components/EditSupplierDialog';
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!supplier) {
    return <div>Supplier not found</div>;
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
          {/* Business Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('businessInfo')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <InfoItem label={t('businessName')} value={supplier.businessName} />
              <InfoItem label={t('tradingName')} value={supplier.tradingName || '-'} />
              <InfoItem label={t('abn')} value={supplier.abn || '-'} />
              <InfoItem label={t('acn')} value={supplier.acn || '-'} />
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
                  <InfoItem label={t('name')} value={supplier.primaryContact.name} />
                  <InfoItem label={t('position')} value={supplier.primaryContact.position || '-'} />
                  <InfoItem label={t('email')} value={supplier.primaryContact.email} />
                  <InfoItem label={t('phone')} value={supplier.primaryContact.phone} />
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Terms */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('financialTerms')}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <InfoItem
                label={t('creditLimit')}
                value={formatAUD(supplier.creditLimit)}
              />
              <InfoItem
                label={t('currentBalance')}
                value={formatAUD(supplier.currentBalance)}
              />
              <InfoItem label={t('paymentTerms')} value={supplier.paymentTerms || '-'} />
              <InfoItem label={t('paymentMethod')} value={supplier.paymentMethod} />
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
          {/* Delivery Terms */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('deliveryTerms')}</h2>
            <div className="space-y-3">
              <InfoItem
                label={t('minimumOrder')}
                value={supplier.minimumOrderValue ? formatAUD(supplier.minimumOrderValue) : '-'}
              />
              <InfoItem
                label={t('leadTime')}
                value={supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : '-'}
              />
              <InfoItem label={t('deliveryDays')} value={supplier.deliveryDays || '-'} />
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

#### 3. Create Dialog Component

**File:** `/apps/admin-portal/app/[locale]/(app)/suppliers/components/CreateSupplierDialog.tsx`

```typescript
'use client';

import { useState } from 'react';
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
} from '@joho-erp/ui/components/dialog';
import { Button } from '@joho-erp/ui/components/button';
import { Input } from '@joho-erp/ui/components/input';
import { Label } from '@joho-erp/ui/components/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@joho-erp/ui/components/tabs';
import { Loader2 } from 'lucide-react';

interface CreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSupplierDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSupplierDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('supplierForm');

  // Form state
  const [supplierCode, setSupplierCode] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [abn, setAbn] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Create mutation
  const createMutation = api.supplier.create.useMutation({
    onSuccess: () => {
      toast({
        description: t('messages.createSuccess'),
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSupplierCode('');
    setBusinessName('');
    setAbn('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setStreet('');
    setSuburb('');
    setState('');
    setPostcode('');
    setCreditLimit('');
    setPaymentTerms('');
    setLeadTimeDays('');
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!supplierCode.trim()) {
      errors.supplierCode = t('validation.supplierCodeRequired');
    }

    if (!businessName.trim()) {
      errors.businessName = t('validation.businessNameRequired');
    }

    if (!contactName.trim()) {
      errors.contactName = t('validation.contactNameRequired');
    }

    if (!contactEmail.trim()) {
      errors.contactEmail = t('validation.contactEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.contactEmail = t('validation.contactEmailInvalid');
    }

    if (!contactPhone.trim()) {
      errors.contactPhone = t('validation.contactPhoneRequired');
    }

    if (!street.trim()) {
      errors.street = t('validation.streetRequired');
    }

    if (!suburb.trim()) {
      errors.suburb = t('validation.suburbRequired');
    }

    if (!state.trim()) {
      errors.state = t('validation.stateRequired');
    }

    if (!postcode.trim()) {
      errors.postcode = t('validation.postcodeRequired');
    } else if (!/^\d{4}$/.test(postcode)) {
      errors.postcode = t('validation.postcodeInvalid');
    }

    if (creditLimit && parseToCents(creditLimit) === null) {
      errors.creditLimit = t('validation.creditLimitInvalid');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        description: t('messages.fixValidationErrors'),
      });
      return;
    }

    const creditLimitCents = creditLimit ? parseToCents(creditLimit) || 0 : 0;
    const leadTimeDaysInt = leadTimeDays ? parseInt(leadTimeDays, 10) : undefined;

    createMutation.mutate({
      supplierCode,
      businessName,
      abn: abn || undefined,
      primaryContact: {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
      },
      businessAddress: {
        street,
        suburb,
        state: state as any,
        postcode,
        country: 'Australia',
      },
      creditLimit: creditLimitCents,
      paymentTerms: paymentTerms || undefined,
      leadTimeDays: leadTimeDaysInt,
      primaryCategories: [],
      paymentMethod: 'account_credit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title.create')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="business">{t('tabs.business')}</TabsTrigger>
            <TabsTrigger value="contact">{t('tabs.contact')}</TabsTrigger>
            <TabsTrigger value="financial">{t('tabs.financial')}</TabsTrigger>
          </TabsList>

          {/* Business Info Tab */}
          <TabsContent value="business" className="space-y-4">
            <div>
              <Label htmlFor="supplierCode">{t('fields.supplierCode')} *</Label>
              <Input
                id="supplierCode"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                placeholder={t('fields.supplierCodePlaceholder')}
              />
              {fieldErrors.supplierCode && (
                <p className="text-sm text-destructive mt-1">
                  {fieldErrors.supplierCode}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="businessName">{t('fields.businessName')} *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t('fields.businessNamePlaceholder')}
              />
              {fieldErrors.businessName && (
                <p className="text-sm text-destructive mt-1">
                  {fieldErrors.businessName}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="abn">{t('fields.abn')}</Label>
              <Input
                id="abn"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder={t('fields.abnPlaceholder')}
                maxLength={11}
              />
              {fieldErrors.abn && (
                <p className="text-sm text-destructive mt-1">{fieldErrors.abn}</p>
              )}
            </div>
          </TabsContent>

          {/* Contact & Address Tab */}
          <TabsContent value="contact" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">{t('sections.primaryContact')}</h3>

              <div>
                <Label htmlFor="contactName">{t('fields.contactName')} *</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t('fields.contactNamePlaceholder')}
                />
                {fieldErrors.contactName && (
                  <p className="text-sm text-destructive mt-1">
                    {fieldErrors.contactName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contactEmail">{t('fields.contactEmail')} *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t('fields.contactEmailPlaceholder')}
                />
                {fieldErrors.contactEmail && (
                  <p className="text-sm text-destructive mt-1">
                    {fieldErrors.contactEmail}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contactPhone">{t('fields.contactPhone')} *</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder={t('fields.contactPhonePlaceholder')}
                />
                {fieldErrors.contactPhone && (
                  <p className="text-sm text-destructive mt-1">
                    {fieldErrors.contactPhone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">{t('sections.businessAddress')}</h3>

              <div>
                <Label htmlFor="street">{t('fields.street')} *</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={t('fields.streetPlaceholder')}
                />
                {fieldErrors.street && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.street}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="suburb">{t('fields.suburb')} *</Label>
                  <Input
                    id="suburb"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder={t('fields.suburbPlaceholder')}
                  />
                  {fieldErrors.suburb && (
                    <p className="text-sm text-destructive mt-1">{fieldErrors.suburb}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">{t('fields.state')} *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fields.statePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.state && (
                    <p className="text-sm text-destructive mt-1">{fieldErrors.state}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="postcode">{t('fields.postcode')} *</Label>
                <Input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder={t('fields.postcodePlaceholder')}
                  maxLength={4}
                />
                {fieldErrors.postcode && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.postcode}</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Financial Terms Tab */}
          <TabsContent value="financial" className="space-y-4">
            <div>
              <Label htmlFor="creditLimit">{t('fields.creditLimit')}</Label>
              <Input
                id="creditLimit"
                type="number"
                min="0"
                step="100"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder={t('fields.creditLimitPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('hints.enterDollars')}
              </p>
              {fieldErrors.creditLimit && (
                <p className="text-sm text-destructive mt-1">
                  {fieldErrors.creditLimit}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="paymentTerms">{t('fields.paymentTerms')}</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder={t('fields.paymentTermsPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="leadTimeDays">{t('fields.leadTimeDays')}</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder={t('fields.leadTimeDaysPlaceholder')}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('buttons.createSupplier')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
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
    "name": "Name",
    "position": "Position",
    "email": "Email",
    "phone": "Phone",
    "businessName": "Business Name",
    "tradingName": "Trading Name",
    "abn": "ABN",
    "acn": "ACN",
    "creditLimit": "Credit Limit",
    "currentBalance": "Current Balance",
    "paymentTerms": "Payment Terms",
    "paymentMethod": "Payment Method",
    "minimumOrder": "Minimum Order Value",
    "leadTime": "Lead Time",
    "deliveryDays": "Delivery Days",
    "createdAt": "Created",
    "updatedAt": "Last Updated",
    "linkProduct": "Link Product"
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

### Phase 5: Create & Edit (Day 10-13)

**Tasks:**
1. Create CreateSupplierDialog component with multi-tab form
2. Implement form state management (individual fields)
3. Add validation with field-level error tracking
4. Implement monetary field handling (parseToCents/formatCentsForInput)
5. Create EditSupplierDialog component
6. Test CRUD operations end-to-end
7. Test with invalid inputs
8. Test monetary values (cents storage, dollar display)

**Validation:**
- Can create new supplier with all fields
- Validation shows errors for invalid inputs
- Monetary values parse correctly from user input
- Credit limit stored as cents in database
- Can edit existing supplier
- Pre-filled values display correctly in edit dialog
- Success/error toasts display

**Files Created:**
- `/apps/admin-portal/app/[locale]/(app)/suppliers/components/CreateSupplierDialog.tsx`
- `/apps/admin-portal/app/[locale]/(app)/suppliers/components/EditSupplierDialog.tsx`

---

### Phase 6: Detail Page & Product Linking (Day 14-16)

**Tasks:**
1. Create supplier detail page with 3-column layout
2. Display business info, contact info, financial terms
3. Add delivery terms sidebar
4. Create LinkProductDialog component
5. Implement product linking (ProductSupplier creation)
6. Display linked products table
7. Show inventory batches from supplier
8. Add status management UI

**Validation:**
- Detail page loads with all supplier information
- All monetary values display formatted as "$X.XX"
- Can link products to supplier
- Linked products display with cost prices
- Can update product-supplier links
- Recent inventory batches display
- Can navigate back to list

**Files Created:**
- `/apps/admin-portal/app/[locale]/(app)/suppliers/[id]/page.tsx`
- `/apps/admin-portal/app/[locale]/(app)/suppliers/components/LinkProductDialog.tsx`

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
- [ ] Run `pnpm db:generate` successfully
- [ ] All models have proper indexes
- [ ] All monetary fields are `Int` type (not Float/Decimal)
- [ ] Relations defined correctly (Product, InventoryBatch)

### API
- [ ] All CRUD endpoints work (getAll, getById, create, update, updateStatus)
- [ ] Permission middleware applied to all endpoints
- [ ] Validation schemas catch invalid inputs
- [ ] Monetary values validated as integers
- [ ] Error handling implemented

### Permissions
- [ ] Permissions defined in constants
- [ ] Permission types added
- [ ] Assigned to appropriate roles
- [ ] Permission gates work in UI

### Frontend - List Page
- [ ] List page displays suppliers
- [ ] Search filters suppliers
- [ ] Status filter works
- [ ] Sorting works
- [ ] Stats cards show correct counts
- [ ] Mobile card view displays correctly
- [ ] Empty state shows when no data

### Frontend - Create/Edit
- [ ] Create dialog opens and closes
- [ ] All form fields work
- [ ] Validation shows errors
- [ ] Monetary fields parse correctly with parseToCents
- [ ] Success/error toasts display
- [ ] Edit dialog pre-fills values
- [ ] formatCentsForInput used for editing monetary values

### Frontend - Detail Page
- [ ] Detail page loads all information
- [ ] All sections display correctly
- [ ] Monetary values formatted with formatAUD
- [ ] Can link products to supplier
- [ ] Linked products display
- [ ] Can navigate back to list

### i18n
- [ ] All text uses `t()` function (no hardcoded strings)
- [ ] Translation keys added to ALL 3 language files
- [ ] English translations complete
- [ ] Chinese (Simplified) translations complete
- [ ] Chinese (Traditional) translations complete
- [ ] Language switching works

### Money Handling
- [ ] All monetary values stored as integers (cents)
- [ ] All monetary displays use formatAUD
- [ ] All monetary inputs use parseToCents
- [ ] All monetary edits use formatCentsForInput
- [ ] Validation rejects non-integer cents
- [ ] No floating-point arithmetic on money

### Build & Type Check
- [ ] `pnpm type-check` passes with no errors
- [ ] `pnpm build` succeeds for admin-portal
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
- [ ] Navigation item appears in sidebar
- [ ] Permission gates hide/show correctly

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
