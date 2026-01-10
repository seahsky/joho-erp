# Xero API Product Sync Analysis (2026)

> **Analysis Date:** 2026-01-10
> **Xero API Version:** Accounting API (OAuth 2.0)
> **Purpose:** Validate the product sync implementation plan against official Xero API documentation

---

## Executive Summary

✅ **Overall Assessment:** The proposed plan in `xero-product-sync-plan.md` is **SOUND AND VALID** with some important clarifications and minor adjustments recommended.

### Key Findings

| Aspect | Plan Status | Validation Result |
|--------|-------------|-------------------|
| Webhooks not available | ✅ Correct | Confirmed - Items webhooks NOT supported |
| Rate limits (60/min, 5000/day) | ✅ Correct | Confirmed by official docs |
| Field length limits | ✅ Correct | Code: 30 chars, Name: 50 chars |
| Untracked inventory approach | ✅ **CRITICAL CORRECT** | Xero **strongly recommends** untracked for external systems |
| Bi-directional sync | ✅ Valid | Supported via polling |
| SKU-based matching | ✅ Valid | Code field supports matching |
| Conflict resolution | ✅ Valid | UpdatedDateUTC available for timestamp comparison |

---

## 1. Items/Inventory API Capabilities

### 1.1 Webhooks Support

**Official Status:** ❌ **NOT AVAILABLE**

Xero webhooks currently support:
- ✅ Invoices
- ✅ Contacts
- ✅ Credit Notes
- ✅ Payments
- ✅ Bank Transactions
- ❌ **Items/Inventory** (NOT supported)

