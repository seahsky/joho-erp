# Feature Plan: Configurable Delivery Areas & Packing/Delivery Alignment

**Date:** 2026-01-03
**Status:** Planned
**Priority:** High

---

## Executive Summary

This document outlines the implementation plan for three interconnected features:

1. **Hide Area Selection from Customer Portal** - Customers will no longer select their delivery area during onboarding
2. **Make Areas Configurable in Admin Portal** - Full CRUD functionality for delivery areas (e.g., "East-1", "East-2")
3. **Align Packing & Delivery Pages** - Standardize UI patterns, layouts, and components across both operational pages

---

## Table of Contents

1. [Background & Current State](#background--current-state)
2. [Requirements](#requirements)
3. [Architecture Changes](#architecture-changes)
4. [Database Schema Changes](#database-schema-changes)
5. [API Changes](#api-changes)
6. [Customer Portal Changes](#customer-portal-changes)
7. [Admin Portal Changes](#admin-portal-changes)
8. [Packing/Delivery Alignment](#packingdelivery-alignment)
9. [Shared Component Updates](#shared-component-updates)
10. [Translation Updates](#translation-updates)
11. [Migration Strategy](#migration-strategy)
12. [Implementation Order](#implementation-order)
13. [Risk Assessment](#risk-assessment)
14. [Testing Plan](#testing-plan)
15. [Files Affected](#files-affected)

---

## Background & Current State

### Current Area Implementation

The system currently uses a **hardcoded enum** for delivery areas:

```prisma
enum AreaTag {
  north
  south
  east
  west
}
```

This enum is used throughout the codebase:

| Component | Location | Usage |
|-----------|----------|-------|
| Customer Onboarding | `customer-portal/onboarding/business-info-step.tsx` | Dropdown selection |
| Customer Register API | `packages/api/routers/customer.ts` | Zod validation |
| Suburb Mapping | `packages/database/prisma/schema.prisma` | `SuburbAreaMapping` model |
| Driver Assignment | `packages/database/prisma/schema.prisma` | `DriverAreaAssignment` model |
| Delivery Address | `packages/database/prisma/schema.prisma` | Embedded `DeliveryAddress` type |
| Order Filtering | `packages/api/routers/delivery.ts` | Filter by areaTag |
| UI Display | `packages/ui/components/area-badge.tsx` | Color-coded badge |

### Current Pain Points

1. **Customer Selection Burden**: Customers must know their delivery area, which may not be intuitive
2. **Fixed Areas**: Cannot add new areas like "East-1", "East-2" for granular route planning
3. **Hardcoded Enum**: Changing areas requires database migration and code changes
4. **Inconsistent UI**: Packing and delivery pages have different layouts, filters, and patterns

### Current Packing/Delivery Inconsistencies

| Aspect | Packing Page | Deliveries Page |
|--------|--------------|-----------------|
| Layout | `PackingLayout` wrapper | Direct grid layout |
| Filters | Button-based | Select dropdowns |
| Stats | 3 stat cards | None |
| Date Selection | Input field | Hardcoded to today |
| Empty State | `EmptyState` component | Custom text |
| Responsive | Advanced (tabbed mobile) | Basic grid |

---

## Requirements

### Functional Requirements

#### R1: Hide Area from Customer Portal
- Remove area selection from customer onboarding form
- Customer registration should work without specifying an area
- Admin can assign area to customer later

#### R2: Admin Area Assignment
- Admin can manually assign area when creating/editing customers
- System auto-assigns area based on suburb lookup (using SuburbAreaMapping)
- Manual override takes precedence over auto-assignment

#### R3: Configurable Areas (Full CRUD)
- Admin can create new areas with custom names (e.g., "east-1", "east-2")
- Admin can edit area display names and badge colors
- Admin can soft-delete areas (if no active dependencies)
- Admin can reorder areas for display purposes

#### R4: Packing/Delivery Alignment
- Use consistent layout component across both pages
- Use consistent filter UI patterns
- Add stats to deliveries page
- Use consistent empty state handling

### Non-Functional Requirements

- **Backward Compatibility**: Existing data must continue to work during transition
- **Performance**: Area lookup should be efficient (indexed queries)
- **Internationalization**: All new UI text must be translated
- **Type Safety**: Full TypeScript types for new models

---

## Architecture Changes

### Before (Current)

```
┌─────────────────────┐
│   AreaTag Enum      │  ← Hardcoded in Prisma schema
│   (north|south|     │
│    east|west)       │
└─────────┬───────────┘
          │
    ┌─────┴─────┬──────────────┬──────────────┐
    ▼           ▼              ▼              ▼
┌────────┐ ┌─────────┐ ┌──────────────┐ ┌───────────────┐
│Customer│ │ Order   │ │SuburbMapping │ │DriverAssign   │
│areaTag │ │areaTag  │ │areaTag       │ │areaTag        │
└────────┘ └─────────┘ └──────────────┘ └───────────────┘
```

### After (Proposed)

```
┌─────────────────────┐
│     Area Model      │  ← Dynamic database table
│ id, name, display,  │
│ color, sortOrder    │
└─────────┬───────────┘
          │
    ┌─────┴─────┬──────────────┬──────────────┐
    ▼           ▼              ▼              ▼
┌────────┐ ┌─────────┐ ┌──────────────┐ ┌───────────────┐
│Customer│ │ Order   │ │SuburbMapping │ │DriverAssign   │
│areaId  │ │areaId   │ │areaId (rel)  │ │areaId (rel)   │
│areaName│ │areaName │ └──────────────┘ └───────────────┘
└────────┘ └─────────┘
```

---

## Database Schema Changes

### New Area Model

```prisma
// packages/database/prisma/schema.prisma

model Area {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  name          String   @unique  // Lowercase identifier: "north", "east-1", "east-2"
  displayName   String            // Human-readable: "North", "East 1", "East 2"
  colorVariant  String   @default("default")  // Badge color: "info", "success", "warning", "default", "secondary"
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)  // For display ordering
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  suburbMappings    SuburbAreaMapping[]
  driverAssignments DriverAreaAssignment[]

  @@index([isActive, sortOrder])
  @@map("areas")
}
```

### Updated SuburbAreaMapping Model

```prisma
model SuburbAreaMapping {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  suburb    String
  state     String
  postcode  String

  // NEW: Reference to Area model
  areaId    String   @db.ObjectId
  area      Area     @relation(fields: [areaId], references: [id])

  // DEPRECATED: Keep during transition
  areaTag   String?  // Was: AreaTag enum

  latitude  Float?
  longitude Float?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([suburb, state])
  @@index([postcode])
  @@index([areaId])
  @@index([isActive])
  @@map("suburbareamappings")
}
```

### Updated DriverAreaAssignment Model

```prisma
model DriverAreaAssignment {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  driverId  String   // Clerk user ID

  // NEW: Reference to Area model
  areaId    String   @db.ObjectId
  area      Area     @relation(fields: [areaId], references: [id])

  // DEPRECATED: Keep during transition
  areaTag   String?

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([driverId, areaId])
  @@index([areaId])
  @@index([driverId])
  @@map("driverareaassignments")
}
```

### Updated DeliveryAddress Type

```prisma
type DeliveryAddress {
  street              String
  suburb              String
  state               String
  postcode            String
  country             String    @default("Australia")

  // NEW: Area reference
  areaId              String?   // Optional - null means unassigned
  areaName            String?   // Denormalized for display

  // DEPRECATED: Keep during transition
  areaTag             String?

  latitude            Float?
  longitude           Float?
  deliveryInstructions String?
}
```

### Updated RouteOptimization Model

```prisma
model RouteOptimization {
  id              String              @id @default(auto()) @map("_id") @db.ObjectId
  date            DateTime            @db.Date
  driverId        String?

  // NEW: Area reference
  areaId          String?             @db.ObjectId

  // DEPRECATED
  areaTag         String?

  // ... rest of fields unchanged
}
```

---

## API Changes

### New Area Router

Create new file: `packages/api/src/routers/area.ts`

```typescript
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';
import { requirePermission } from '../middleware/auth';

const areaSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Must be lowercase with hyphens only'),
  displayName: z.string().min(1).max(100),
  colorVariant: z.enum(['info', 'success', 'warning', 'default', 'secondary']),
  sortOrder: z.number().int().optional(),
});

export const areaRouter = router({
  // List all areas
  list: publicProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ input }) => {
      const where = input?.includeInactive ? {} : { isActive: true };
      return prisma.area.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: {
              suburbMappings: { where: { isActive: true } },
              driverAssignments: { where: { isActive: true } },
            },
          },
        },
      });
    }),

  // Get single area
  get: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (input.id) {
        return prisma.area.findUnique({ where: { id: input.id } });
      }
      if (input.name) {
        return prisma.area.findUnique({ where: { name: input.name } });
      }
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must provide id or name' });
    }),

  // Create new area
  create: requirePermission('settings:manage')
    .input(areaSchema)
    .mutation(async ({ input }) => {
      // Check for duplicate name
      const existing = await prisma.area.findUnique({ where: { name: input.name } });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Area name already exists' });
      }

      // Get next sort order
      const maxSort = await prisma.area.aggregate({ _max: { sortOrder: true } });
      const sortOrder = input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;

      return prisma.area.create({
        data: { ...input, sortOrder },
      });
    }),

  // Update area
  update: requirePermission('settings:manage')
    .input(z.object({
      id: z.string(),
      displayName: z.string().min(1).max(100).optional(),
      colorVariant: z.enum(['info', 'success', 'warning', 'default', 'secondary']).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.area.update({ where: { id }, data });
    }),

  // Reorder areas
  reorder: requirePermission('settings:manage')
    .input(z.object({
      areaIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const updates = input.areaIds.map((id, index) =>
        prisma.area.update({
          where: { id },
          data: { sortOrder: index },
        })
      );
      await prisma.$transaction(updates);
      return { success: true };
    }),

  // Delete area (soft delete)
  delete: requirePermission('settings:manage')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Check for dependencies
      const [suburbCount, driverCount, customerCount] = await Promise.all([
        prisma.suburbAreaMapping.count({ where: { areaId: input.id, isActive: true } }),
        prisma.driverAreaAssignment.count({ where: { areaId: input.id, isActive: true } }),
        prisma.customer.count({ where: { deliveryAddress: { is: { areaId: input.id } } } }),
      ]);

      if (suburbCount > 0 || driverCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete: ${suburbCount} suburb mappings and ${driverCount} driver assignments exist`,
        });
      }

      return prisma.area.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // Lookup area by suburb (for auto-assignment)
  lookupBySuburb: publicProcedure
    .input(z.object({
      suburb: z.string(),
      state: z.string().optional(),
      postcode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const mapping = await prisma.suburbAreaMapping.findFirst({
        where: {
          suburb: { equals: input.suburb, mode: 'insensitive' },
          ...(input.state ? { state: input.state } : {}),
          isActive: true,
        },
        include: { area: true },
      });
      return mapping?.area ?? null;
    }),
});
```

### Customer Router Updates

Update `packages/api/src/routers/customer.ts`:

#### Register Mutation Changes

```typescript
// BEFORE (current)
deliveryAddress: z.object({
  street: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string(),
  postcode: z.string(),
  areaTag: z.enum(['north', 'south', 'east', 'west']),  // REQUIRED
  deliveryInstructions: z.string().optional(),
}),

// AFTER (new)
deliveryAddress: z.object({
  street: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string(),
  postcode: z.string(),
  areaId: z.string().optional(),  // Optional manual override
  deliveryInstructions: z.string().optional(),
}),
```

#### Auto-Assignment Logic

```typescript
// In register mutation handler
async mutation({ input }) {
  // Auto-assign area by suburb lookup
  let areaId = input.deliveryAddress.areaId;
  let areaName: string | null = null;

  if (!areaId) {
    // Lookup by suburb
    const mapping = await prisma.suburbAreaMapping.findFirst({
      where: {
        suburb: { equals: input.deliveryAddress.suburb, mode: 'insensitive' },
        state: input.deliveryAddress.state,
        isActive: true,
      },
      include: { area: true },
    });

    if (mapping?.area) {
      areaId = mapping.areaId;
      areaName = mapping.area.name;
    }
  } else {
    // Manual override - get area name
    const area = await prisma.area.findUnique({ where: { id: areaId } });
    areaName = area?.name ?? null;
  }

  // Create customer with area info
  const customer = await prisma.customer.create({
    data: {
      // ... other fields
      deliveryAddress: {
        street: input.deliveryAddress.street,
        suburb: input.deliveryAddress.suburb,
        state: input.deliveryAddress.state,
        postcode: input.deliveryAddress.postcode,
        areaId,
        areaName,
        // Keep deprecated field for transition
        areaTag: areaName,
        deliveryInstructions: input.deliveryAddress.deliveryInstructions,
      },
    },
  });

  return customer;
}
```

### Delivery Router Updates

Update `packages/api/src/routers/delivery.ts`:

```typescript
// Update getAll query to filter by areaId
getAll: requirePermission('deliveries:manage')
  .input(z.object({
    // ... existing filters
    areaId: z.string().optional(),  // NEW: Filter by area ID
    areaTag: z.string().optional(), // DEPRECATED: Keep for compatibility
  }).optional())
  .query(async ({ input }) => {
    const where: Prisma.OrderWhereInput = {};

    // Support both new and old filters during transition
    if (input?.areaId) {
      where.deliveryAddress = { is: { areaId: input.areaId } };
    } else if (input?.areaTag) {
      where.deliveryAddress = { is: { areaTag: input.areaTag } };
    }

    // ... rest of query
  }),
```

---

## Customer Portal Changes

### Remove Area Selection from Onboarding

**File:** `apps/customer-portal/app/[locale]/onboarding/components/business-info-step.tsx`

#### Remove Area Dropdown

Delete lines 339-361 (the area select element):

```tsx
// DELETE THIS ENTIRE BLOCK
<div className="space-y-2">
  <Label htmlFor="areaTag">
    {t('fields.areaTag')} <span className="text-destructive">*</span>
  </Label>
  <select
    id="areaTag"
    value={formData.deliveryAddress.areaTag}
    onChange={(e) =>
      setFormData({
        ...formData,
        deliveryAddress: {
          ...formData.deliveryAddress,
          areaTag: e.target.value as BusinessInfo['deliveryAddress']['areaTag'],
        },
      })
    }
    className="w-full h-10 px-3 rounded-md border border-input bg-background"
  >
    <option value="">{t('fields.areaTagPlaceholder')}</option>
    <option value="north">{t('areaTags.north')}</option>
    <option value="south">{t('areaTags.south')}</option>
    <option value="east">{t('areaTags.east')}</option>
    <option value="west">{t('areaTags.west')}</option>
  </select>
</div>
```

#### Remove Validation

Update `validateStep` function (lines 59-62):

```typescript
// BEFORE
if (!formData.deliveryAddress.areaTag) {
  newErrors.areaTag = t('validation.areaTagRequired');
}

// AFTER: Delete these lines entirely
```

#### Update Interface

Update `BusinessInfo` interface (lines 25-60):

```typescript
// BEFORE
deliveryAddress: {
  // ... other fields
  areaTag: 'north' | 'south' | 'east' | 'west';
};

// AFTER
deliveryAddress: {
  // ... other fields
  // areaTag removed - area will be auto-assigned by admin/system
};
```

### Update Onboarding Page

**File:** `apps/customer-portal/app/[locale]/onboarding/page.tsx`

Remove `areaTag` from default form data and type definitions.

---

## Admin Portal Changes

### New Area Management Page

**File:** `apps/admin-portal/app/[locale]/(app)/settings/areas/page.tsx` (NEW)

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@joho-erp/ui';
import { Button } from '@joho-erp/ui';
import { Badge } from '@joho-erp/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@joho-erp/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@joho-erp/ui';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

// ... Component implementation with:
// - Area list with drag-to-reorder
// - Create area dialog
// - Edit area dialog
// - Delete confirmation
// - Usage counts display
```

Features to implement:
1. List all areas with sortable rows (drag-to-reorder)
2. Create new area button with dialog form
3. Edit area inline or via dialog
4. Delete button with dependency check
5. Show suburb and driver counts per area
6. Color variant picker (badge preview)

### Update Settings Navigation

**File:** `apps/admin-portal/app/[locale]/(app)/settings/page.tsx`

Add new category:

```tsx
{
  id: 'areas',
  icon: MapPin,
  titleKey: 'categories.areas',
  descriptionKey: 'categories.areasDescription',
  href: `/${locale}/settings/areas`,
  available: true,
},
```

### Update Customer Create/Edit Pages

**Files:**
- `apps/admin-portal/app/[locale]/(app)/customers/new/page.tsx`
- `apps/admin-portal/app/[locale]/(app)/customers/[id]/page.tsx`

Add area selection:

```tsx
// Fetch areas for dropdown
const { data: areas } = api.area.list.useQuery();

// Area lookup on suburb change
const { data: autoArea } = api.area.lookupBySuburb.useQuery(
  { suburb: formData.suburb, state: formData.state },
  { enabled: !!formData.suburb }
);

// Display in form
<div className="space-y-2">
  <Label htmlFor="area">{t('fields.area')}</Label>
  <Select
    value={formData.areaId || ''}
    onValueChange={(value) => setFormData({ ...formData, areaId: value })}
  >
    <SelectTrigger>
      <SelectValue placeholder={t('fields.areaPlaceholder')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">
        {autoArea ? `${autoArea.displayName} (auto)` : t('fields.unassigned')}
      </SelectItem>
      {areas?.map((area) => (
        <SelectItem key={area.id} value={area.id}>
          {area.displayName}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  {autoArea && !formData.areaId && (
    <p className="text-sm text-muted-foreground">
      {t('fields.autoAssignedTo', { area: autoArea.displayName })}
    </p>
  )}
</div>
```

### Update Driver Settings Page

**File:** `apps/admin-portal/app/[locale]/(app)/settings/drivers/page.tsx`

Change from hardcoded to dynamic:

```tsx
// BEFORE
const areas = ['north', 'south', 'east', 'west'];

// AFTER
const { data: areas } = api.area.list.useQuery();

// Update grid to use dynamic areas
<div className="grid gap-4" style={{ gridTemplateColumns: `auto repeat(${areas?.length ?? 4}, 1fr)` }}>
  {/* ... */}
</div>
```

---

## Packing/Delivery Alignment

### Create Shared OperationsLayout Component

**File:** `apps/admin-portal/components/operations/OperationsLayout.tsx` (NEW)

```tsx
'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@joho-erp/ui';
import { Button } from '@joho-erp/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@joho-erp/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OperationsLayoutProps {
  sidebar: ReactNode;
  sidebarTitle: string;
  main: ReactNode;
  mainTitle: string;
  className?: string;
}

export function OperationsLayout({
  sidebar,
  sidebarTitle,
  main,
  mainTitle,
  className,
}: OperationsLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      {/* Mobile: Tabbed view */}
      <div className="lg:hidden">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sidebar">{sidebarTitle}</TabsTrigger>
            <TabsTrigger value="main">{mainTitle}</TabsTrigger>
          </TabsList>
          <TabsContent value="sidebar" className="mt-4">
            {sidebar}
          </TabsContent>
          <TabsContent value="main" className="mt-4">
            {main}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Two-panel view */}
      <div className={cn('hidden lg:grid gap-4', className)} style={{
        gridTemplateColumns: sidebarCollapsed ? '52px 1fr' : '350px 1fr',
      }}>
        {/* Sidebar */}
        <div className="relative">
          <div className={cn(
            'transition-all duration-300',
            sidebarCollapsed && 'opacity-0 invisible'
          )}>
            {sidebar}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>

        {/* Main content */}
        <div>{main}</div>
      </div>
    </>
  );
}
```

### Create Shared FilterBar Component

**File:** `apps/admin-portal/components/operations/FilterBar.tsx` (NEW)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@joho-erp/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@joho-erp/ui';
import { Search } from 'lucide-react';
import { api } from '@/utils/api';

interface FilterBarProps {
  // Date filter
  date?: Date;
  onDateChange?: (date: Date) => void;
  showDateFilter?: boolean;

  // Search filter
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  showSearchFilter?: boolean;

  // Status filter
  status?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: { value: string; label: string }[];
  showStatusFilter?: boolean;

  // Area filter
  areaId?: string;
  onAreaChange?: (areaId: string) => void;
  showAreaFilter?: boolean;

  // Driver filter
  driverId?: string;
  onDriverChange?: (driverId: string) => void;
  showDriverFilter?: boolean;
}

export function FilterBar({
  date,
  onDateChange,
  showDateFilter = false,
  search,
  onSearchChange,
  searchPlaceholder,
  showSearchFilter = false,
  status,
  onStatusChange,
  statusOptions = [],
  showStatusFilter = false,
  areaId,
  onAreaChange,
  showAreaFilter = false,
  driverId,
  onDriverChange,
  showDriverFilter = false,
}: FilterBarProps) {
  const t = useTranslations('common');
  const { data: areas } = api.area.list.useQuery(undefined, { enabled: showAreaFilter });

  return (
    <div className="flex flex-wrap gap-3">
      {showDateFilter && (
        <Input
          type="date"
          value={date?.toISOString().split('T')[0]}
          onChange={(e) => onDateChange?.(new Date(e.target.value))}
          className="w-40"
        />
      )}

      {showSearchFilter && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder ?? t('search')}
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      )}

      {showStatusFilter && statusOptions.length > 0 && (
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all')}</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showAreaFilter && (
        <Select value={areaId} onValueChange={onAreaChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filters.area')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allAreas')}</SelectItem>
            {areas?.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
```

### Create Shared StatsBar Component

**File:** `apps/admin-portal/components/operations/StatsBar.tsx` (NEW)

```tsx
'use client';

import { Card, CardContent } from '@joho-erp/ui';
import { cn } from '@joho-erp/ui';

interface Stat {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

interface StatsBarProps {
  stats: Stat[];
  className?: string;
}

export function StatsBar({ stats, className }: StatsBarProps) {
  return (
    <div className={cn('grid gap-4', className)} style={{
      gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
    }}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {stat.icon && (
                <div className="p-2 rounded-lg bg-muted">{stat.icon}</div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Update Deliveries Page

**File:** `apps/admin-portal/app/[locale]/(app)/deliveries/page.tsx`

Key changes:
1. Import and use `OperationsLayout`
2. Add `StatsBar` with delivery statistics
3. Use `FilterBar` for consistent filtering
4. Fetch areas from API for filter dropdown
5. Use `EmptyState` component for empty states

### Update Packing Page

**File:** `apps/admin-portal/app/[locale]/(app)/packing/page.tsx`

Key changes:
1. Refactor to use `OperationsLayout` (may already use `PackingLayout`)
2. Use `FilterBar` for consistent filtering
3. Fetch areas from API for filter dropdown
4. Ensure consistent with deliveries page

---

## Shared Component Updates

### AreaBadge Component

**File:** `packages/ui/src/components/area-badge.tsx`

Update to support both legacy string and new Area object:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';
import { Badge, type BadgeProps } from './badge';

// Support both string (legacy) and Area object (new)
export type AreaType = string | {
  name: string;
  displayName: string;
  colorVariant: string;
};

export interface AreaBadgeProps extends Omit<BadgeProps, 'variant'> {
  area: AreaType;
}

// Legacy color mapping for backward compatibility
const legacyColorMap: Record<string, BadgeProps['variant']> = {
  north: 'info',
  south: 'success',
  east: 'warning',
  west: 'default',
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AreaBadge({ area, className, ...props }: AreaBadgeProps) {
  const t = useTranslations('areaTags');

  // Handle Area object
  if (typeof area === 'object') {
    return (
      <Badge
        variant={area.colorVariant as BadgeProps['variant']}
        className={cn(className)}
        {...props}
      >
        {area.displayName}
      </Badge>
    );
  }

  // Handle legacy string
  const normalizedArea = area.toLowerCase();
  const variant = legacyColorMap[normalizedArea] || 'secondary';
  const label = t(normalizedArea, { defaultValue: capitalize(normalizedArea) });

  return (
    <Badge variant={variant} className={cn(className)} {...props}>
      {label}
    </Badge>
  );
}
```

### New AreaSelector Component

**File:** `packages/ui/src/components/area-selector.tsx` (NEW)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { AreaBadge } from './area-badge';

interface Area {
  id: string;
  name: string;
  displayName: string;
  colorVariant: string;
}

interface AreaSelectorProps {
  value: string | null;
  onChange: (areaId: string | null) => void;
  areas: Area[];
  includeUnassigned?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function AreaSelector({
  value,
  onChange,
  areas,
  includeUnassigned = true,
  disabled = false,
  placeholder,
  className,
}: AreaSelectorProps) {
  const t = useTranslations('common');

  return (
    <Select
      value={value ?? 'unassigned'}
      onValueChange={(val) => onChange(val === 'unassigned' ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder ?? t('selectArea')} />
      </SelectTrigger>
      <SelectContent>
        {includeUnassigned && (
          <SelectItem value="unassigned">
            {t('unassigned')}
          </SelectItem>
        )}
        {areas.map((area) => (
          <SelectItem key={area.id} value={area.id}>
            <div className="flex items-center gap-2">
              <AreaBadge area={area} className="text-xs" />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## Translation Updates

### Admin Portal Messages

**Files:**
- `apps/admin-portal/messages/en.json`
- `apps/admin-portal/messages/zh-CN.json`
- `apps/admin-portal/messages/zh-TW.json`

Add the following keys:

```json
{
  "settings": {
    "categories": {
      "areas": "Delivery Areas",
      "areasDescription": "Manage delivery areas and zones"
    }
  },
  "areas": {
    "title": "Delivery Areas",
    "subtitle": "Configure delivery zones and their settings",
    "createArea": "Create Area",
    "editArea": "Edit Area",
    "deleteArea": "Delete Area",
    "fields": {
      "name": "Area ID",
      "namePlaceholder": "e.g., east-1, north-central",
      "nameHelp": "Lowercase letters, numbers, and hyphens only",
      "displayName": "Display Name",
      "displayNamePlaceholder": "e.g., East 1, North Central",
      "colorVariant": "Badge Color",
      "isActive": "Active"
    },
    "colors": {
      "info": "Blue",
      "success": "Green",
      "warning": "Yellow",
      "default": "Gray",
      "secondary": "Purple"
    },
    "usage": {
      "suburbs": "{count} suburbs",
      "drivers": "{count} drivers"
    },
    "deleteConfirm": {
      "title": "Delete Area?",
      "description": "This will deactivate the area. Existing customers and orders will retain their area assignment."
    },
    "errors": {
      "nameExists": "An area with this name already exists",
      "hasDependencies": "Cannot delete area with active suburb mappings or driver assignments"
    },
    "success": {
      "created": "Area created successfully",
      "updated": "Area updated successfully",
      "deleted": "Area deleted successfully"
    }
  },
  "customers": {
    "fields": {
      "area": "Delivery Area",
      "areaPlaceholder": "Select area",
      "unassigned": "Unassigned",
      "autoAssignedTo": "Will be auto-assigned to {area}"
    }
  },
  "common": {
    "filters": {
      "area": "Area",
      "allAreas": "All Areas"
    }
  }
}
```

### Customer Portal Messages

**Files:**
- `apps/customer-portal/messages/en.json`
- `apps/customer-portal/messages/zh-CN.json`
- `apps/customer-portal/messages/zh-TW.json`

Remove or deprecate:
- `fields.areaTag`
- `fields.areaTagPlaceholder`
- `validation.areaTagRequired`

Note: Keep `areaTags.{north,south,east,west}` translations as they may still be used for display.

---

## Migration Strategy

### Phase 1: Additive Changes (Non-Breaking)

1. Add `Area` model to Prisma schema
2. Add `areaId` fields alongside existing `areaTag` fields
3. Run database push to create new collections/fields
4. Run migration script to populate `areaId` from `areaTag`

### Phase 2: Code Updates

1. Update API endpoints to use new fields
2. Update UI components to use new Area model
3. Keep fallback logic for reading old `areaTag` values
4. API returns both old and new fields during transition

### Phase 3: Cleanup (After Verification)

1. Remove deprecated `areaTag` fields from schema
2. Remove `AreaTag` enum
3. Remove old constants and types
4. Final database cleanup

### Migration Script

**File:** `packages/database/src/migrations/migrate-areas.ts` (NEW)

```typescript
import { PrismaClient, AreaTag } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAreas() {
  console.log('Starting area migration...');

  // Step 1: Create Area records from existing enum values
  const areaConfigs = [
    { name: 'north', displayName: 'North', colorVariant: 'info', sortOrder: 1 },
    { name: 'south', displayName: 'South', colorVariant: 'success', sortOrder: 2 },
    { name: 'east', displayName: 'East', colorVariant: 'warning', sortOrder: 3 },
    { name: 'west', displayName: 'West', colorVariant: 'default', sortOrder: 4 },
  ];

  console.log('Creating Area records...');
  const areas = await Promise.all(
    areaConfigs.map((config) =>
      prisma.area.upsert({
        where: { name: config.name },
        create: config,
        update: {},
      })
    )
  );
  console.log(`Created ${areas.length} Area records`);

  // Create lookup map
  const areaMap = new Map(areas.map((a) => [a.name, a.id]));

  // Step 2: Update SuburbAreaMapping
  console.log('Updating SuburbAreaMapping...');
  const suburbs = await prisma.suburbAreaMapping.findMany({
    where: { areaTag: { not: null }, areaId: null },
  });

  let updatedSuburbs = 0;
  for (const suburb of suburbs) {
    const areaId = areaMap.get(suburb.areaTag!);
    if (areaId) {
      await prisma.suburbAreaMapping.update({
        where: { id: suburb.id },
        data: { areaId },
      });
      updatedSuburbs++;
    }
  }
  console.log(`Updated ${updatedSuburbs} suburb mappings`);

  // Step 3: Update DriverAreaAssignment
  console.log('Updating DriverAreaAssignment...');
  const assignments = await prisma.driverAreaAssignment.findMany({
    where: { areaTag: { not: null }, areaId: null },
  });

  let updatedAssignments = 0;
  for (const assignment of assignments) {
    const areaId = areaMap.get(assignment.areaTag!);
    if (areaId) {
      await prisma.driverAreaAssignment.update({
        where: { id: assignment.id },
        data: { areaId },
      });
      updatedAssignments++;
    }
  }
  console.log(`Updated ${updatedAssignments} driver assignments`);

  // Step 4: Update Customers
  console.log('Updating Customers...');
  const customers = await prisma.customer.findMany();

  let updatedCustomers = 0;
  for (const customer of customers) {
    const areaTag = customer.deliveryAddress?.areaTag;
    if (areaTag && !customer.deliveryAddress?.areaId) {
      const areaId = areaMap.get(areaTag);
      if (areaId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            deliveryAddress: {
              ...customer.deliveryAddress,
              areaId,
              areaName: areaTag,
            },
          },
        });
        updatedCustomers++;
      }
    }
  }
  console.log(`Updated ${updatedCustomers} customers`);

  // Step 5: Update Orders
  console.log('Updating Orders...');
  const orders = await prisma.order.findMany();

  let updatedOrders = 0;
  for (const order of orders) {
    const areaTag = order.deliveryAddress?.areaTag;
    if (areaTag && !order.deliveryAddress?.areaId) {
      const areaId = areaMap.get(areaTag);
      if (areaId) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            deliveryAddress: {
              ...order.deliveryAddress,
              areaId,
              areaName: areaTag,
            },
          },
        });
        updatedOrders++;
      }
    }
  }
  console.log(`Updated ${updatedOrders} orders`);

  console.log('Migration complete!');
}

migrateAreas()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Implementation Order

### Priority 1: Core Area System (Phases 1-4)

| Step | File | Description |
|------|------|-------------|
| 1 | `packages/database/prisma/schema.prisma` | Add Area model, update relations |
| 2 | `packages/database/src/seed.ts` | Add Area seed data |
| 3 | `packages/database/src/migrations/migrate-areas.ts` | Create migration script |
| 4 | `packages/shared/src/types/index.ts` | Add Area interface |
| 5 | `packages/shared/src/constants/index.ts` | Add color variants |
| 6 | `packages/api/src/routers/area.ts` | Create Area CRUD router |
| 7 | `packages/api/src/routers/index.ts` | Register area router |
| 8 | `packages/api/src/routers/customer.ts` | Add auto-assign logic |
| 9 | `packages/api/src/routers/delivery.ts` | Update filters |
| 10 | `apps/customer-portal/.../business-info-step.tsx` | Remove area selection |
| 11 | `apps/customer-portal/.../onboarding/page.tsx` | Update types |
| 12 | `apps/admin-portal/.../settings/areas/page.tsx` | Create area management page |
| 13 | `apps/admin-portal/.../settings/page.tsx` | Add Areas link |
| 14 | `packages/ui/src/components/area-selector.tsx` | Create reusable selector |

### Priority 2: Integration & Alignment (Phases 5-7)

| Step | File | Description |
|------|------|-------------|
| 15 | `packages/ui/src/components/area-badge.tsx` | Support Area object |
| 16 | `apps/admin-portal/.../customers/new/page.tsx` | Add area selector |
| 17 | `apps/admin-portal/.../settings/drivers/page.tsx` | Dynamic areas |
| 18 | `apps/admin-portal/components/operations/OperationsLayout.tsx` | Create shared layout |
| 19 | `apps/admin-portal/components/operations/FilterBar.tsx` | Create shared filters |
| 20 | `apps/admin-portal/components/operations/StatsBar.tsx` | Create shared stats |
| 21 | `apps/admin-portal/.../deliveries/page.tsx` | Refactor with new components |
| 22 | `apps/admin-portal/.../packing/page.tsx` | Refactor with new components |
| 23-28 | All message files | Add translations |

### Priority 3: Cleanup (Phase 8)

| Step | File | Description |
|------|------|-------------|
| 29 | `packages/database/prisma/schema.prisma` | Remove deprecated fields |
| 30 | `packages/shared/src/types/index.ts` | Remove old types |
| 31 | `packages/shared/src/constants/index.ts` | Remove deprecated constants |

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing customer onboarding | High | Test thoroughly before deployment |
| Data loss during migration | High | Backup database before migration |
| Type errors across codebase | Medium | Keep deprecated fields during transition |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Inconsistent area data | Medium | Validate migration results |
| Driver assignment gaps | Medium | Alert when new areas lack drivers |
| Performance degradation | Medium | Add proper indexes |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Translation missing | Low | Add translations early |
| UI inconsistencies | Low | Use shared components |

---

## Testing Plan

### Unit Tests

1. **Area CRUD Operations**
   - Create area with valid data
   - Create area with duplicate name (should fail)
   - Update area display name and color
   - Delete area without dependencies
   - Delete area with dependencies (should fail)
   - Reorder areas

2. **Auto-Assignment Logic**
   - Customer registration with matching suburb
   - Customer registration with non-matching suburb
   - Customer registration with manual override
   - Suburb lookup query

### Integration Tests

1. **Customer Portal**
   - Complete onboarding without area selection
   - Verify area is auto-assigned after registration
   - Verify area is null when suburb not mapped

2. **Admin Portal**
   - Create customer with auto-assigned area
   - Create customer with manual area override
   - Edit customer area
   - Filter customers by area
   - Driver area assignment with dynamic areas

3. **Delivery Management**
   - Filter deliveries by area
   - Auto-assign drivers by area
   - Route optimization with dynamic areas

### E2E Tests

1. Complete customer onboarding flow
2. Admin creates new area and assigns to customer
3. Full delivery workflow with custom areas
4. Packing workflow with area filtering

### Performance Tests

1. Area list query performance with many areas
2. Suburb lookup query performance
3. Customer list with area filter performance

---

## Files Affected

### New Files (7)

| File | Type |
|------|------|
| `packages/api/src/routers/area.ts` | API Router |
| `packages/database/src/migrations/migrate-areas.ts` | Migration Script |
| `packages/ui/src/components/area-selector.tsx` | UI Component |
| `apps/admin-portal/app/[locale]/(app)/settings/areas/page.tsx` | Page |
| `apps/admin-portal/components/operations/OperationsLayout.tsx` | Component |
| `apps/admin-portal/components/operations/FilterBar.tsx` | Component |
| `apps/admin-portal/components/operations/StatsBar.tsx` | Component |

### Modified Files (25+)

| File | Changes |
|------|---------|
| `packages/database/prisma/schema.prisma` | Add Area model, update relations |
| `packages/database/src/seed.ts` | Add Area seed data |
| `packages/shared/src/types/index.ts` | Add Area interface |
| `packages/shared/src/constants/index.ts` | Add color variants |
| `packages/api/src/routers/index.ts` | Register area router |
| `packages/api/src/routers/customer.ts` | Add auto-assign logic |
| `packages/api/src/routers/delivery.ts` | Update filters |
| `packages/api/src/routers/order.ts` | Update area references |
| `packages/api/src/routers/packing.ts` | Update area displays |
| `packages/ui/src/components/area-badge.tsx` | Support Area object |
| `apps/customer-portal/.../business-info-step.tsx` | Remove area selection |
| `apps/customer-portal/.../onboarding/page.tsx` | Update types |
| `apps/admin-portal/.../settings/page.tsx` | Add Areas link |
| `apps/admin-portal/.../settings/drivers/page.tsx` | Dynamic areas |
| `apps/admin-portal/.../customers/new/page.tsx` | Add area selector |
| `apps/admin-portal/.../customers/[id]/page.tsx` | Update area display |
| `apps/admin-portal/.../customers/page.tsx` | Update filter |
| `apps/admin-portal/.../deliveries/page.tsx` | Refactor layout |
| `apps/admin-portal/.../packing/page.tsx` | Refactor layout |
| `apps/admin-portal/messages/en.json` | Add translations |
| `apps/admin-portal/messages/zh-CN.json` | Add translations |
| `apps/admin-portal/messages/zh-TW.json` | Add translations |
| `apps/customer-portal/messages/en.json` | Remove area fields |
| `apps/customer-portal/messages/zh-CN.json` | Remove area fields |
| `apps/customer-portal/messages/zh-TW.json` | Remove area fields |

---

## Appendix: Type Definitions

### Area Interface

```typescript
// packages/shared/src/types/index.ts

export interface Area {
  id: string;
  name: string;           // Lowercase identifier: "north", "east-1"
  displayName: string;    // Human-readable: "North", "East 1"
  colorVariant: string;   // Badge color: "info", "success", etc.
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AreaWithCounts extends Area {
  _count: {
    suburbMappings: number;
    driverAssignments: number;
  };
}
```

### Updated DeliveryAddress Interface

```typescript
// packages/shared/src/types/index.ts

export interface DeliveryAddress {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  areaId?: string | null;     // Reference to Area
  areaName?: string | null;   // Denormalized for display
  /** @deprecated Use areaName instead */
  areaTag?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryInstructions?: string | null;
}
```

---

*Document created: 2026-01-03*
*Last updated: 2026-01-03*
