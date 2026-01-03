# Xero Product Sync Implementation Plan

> **Status:** Planning Complete
> **Created:** 2026-01-03
> **Last Updated:** 2026-01-03

## Overview

Implement bi-directional product sync between the ERP and Xero, with SKU-based matching, full product details, and "last modified wins" conflict resolution.

---

## Key Decisions

| Aspect | Decision |
|--------|----------|
| Sync Direction | Bi-directional |
| Item Matching | Match by SKU ↔ Xero Code |
| Fields to Sync | Full details (name, description, prices, account codes) |
| Inventory Type | Untracked (ERP manages stock) |
| Conflict Resolution | Last modified wins |
| Xero → ERP Trigger | Hourly polling via Agenda (webhooks not available for Items) |
| Account Codes | Use Xero's codes when importing |

---

## Xero API Constraints

| Constraint | Value |
|------------|-------|
| Rate Limits | 60 calls/min, 5000/day, 5 concurrent |
| Item Code | Max 30 characters |
| Item Name | Max 50 characters |
| POST behavior | Upsert - matches by Code, creates or updates |
| Webhooks | **Not available for Items** (only Contacts, Invoices, Credit Notes) |

---

## Data Mapping

### ERP Product → Xero Item

| ERP Field | Xero Field | Notes |
|-----------|------------|-------|
| `sku` | `Code` | Max 30 chars, validate/truncate |
| `name` | `Name` | Max 50 chars |
| `description` | `Description` | Sales description |
| `description` | `PurchaseDescription` | Same as sales |
| `basePrice / 100` | `SalesDetails.UnitPrice` | Convert cents to dollars |
| `basePrice / 100` | `PurchaseDetails.UnitPrice` | Same (or separate field) |
| env `XERO_SALES_ACCOUNT_CODE` | `SalesDetails.AccountCode` | Default: "200" |
| env `XERO_PURCHASE_ACCOUNT_CODE` | `PurchaseDetails.AccountCode` | New env var needed |
| `status === 'active'` | `IsSold` / `IsPurchased` | Boolean flags |
| - | `IsTrackedAsInventory` | Always `false` (untracked) |

### Xero Item → ERP Product

| Xero Field | ERP Field | Notes |
|------------|-----------|-------|
| `Code` | `sku` | |
| `Name` | `name` | |
| `Description` | `description` | |
| `SalesDetails.UnitPrice * 100` | `basePrice` | Convert to cents |
| `SalesDetails.AccountCode` | `xeroSalesAccountCode` | New field |
| `PurchaseDetails.AccountCode` | `xeroPurchaseAccountCode` | New field |
| `IsSold` | `status` | Map to active/discontinued |
| `ItemID` | `xeroItemId` | Already exists |
| `UpdatedDateUTC` | `xeroLastModified` | New field, for conflict resolution |

---

## Schema Changes

### Product Model Updates

Add the following fields to the `Product` model in `packages/database/prisma/schema.prisma`:

```prisma
model Product {
  // ... existing fields ...

  // Xero sync fields (some already exist)
  xeroItemId              String?    // Already exists - Xero Item GUID
  xeroSyncedAt            DateTime?  // Last successful sync timestamp
  xeroLastModified        DateTime?  // Xero's UpdatedDateUTC (for conflict resolution)
  xeroSalesAccountCode    String?    // Account code from Xero
  xeroPurchaseAccountCode String?    // Purchase account code from Xero
}
```

### XeroSyncJob Extension

Extend the existing `XeroSyncJob` model to support product sync:

```prisma
// In the 'type' enum, add:
// 'sync_product' | 'sync_product_from_xero' | 'sync_all_products'

// In the 'entityType' enum, add:
// 'product'
```

### XeroSyncState Model (New - for tracking last poll)