**Source:** [Xero API webhooks — Xero Developer](https://developer.xero.com/documentation/guides/webhooks/overview/)

**Plan Impact:** ✅ Plan correctly proposes hourly polling via Agenda cron jobs.

**Recommendation:** Continue with polling approach. Monitor Xero's changelog for future webhook support.

---

### 1.2 Rate Limiting

**Official Limits (Confirmed):**

| Limit Type | Value | Scope |
|------------|-------|-------|
| Minute Limit | 60 calls | Rolling 60-second window |
| Daily Limit | 5,000 calls | Rolling 24-hour window |
| Concurrent Requests | 5 | Simultaneous connections |
| App-wide Minute Limit | 10,000 calls | All tenancies combined |

**Source:** [OAuth 2.0 API limits — Xero Developer](https://developer.xero.com/documentation/guides/oauth2/limits/)

**Plan Impact:** ✅ Plan acknowledges these limits and proposes queue with exponential backoff.

**Recommendation:** Implement rate limit tracking per the plan. Consider:
- Tracking API calls per minute/day in application memory
- Queueing with delays to stay under 60/min (safe target: 50/min)
- For large initial sync, batch with delays (e.g., 50 items per minute)

---

### 1.3 Field Length Constraints

**Official Limits (Confirmed):**

| Field | Maximum Length | Validation |
|-------|----------------|------------|
| `Code` (SKU) | 30 characters | **Hard limit** - API rejects longer values |
| `Name` | 50 characters | **Hard limit** - API rejects longer values |
| `Description` | ~4000 characters | Soft limit (safe: 500) |

**Sources:**
- [Xero Validation Error: Price List Item Code must not be more than 30 characters long](https://cw.wise-sync.com/support/solutions/articles/36000041350)
- Multiple integration platforms document these limits

**Plan Impact:** ✅ Plan correctly identifies these limits and proposes validation/truncation.

**Current ERP Schema Analysis:**
```typescript
// Product model in schema.prisma
sku: String  // No length constraint → RISK!
name: String // No length constraint → RISK!
```

**Recommendation:**
1. Add database validation in Prisma schema:
   ```prisma
   sku  String @unique // Max 30 for Xero compatibility
   name String         // Max 50 for Xero compatibility
   ```
2. Add validation in product create/update endpoints BEFORE Xero sync
3. Warn users if SKU/name exceeds limits
4. Consider truncating with suffix (e.g., "VERY_LONG_PRODUCT_NAME..." → "VERY_LONG_PRODUCT_NAME_2...")

---

### 1.4 POST/PUT Behavior (Upsert)

**Official Behavior:** ✅ **Supports Upsert on Code Field**

Xero's Items API `POST /Items` endpoint:
- If `Code` doesn't exist → Creates new item
- If `Code` exists → Updates existing item
- Similar to Contacts API behavior with email/name

**Evidence:**
- [Using the Xero API to Create or Update Items](https://endgrate.com/blog/using-the-xero-api-to-create-or-update-items-(with-javascript-examples))
- Community discussions confirm POST acts as upsert

**Plan Impact:** ✅ Plan assumption is correct - POST can be used for both create and update.

**Recommendation:**
- Use single `POST /Items` endpoint for both create and update
- No need for separate create/update logic
- Always include `Code` field for matching

---

## 2. Tracked vs Untracked Inventory

### 2.1 Official Xero Guidance

**Critical Finding:** 🚨 **Xero STRONGLY recommends untracked inventory for external systems**

**Official Guidance:**
> "Xero suggests that third-party inventory integrations should only use non-tracked inventory products."

**Reason:**
- Tracked inventory uses special "Inventory" account type in Xero
- External system tracking + Xero tracking = **double entries** and conflicts
- Untracked inventory connects to "Current Assets" account instead

**Sources:**
- [Choose an inventory integration — Xero Developer](https://developer.xero.com/documentation/api-guides/inventory-integration-options)
- [Connecting inFlow to Xero](https://www.inflowinventory.com/support/cloud/connecting-inflow-to-xero/)

### 2.2 Plan Assessment

✅ **Plan is CORRECT:**
```
| Inventory Type | Untracked (ERP manages stock) |
```

The plan correctly sets `IsTrackedAsInventory: false` for all items.

### 2.3 How Inventory Works with Untracked Items

**ERP → Xero Flow (Correct Approach):**

1. **Product Sync:**
   - Create item in Xero with `IsTrackedAsInventory: false`
   - Set `IsSold: true`, `IsPurchased: true`
   - No quantity tracking in Xero

2. **Invoice Creation (Existing):**
   - When order is delivered, create invoice in Xero
   - Invoice line items reference SKU via `ItemCode`
   - Invoice line item has `Quantity` and `UnitAmount`
   - This reduces ERP inventory (already implemented)
   - Xero records sale but doesn't track stock

3. **Benefits:**
   - Single source of truth for inventory: **ERP system**
   - Xero only knows about sales (via invoices)
   - No sync conflicts on stock levels
   - Accurate financial reporting in Xero

**Recommendation:** ✅ Keep `IsTrackedAsInventory: false` as planned.

---

## 3. Inventory Quantity Synchronization

### 3.1 The QuantityOnHand Problem

**Critical Limitation:** Even if you wanted to sync inventory quantities, there's a major issue:

> "When stock in-hand figures change (because an invoice was sent), the modified date doesn't change and items aren't returned in modified-since queries."

**Source:** [Integrating with Xero tracked inventory — Xero Developer](https://developer.xero.com/documentation/guides/how-to-guides/tracked-inventory-in-xero/)

**Impact:**
- Cannot reliably poll for inventory changes from Xero
- `ModifiedAfter` filter doesn't catch stock-level-only changes
- Would require fetching ALL items every poll (inefficient)

### 3.2 Recommended Approach

✅ **Use Untracked Items (Plan is Correct):**

1. **Don't sync QuantityOnHand** to/from Xero
2. Xero items have NO quantity information
3. ERP is the single source of truth for inventory
4. When creating invoices, send quantity on each line item

**This is exactly what the existing invoice sync does:**
```typescript
// From xero.ts (line 1053-1060)
const lineItems: XeroLineItem[] = order.items.map((item) => ({
  Description: `${item.productName} (${item.sku})`,
  Quantity: item.quantity,           // Quantity on invoice line
  UnitAmount: item.unitPrice / 100,  // Price per unit
  AccountCode: getXeroSalesAccountCode(),
  TaxType: 'OUTPUT',
  ItemCode: item.sku,                // Links to Xero Item by Code
}));
```

**Result:**
- Xero knows what was sold (quantity on invoice)
- Xero doesn't track inventory levels
- Financial reports are accurate
- No inventory conflicts

---

## 4. Data Mapping Validation

### 4.1 ERP → Xero Mapping

| ERP Field | Xero Field | Validation | Notes |
|-----------|------------|------------|-------|
| `sku` | `Code` | ✅ Max 30 chars | Unique identifier |
| `name` | `Name` | ✅ Max 50 chars | Display name |
| `description` | `Description` | ✅ OK | Sales description |
| `description` | `PurchaseDescription` | ✅ OK | Can be same or separate |
| `basePrice / 100` | `SalesDetails.UnitPrice` | ✅ OK | Cents → Dollars |
| `unitCost / 100` | `PurchaseDetails.UnitPrice` | ✅ OK | **NEW FIELD** in ERP |
| env var | `SalesDetails.AccountCode` | ✅ OK | Default "200" |
| env var | `PurchaseDetails.AccountCode` | ✅ OK | **NEW ENV VAR** needed |
| `status === 'active'` | `IsSold` | ✅ OK | Boolean flag |
| `status === 'active'` | `IsPurchased` | ✅ OK | Boolean flag |
| (not synced) | `IsTrackedAsInventory` | ✅ Always `false` | **Critical** |

**Plan Assessment:** ✅ Mapping is correct and complete.

**Recommendations:**
1. Add `unitCost` field to Product model (currently exists as `unitCost Int?`)
2. Add `XERO_PURCHASE_ACCOUNT_CODE` environment variable
3. Consider separate purchase description if needed (or use same as sales)

### 4.2 Xero → ERP Mapping

| Xero Field | ERP Field | Status | Notes |
|------------|-----------|--------|-------|
| `Code` | `sku` | ✅ Existing | Primary key for matching |
| `Name` | `name` | ✅ Existing | |
| `Description` | `description` | ✅ Existing | |
| `SalesDetails.UnitPrice * 100` | `basePrice` | ✅ Existing | Dollars → Cents |
| `SalesDetails.AccountCode` | `xeroSalesAccountCode` | ⚠️ **NEW FIELD NEEDED** | |
| `PurchaseDetails.AccountCode` | `xeroPurchaseAccountCode` | ⚠️ **NEW FIELD NEEDED** | |
| `IsSold` | `status` | ✅ OK | Map to active/discontinued |
| `ItemID` | `xeroItemId` | ✅ Existing | Already in schema |
| `UpdatedDateUTC` | `xeroLastModified` | ⚠️ **NEW FIELD NEEDED** | For conflict resolution |

**Plan Assessment:** ✅ Mapping is correct.

**Schema Changes Needed:**
```prisma
model Product {
  // ... existing fields ...
  xeroItemId              String?    // ✅ Already exists
  xeroSyncedAt            DateTime?  // ⚠️ NEW - Last successful sync
  xeroLastModified        DateTime?  // ⚠️ NEW - Xero's UpdatedDateUTC
  xeroSalesAccountCode    String?    // ⚠️ NEW - Account code from Xero
  xeroPurchaseAccountCode String?    // ⚠️ NEW - Purchase account from Xero
}
```

---

## 5. Conflict Resolution Strategy

### 5.1 Timestamp Comparison

**Plan Approach:** "Last modified wins"

```typescript
function resolveConflict(
  erpProduct: Product,
  xeroItem: XeroItem
): 'erp_wins' | 'xero_wins' | 'no_conflict' {
  const erpModified = erpProduct.updatedAt;
  const xeroModified = new Date(xeroItem.UpdatedDateUTC);

  if (xeroModified > erpModified) return 'xero_wins';
  if (erpModified > xeroModified) return 'erp_wins';
  return 'no_conflict';
}
```

**Validation:** ✅ This approach is valid and commonly used.

### 5.2 Considerations

**Potential Issues:**
1. **Clock Skew:** Different servers may have slightly different times
2. **Same-Second Updates:** Unlikely but possible
3. **Field-Level Conflicts:** What if only price changed in Xero but description changed in ERP?

**Recommendations:**

**Option A: Simple (Recommended for MVP):**
- Use timestamp comparison as planned
- Always sync entire product (all fields)
- Log all conflicts for manual review
- Add tolerance window (e.g., if times within 5 seconds, ERP wins)

**Option B: Advanced (Future Enhancement):**
- Track field-level modification times
- Merge changes field-by-field
- More complex but prevents data loss

**Plan Assessment:** ✅ Option A (plan's approach) is appropriate for initial implementation.

---

## 6. Polling Strategy

### 6.1 Plan Approach

**Proposed:**
- Hourly polling via Agenda cron job
- Use `ModifiedAfter` filter for incremental sync
- Store watermark in `XeroSyncState` model

### 6.2 Xero API Support

**GET /Items Endpoint:**
```
GET /Items?ModifiedAfter=2026-01-10T00:00:00
```

**Confirmed Capabilities:**
- ✅ Supports `ModifiedAfter` query parameter
- ✅ Returns items updated since specified datetime
- ❌ **Does NOT support pagination** (returns all matching items)
- ⚠️ `UpdatedDateUTC` changes on item edits, but NOT on stock quantity changes (not relevant since we're using untracked)

**Source:** [Accounting API Items — Xero Developer](https://developer.xero.com/documentation/api/accounting/items)

### 6.3 Polling Implementation

**Recommended Algorithm:**

```typescript
async function pollXeroForChanges(): Promise<PollResult> {
  // 1. Get last poll timestamp from XeroSyncState
  const lastPoll = await getLastPollTimestamp('product_poll');
  const modifiedAfter = lastPoll || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24h ago

  // 2. Fetch modified items from Xero
  const xeroItems = await xeroApiRequest<XeroItemsResponse>(
    `/Items?ModifiedAfter=${modifiedAfter.toISOString()}`
  );

  // 3. Process each item
  for (const item of xeroItems.Items) {
    await importXeroItem(item);
  }

  // 4. Update watermark
  await updateLastPollTimestamp('product_poll', new Date());

  return { itemsProcessed: xeroItems.Items.length };
}
```

**Plan Assessment:** ✅ Plan's approach is correct.

**Recommendations:**
1. Start with hourly polling (as planned)
2. Monitor API call usage (shouldn't be high with `ModifiedAfter`)
3. Can increase frequency to every 30 minutes if needed
4. For initial sync, batch process to respect rate limits

---

## 7. Schema Changes Required

### 7.1 Product Model Extensions

**Required Fields (from plan):**

```prisma
model Product {
  // ... existing fields ...

  // Xero sync fields
  xeroItemId              String?    @db.String  // ✅ Already exists!
  xeroSyncedAt            DateTime?               // ⚠️ NEW - Last successful sync
  xeroLastModified        DateTime?               // ⚠️ NEW - Xero's UpdatedDateUTC
  xeroSalesAccountCode    String?                 // ⚠️ NEW - Sales account from Xero
  xeroPurchaseAccountCode String?                 // ⚠️ NEW - Purchase account from Xero

  // Indexes
  @@index([xeroItemId])
  @@index([xeroSyncedAt])
}
```

### 7.2 XeroSyncJob Type Extensions

**Add to enum:**

```prisma
enum XeroSyncJobType {
  sync_contact
  create_invoice
  create_credit_note
  sync_product           // ⚠️ NEW - ERP → Xero single product
  sync_product_from_xero // ⚠️ NEW - Xero → ERP single product
  sync_all_products      // ⚠️ NEW - Bulk sync all products
}
```

**Add entity type:**

```prisma
enum XeroSyncJobEntityType {
  customer
  order
  product  // ⚠️ NEW
}
```

Note: Current schema doesn't have `XeroSyncJobEntityType` enum - it uses string. May need to create enum or keep as string.

### 7.3 XeroSyncState Model (New)

**Purpose:** Track polling state

```prisma
model XeroSyncState {
  id                    String    @id @default(auto()) @map("_id") @db.ObjectId
  syncType              String    @unique  // "product_poll"
  lastSyncAt            DateTime?
  lastModifiedWatermark DateTime? // Xero's ModifiedAfter value
  itemsProcessed        Int       @default(0)
  errors                Int       @default(0)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("xero_sync_states")
}
```

**Plan Assessment:** ✅ This model is well-designed and necessary.

---

## 8. Environment Variables

### 8.1 Existing Variables (OK)

```env
XERO_CLIENT_ID=<client-id>
XERO_CLIENT_SECRET=<secret>
XERO_REDIRECT_URI=<callback-url>
XERO_SCOPES=openid profile email accounting.transactions accounting.contacts offline_access
XERO_INTEGRATION_ENABLED=true
XERO_SALES_ACCOUNT_CODE=200
XERO_TOKEN_ENCRYPTION_KEY=<key>
```

### 8.2 New Variables Required

```env
# ⚠️ NEW - Purchase account code for inventory items
XERO_PURCHASE_ACCOUNT_CODE=300

# ⚠️ NEW - Feature flag for product sync
XERO_PRODUCT_SYNC_ENABLED=true
```

**Plan Assessment:** ✅ These are necessary and well-defined.

---

## 9. API Endpoints (New)

### 9.1 Proposed tRPC Endpoints

| Endpoint | Method | Purpose | Permission |
|----------|--------|---------|------------|
| `xero.syncProduct` | POST | Sync single product to Xero | `settings.xero:sync` |
| `xero.syncAllProducts` | POST | Sync all products to Xero | `settings.xero:sync` |
| `xero.importProducts` | POST | Import products from Xero | `settings.xero:sync` |
| `xero.getProductSyncStatus` | GET | Get sync status for all products | `settings.xero:view` |
| `xero.getProductSyncState` | GET | Get poll state (last sync time) | `settings.xero:view` |

### 9.2 Cron Endpoint

```
POST /api/cron/xero-product-sync
Authorization: Bearer <CRON_SECRET>
```

**Plan Assessment:** ✅ Endpoints are well-designed and follow existing patterns.

---

## 10. Testing Considerations

### 10.1 Critical Test Cases

**ERP → Xero:**
- [ ] Create product with short SKU (<30 chars) → Syncs successfully
- [ ] Create product with 30-char SKU → Syncs successfully
- [ ] Create product with 31-char SKU → **Should fail validation or truncate**
- [ ] Create product with 50-char name → Syncs successfully
- [ ] Create product with 51-char name → **Should fail validation or truncate**
- [ ] Update product price → Updates in Xero
- [ ] Update product with existing `Code` → Updates (doesn't duplicate)

**Xero → ERP:**
- [ ] Create item in Xero → Appears in ERP after poll
- [ ] Update item in Xero → Updates in ERP after poll
- [ ] Hourly poll runs successfully
- [ ] `ModifiedAfter` filter works correctly
- [ ] Account codes imported correctly
- [ ] Items with `IsTrackedAsInventory: false` imported correctly

**Conflict Resolution:**
- [ ] Update product in ERP, then in Xero → Xero wins (assuming Xero modified later)
- [ ] Update product in Xero, then in ERP → ERP wins (assuming ERP modified later)
- [ ] Simultaneous updates → Last timestamp wins
- [ ] All conflicts logged with before/after values

**Error Handling:**
- [ ] Rate limit (60/min) respected
- [ ] Network errors trigger retry with exponential backoff
- [ ] Failed syncs appear in sync jobs UI with clear error messages
- [ ] Manual retry works for failed jobs

**Edge Cases:**
- [ ] Product with no description → Handles gracefully
- [ ] Product with special characters in SKU → Syncs correctly
- [ ] Product with zero price → Syncs correctly
- [ ] Deleted product in Xero → Updates status in ERP (or ignores)

### 10.2 Recommended Testing Approach

1. **Sandbox Environment:**
   - Use Xero Demo Company for testing
   - Create test products with various edge cases
   - Test rate limiting with delays

2. **Unit Tests:**
   - Test mapping functions (`mapProductToXeroItem`, `mapXeroItemToProduct`)
   - Test conflict resolution logic
   - Test validation (SKU/name length)

3. **Integration Tests:**
   - Test full sync flow with real Xero API (sandbox)
   - Test polling with `ModifiedAfter`
   - Test error scenarios

4. **Manual Testing:**
   - Create products in admin portal → Verify in Xero
   - Create items in Xero → Verify in ERP (after poll)
   - Update prices in both systems → Verify conflict resolution

---

## 11. Risk Assessment & Mitigation

### 11.1 Identified Risks

| Risk | Severity | Likelihood | Mitigation (from plan) | Additional Recommendations |
|------|----------|------------|------------------------|----------------------------|
| SKU > 30 chars | 🔴 High | Medium | Validate on create/update, truncate with warning | ✅ Add database constraint, reject at form level |
| Name > 50 chars | 🟡 Medium | Low | Truncate with logging | ✅ Add database constraint, warn users |
| Rate limit exceeded | 🟡 Medium | Medium | Queue with exponential backoff, respect 60/min | ✅ Track API calls in memory, implement circuit breaker |
| Duplicate SKUs in Xero | 🟡 Medium | Low | Check before create, handle gracefully | ✅ Use POST upsert, don't check separately |
| Polling misses changes | 🟢 Low | Low | Store `ModifiedAfter` watermark, handle pagination | ✅ No pagination needed (Items API doesn't support it) |
| Large initial sync | 🟡 Medium | High | Batch with delays, progress tracking | ✅ Implement "sync all" with 50 items/min limit, show progress bar |
| Network failures | 🟡 Medium | Medium | Retry logic with exponential backoff | ✅ Use existing queue system's retry mechanism |
| Clock skew (conflict resolution) | 🟢 Low | Low | Not explicitly addressed | ⚠️ Add tolerance window (5 seconds) |
| Lost updates during conflict | 🟡 Medium | Low | Not explicitly addressed | ⚠️ Log all conflicts, notify admins |

### 11.2 Recommended Additional Mitigations

1. **SKU Length Enforcement:**
   ```typescript
   // In product create/update validation
   if (sku.length > 30) {
     throw new Error('SKU must be 30 characters or less for Xero compatibility');
   }
   ```

2. **Rate Limit Tracking:**
   ```typescript
   class XeroRateLimiter {
     private callsThisMinute = 0;
     private resetTime = Date.now() + 60000;

     async checkAndWait() {
       if (Date.now() > this.resetTime) {
         this.callsThisMinute = 0;
         this.resetTime = Date.now() + 60000;
       }
       if (this.callsThisMinute >= 50) { // Safe limit
         await sleep(this.resetTime - Date.now());
       }
       this.callsThisMinute++;
     }
   }
   ```

3. **Conflict Resolution Enhancement:**
   ```typescript
   const TOLERANCE_SECONDS = 5;
   const diff = Math.abs(erpModified.getTime() - xeroModified.getTime()) / 1000;
   if (diff < TOLERANCE_SECONDS) {
     return 'erp_wins'; // ERP is source of truth in ties
   }
   ```

---

## 12. Comparison with Existing Integration

### 12.1 Existing Sync Capabilities

**Current Implementation (Contacts & Invoices):**

✅ **Strengths:**
- Clean separation between sync service and queue
- Duplicate detection before creating contacts/invoices
- Proper error handling and retry mechanism
- Audit logging for all sync operations
- Stores Xero IDs in local records for future reference

✅ **Patterns to Reuse:**
- Queue-based processing (`xero-queue.ts`)
- tRPC router structure (`xero.ts` router)
- Duplicate detection via API queries
- Error handling and job status tracking

### 12.2 Applying Existing Patterns to Product Sync

**Recommended Structure:**

```
packages/api/src/services/
  ├── xero.ts                  // Existing auth + API methods
  ├── xero-product-sync.ts     // ⚠️ NEW - Product sync logic
  ├── xero-queue.ts            // UPDATE - Add product job types

packages/api/src/routers/
  ├── xero.ts                  // UPDATE - Add product endpoints

apps/admin-portal/app/api/cron/
  ├── xero-product-sync/
      └── route.ts             // ⚠️ NEW - Cron endpoint
```

**Plan Assessment:** ✅ Plan follows existing architecture patterns correctly.

---

## 13. Customer-Specific Pricing (Important Note)

**Plan Correctly States:**

> Customer-specific pricing (`CustomerPricing` table) is **NOT synced to Xero** because Xero does not support customer-specific price lists.

**Validation:** ✅ **CORRECT**

Xero does not support:
- Customer-specific pricing tiers
- Volume discounts per customer
- Contract pricing

**Source:** [Customer Price Lists Feature Request](https://productideas.xero.com/forums/939198-for-small-businesses/suggestions/44960380-product-services-create-custom-tiered-price) - Declined by Xero

**Current Workaround (Already Implemented):**
```typescript
// In createInvoiceInXero (line 1056)
UnitAmount: item.unitPrice / 100, // Already includes customer-specific price
```

The invoice line item `unitPrice` already reflects the customer's custom price from the ERP. Xero receives the correct price on each invoice, even though the Item record in Xero only has the base price.

**Plan Assessment:** ✅ Correctly understood and documented. No changes needed.

---

## 14. Final Recommendations

### 14.1 Proceed with Plan ✅

The plan in `xero-product-sync-plan.md` is **well-researched, technically sound, and ready for implementation** with the following adjustments:

### 14.2 Critical Changes Required

1. **Add Schema Validations:**
   ```prisma
   model Product {
     sku  String @unique // Document: Max 30 chars for Xero
     name String         // Document: Max 50 chars for Xero
     // Add fields as planned...
   }
   ```

2. **Add Application-Level Validation:**
   - Validate SKU ≤ 30 chars in product create/update endpoints
   - Validate name ≤ 50 chars in product create/update endpoints
   - Show validation errors to users before they save

3. **Implement Rate Limiting:**
   - Track API calls per minute
   - Safe target: 50 calls/minute (leaves buffer)
   - Add delays between batched operations

4. **Add Conflict Resolution Tolerance:**
   - If timestamps within 5 seconds → ERP wins (source of truth)
   - Log all conflict resolutions
   - Consider admin notification for conflicts

### 14.3 Implementation Phases (As Planned)

✅ **Phase 1:** Schema & Infrastructure (1-2 days)
✅ **Phase 2:** ERP → Xero Sync (2-3 days)
✅ **Phase 3:** Xero → ERP Sync (2-3 days)
✅ **Phase 4:** Conflict Resolution (1-2 days)
✅ **Phase 5:** Admin UI (2-3 days)

**Total Estimated Effort:** 8-13 days

### 14.4 Pre-Implementation Checklist

- [ ] Review and approve schema changes
- [ ] Set up Xero sandbox/demo company for testing
- [ ] Add environment variables (`XERO_PURCHASE_ACCOUNT_CODE`, `XERO_PRODUCT_SYNC_ENABLED`)
- [ ] Create feature flag for gradual rollout
- [ ] Plan data migration (sync existing products to Xero)
- [ ] Prepare user documentation
- [ ] Set up monitoring/alerting for sync failures

---

## 15. References & Sources

### Official Xero Documentation
- [Accounting API Items](https://developer.xero.com/documentation/api/accounting/items)
- [Integrating with Xero tracked inventory](https://developer.xero.com/documentation/guides/how-to-guides/tracked-inventory-in-xero/)
- [Xero API webhooks overview](https://developer.xero.com/documentation/guides/webhooks/overview/)
- [Choose an inventory integration](https://developer.xero.com/documentation/api-guides/inventory-integration-options)
- [OAuth 2.0 API limits](https://developer.xero.com/documentation/guides/oauth2/limits/)
- [Integration best practices](https://developer.xero.com/documentation/guides/how-to-guides/integration-best-practices/)

### Third-Party Resources
- [Xero API Rate Limits & How to Prevent Hitting Them - Coefficient](https://coefficient.io/xero-api/xero-api-rate-limits)
- [Xero Inventory Management: Complete Guide - Finale Inventory](https://www.finaleinventory.com/accounting-and-inventory-software/xero-inventory-management)
- [Using the Xero API to Create or Update Items - Endgrate](https://endgrate.com/blog/using-the-xero-api-to-create-or-update-items-(with-javascript-examples))

### Community & Support Forums
- [Support for Inventory Adjustments – Xero Developer Ideas](https://xero.uservoice.com/forums/5528-accounting-api/suggestions/10401180-support-for-inventory-adjustments)
- [Inventory Items Webhooks Feature Request](https://xero.uservoice.com/forums/5528-xero-accounting-api/suggestions/32443856-inventory-items-webhooks)
- [Customer Price Lists Feature Request](https://productideas.xero.com/forums/939198-for-small-businesses/suggestions/44960380-product-services-create-custom-tiered-price)

---

## Appendix A: Xero Item API Schema

**Complete Item Object (for reference):**

```typescript
interface XeroItem {
  ItemID?: string;                    // Xero's GUID (read-only on create)
  Code: string;                       // SKU - Max 30 chars - UNIQUE IDENTIFIER
  Name: string;                       // Display name - Max 50 chars
  Description?: string;               // Sales description
  PurchaseDescription?: string;       // Purchase description (can differ from sales)

  // Tracking
  IsTrackedAsInventory: boolean;      // ⚠️ MUST be false for ERP integration
  IsSold: boolean;                    // Can be sold
  IsPurchased: boolean;               // Can be purchased

  // Pricing
  SalesDetails?: {
    UnitPrice: number;                // In dollars (e.g., 25.50)
    AccountCode: string;              // Sales account (e.g., "200")
    TaxType: string;                  // e.g., "OUTPUT" for GST
  };
  PurchaseDetails?: {
    UnitPrice: number;                // In dollars (e.g., 15.00)
    AccountCode: string;              // Purchase account (e.g., "300")
    TaxType: string;                  // e.g., "INPUT" for GST
  };

  // Inventory (only if IsTrackedAsInventory = true)
  QuantityOnHand?: number;            // Not used for untracked items
  TotalCostPool?: number;             // Not used for untracked items

  // Metadata
  UpdatedDateUTC: string;             // ISO 8601 timestamp - for conflict resolution
  ValidationErrors?: Array<{          // Errors on create/update
    Message: string;
  }>;
}
```

**Response Wrapper:**
```typescript
interface XeroItemsResponse {
  Items: XeroItem[];
}
```

---

## Appendix B: Suggested Migration Script

For initial data sync after implementation:

```typescript
// scripts/sync-existing-products-to-xero.ts

async function syncExistingProducts() {
  const products = await prisma.product.findMany({
    where: {
      status: 'active',
      xeroItemId: null, // Not yet synced
    },
  });

  console.log(`Found ${products.length} products to sync`);

  const BATCH_SIZE = 50; // 50 per minute to respect rate limits

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    for (const product of batch) {
      try {
        await enqueueXeroJob('sync_product', 'product', product.id);
        console.log(`Queued: ${product.sku}`);
      } catch (error) {
        console.error(`Failed to queue ${product.sku}:`, error);
      }
    }

    // Wait 1 minute between batches
    if (i + BATCH_SIZE < products.length) {
      console.log('Waiting 60 seconds for rate limit...');
      await sleep(60000);
    }
  }

  console.log('Migration complete!');
}
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-10 | Claude | Initial comprehensive analysis |