```prisma
model XeroSyncState {
  id                    String    @id @default(auto()) @map("_id") @db.ObjectId
  syncType              String    @unique  // e.g., "product_poll"
  lastSyncAt            DateTime?
  lastModifiedWatermark DateTime? // Xero's ModifiedAfter value
  itemsProcessed        Int       @default(0)
  errors                Int       @default(0)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

---

## Implementation Phases

### Phase 1: Schema & Infrastructure

1. **Update Prisma schema**
   - Add new fields to Product model
   - Run `prisma generate` and migration

2. **Add environment variables**
   ```env
   XERO_PURCHASE_ACCOUNT_CODE=300    # Default purchase account
   XERO_PRODUCT_SYNC_ENABLED=true    # Feature flag
   ```

3. **Create Xero type definitions**
   - File: `packages/shared/src/types/xero.ts`
   - Define `XeroItem`, `XeroItemSalesDetails`, `XeroItemPurchaseDetails`

### Phase 2: ERP → Xero Sync

1. **Create product sync service**
   - File: `packages/api/src/services/xero-product-sync.ts`

   ```typescript
   // Key functions:
   export async function syncProductToXero(productId: string): Promise<SyncResult>
   export async function syncAllProductsToXero(): Promise<BulkSyncResult>
   export function mapProductToXeroItem(product: Product): XeroItem
   export function mapXeroItemToProduct(item: XeroItem): Partial<Product>
   ```

2. **Xero service additions**
   - File: `packages/api/src/services/xero.ts`

   ```typescript
   // Add to existing service:
   export async function createOrUpdateXeroItem(item: XeroItem): Promise<XeroItem>
   export async function getXeroItemByCode(code: string): Promise<XeroItem | null>
   export async function getXeroItems(modifiedAfter?: Date): Promise<XeroItem[]>
   ```

3. **Queue integration**
   - File: `packages/api/src/services/xero-queue.ts`
   - Add job type: `'sync_product'`
   - Add handler: `processSyncProduct(productId)`

4. **Trigger on product mutations**
   - File: `packages/api/src/routers/product.ts`
   - After create/update, enqueue sync job if Xero connected

### Phase 3: Xero → ERP Sync

1. **Fetch and import functions**
   - File: `packages/api/src/services/xero-product-sync.ts`

   ```typescript
   export async function fetchXeroItems(modifiedAfter?: Date): Promise<XeroItem[]>
   export async function importXeroItem(item: XeroItem): Promise<ImportResult>
   export async function pollXeroForChanges(): Promise<PollResult>
   ```

2. **Agenda cron job**
   - File: `apps/admin-portal/lib/cron/agenda.ts`

   Add to `CRON_JOBS`:
   ```typescript
   {
     name: "xero-product-sync",
     schedule: "0 * * * *", // Every hour at minute 0
     endpoint: "/api/cron/xero-product-sync",
     description: "Sync products from Xero",
     enabled: true,
   }
   ```

3. **Cron API route**
   - File: `apps/admin-portal/app/api/cron/xero-product-sync/route.ts`

   ```typescript
   export async function POST(request: Request) {
     // Verify cron secret
     // Call pollXeroForChanges()
     // Return results
   }
   ```

### Phase 4: Conflict Resolution

1. **Timestamp comparison logic**

   ```typescript
   function resolveConflict(
     erpProduct: Product,
     xeroItem: XeroItem
   ): 'erp_wins' | 'xero_wins' | 'no_conflict' {
     const erpModified = erpProduct.updatedAt;
     const xeroModified = new Date(xeroItem.UpdatedDateUTC);

     if (xeroModified > erpModified) {
       return 'xero_wins'; // Update ERP from Xero
     } else if (erpModified > xeroModified) {
       return 'erp_wins';  // Update Xero from ERP
     }
     return 'no_conflict'; // Timestamps equal, no action
   }
   ```

2. **Conflict logging**
   - Log all conflict resolutions for audit trail
   - Include before/after values

### Phase 5: Admin UI

1. **Product list enhancements**
   - Add "Xero Status" column (synced/pending/error)
   - Add "Sync" action button

2. **Product detail page**
   - Show Xero sync status
   - Show last sync timestamp
   - Show Xero Item ID (with link to Xero)
   - "Sync Now" button

3. **Settings page additions**
   - Purchase account code configuration
   - Enable/disable product sync toggle
   - "Sync All Products" button
   - "Import from Xero" button
   - Last poll timestamp display

4. **Xero sync dashboard**
   - Extend existing sync jobs UI to show product jobs
   - Add product sync stats

---

## API Endpoints (New)

| Method | Endpoint | Purpose | Permission |
|--------|----------|---------|------------|
| POST | `/api/trpc/xero.syncProduct` | Sync single product to Xero | `settings.xero:sync` |
| POST | `/api/trpc/xero.syncAllProducts` | Sync all products to Xero | `settings.xero:sync` |
| POST | `/api/trpc/xero.importProducts` | Import products from Xero | `settings.xero:sync` |
| GET | `/api/trpc/xero.getProductSyncStatus` | Get sync status for all products | `settings.xero:view` |
| GET | `/api/trpc/xero.getProductSyncState` | Get poll state (last sync time) | `settings.xero:view` |
| POST | `/api/cron/xero-product-sync` | Cron endpoint for hourly poll | Cron secret |

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `packages/database/prisma/schema.prisma` | Add Product sync fields, XeroSyncState model |
| `packages/api/src/services/xero.ts` | Add item CRUD functions |
| `packages/api/src/services/xero-queue.ts` | Add product job type and handler |
| `packages/api/src/routers/xero.ts` | Add product sync endpoints |
| `packages/api/src/routers/product.ts` | Trigger sync on create/update |
| `apps/admin-portal/lib/cron/agenda.ts` | Add xero-product-sync job config |
| `apps/admin-portal/.../products/` | Add sync UI components |

---

## New Files to Create

| File | Purpose |
|------|---------|
| `packages/api/src/services/xero-product-sync.ts` | Product sync logic (main service) |
| `packages/shared/src/types/xero.ts` | Xero API type definitions |
| `apps/admin-portal/app/api/cron/xero-product-sync/route.ts` | Cron endpoint |

---

## Environment Variables

### Existing (Already Used)
```env
XERO_CLIENT_ID
XERO_CLIENT_SECRET
XERO_REDIRECT_URI
XERO_SCOPES
XERO_INTEGRATION_ENABLED
XERO_SALES_ACCOUNT_CODE=200
XERO_TOKEN_ENCRYPTION_KEY
```

### New (To Add)
```env
XERO_PURCHASE_ACCOUNT_CODE=300    # Default purchase account
XERO_PRODUCT_SYNC_ENABLED=true    # Feature flag for product sync
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SKU > 30 chars | Validate on product create/update, truncate with warning |
| Name > 50 chars | Truncate with logging |
| Rate limit exceeded | Queue with exponential backoff, respect 60/min limit |
| Duplicate SKUs in Xero | Check before create, handle gracefully |
| Polling misses changes | Store `ModifiedAfter` watermark, handle pagination |
| Large initial sync | Batch with delays, progress tracking, background job |
| Network failures | Retry logic with exponential backoff |

---

## Testing Checklist

### ERP → Xero
- [ ] Create product in ERP → appears in Xero
- [ ] Update product in ERP → updates in Xero
- [ ] SKU matching works for existing Xero items
- [ ] Long SKU (>30 chars) is handled gracefully
- [ ] Long name (>50 chars) is handled gracefully
- [ ] Price conversion (cents to dollars) is correct

### Xero → ERP
- [ ] Create item in Xero → appears in ERP (after poll)
- [ ] Update item in Xero → updates in ERP (after poll)
- [ ] Hourly poll runs successfully
- [ ] ModifiedAfter filter works (incremental sync)
- [ ] Account codes are imported correctly

### Conflict Resolution
- [ ] ERP modified later → Xero updated
- [ ] Xero modified later → ERP updated
- [ ] Same timestamp → no action
- [ ] Conflicts are logged

### Error Handling
- [ ] Rate limiting doesn't cause failures
- [ ] Network errors trigger retry
- [ ] Failed syncs appear in sync jobs UI
- [ ] Manual retry works

---

## Customer-Specific Pricing Note

**Important:** Customer-specific pricing (`CustomerPricing` table) is **NOT synced to Xero** because Xero does not support customer-specific price lists. This is a [known limitation](https://productideas.xero.com/forums/939198-for-small-businesses/suggestions/44960380-product-services-create-custom-tiered-price) that Xero has declined to implement.

**Current behavior (no changes needed):**
- Custom prices are stored only in the ERP's `CustomerPricing` table
- When an invoice is created, `createInvoiceInXero()` uses `item.unitPrice` (which already includes the customer's custom price)
- Xero receives the correct customer-specific price on each invoice line item

---

## References

### Official Xero Documentation
- [Accounting API Items](https://developer.xero.com/documentation/api/accounting/items)
- [Xero API Webhooks Overview](https://developer.xero.com/documentation/guides/webhooks/overview/)
- [Integration Best Practices](https://developer.xero.com/documentation/guides/how-to-guides/integration-best-practices/)

### Feature Requests (Not Available)
- [Inventory Items Webhooks](https://xero.uservoice.com/forums/5528-xero-accounting-api/suggestions/32443856-inventory-items-webhooks) - Not supported
- [Customer Price Lists](https://productideas.xero.com/forums/939198-for-small-businesses/suggestions/44960380-product-services-create-custom-tiered-price) - Not supported

### Related Existing Code
- `packages/api/src/services/xero.ts` - Existing Xero service
- `packages/api/src/services/xero-queue.ts` - Job queue
- `packages/api/src/routers/xero.ts` - Xero API routes
- `apps/admin-portal/lib/cron/agenda.ts` - Cron job definitions
