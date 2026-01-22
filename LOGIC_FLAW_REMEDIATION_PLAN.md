# Logic Flaw Remediation Plan

> Generated: 2026-01-22
> Total Issues Identified: 73
> Estimated Effort: 4-6 development sprints

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Critical Issues (Week 1-2)](#phase-1-critical-issues)
3. [Phase 2: High Severity Issues (Week 3-4)](#phase-2-high-severity-issues)
4. [Phase 3: Medium Severity Issues (Week 5-6)](#phase-3-medium-severity-issues)
5. [Phase 4: Low Severity & Technical Debt (Week 7+)](#phase-4-low-severity--technical-debt)
6. [Cross-Cutting Concerns](#cross-cutting-concerns)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Procedures](#rollback-procedures)

---

## Executive Summary

This plan addresses 73 logic flaws discovered across both portals. Issues are prioritized by:
- **Business impact** - Financial loss, data corruption, customer-facing bugs
- **Security risk** - Authorization bypasses, data exposure
- **Frequency** - How often the issue might be triggered
- **Fix complexity** - Effort required vs risk of regression

### Issue Distribution

| Severity | Count | Target Phase |
|----------|-------|--------------|
| 🔴 CRITICAL | 15 | Phase 1 |
| 🟠 HIGH | 24 | Phase 2 |
| 🟡 MEDIUM | 27 | Phase 3 |
| 🔵 LOW | 7 | Phase 4 |

---

## Phase 1: Critical Issues

**Timeline:** Week 1-2
**Goal:** Eliminate data corruption and authorization bypass risks

### Sprint 1.1: Stock & Inventory Integrity

#### Issue #1: Stock Restoration Without Check
**File:** `packages/api/src/routers/order.ts:2575-2612`
**Priority:** P0 - Immediate

**Current Behavior:**
- `cancelMyOrder` unconditionally restores stock without checking `stockConsumed` flag

**Required Changes:**
1. Add `stockConsumed` check before restoration:
   ```
   if (order.stockConsumed === true) {
     // Only then restore stock
   }
   ```
2. Add atomic guard similar to `updateStatus` procedure
3. Create inventory batch entries (currently missing)

**Testing Requirements:**
- [ ] Unit test: Cancel order before packing (stock should NOT increase)
- [ ] Unit test: Cancel order after packing started (stock SHOULD increase)
- [ ] Integration test: Concurrent cancellation requests
- [ ] Regression test: Existing cancellation flows still work

**Rollback Plan:** Feature flag `ENABLE_STOCK_CONSUMED_CHECK`

---

#### Issue #3: Missing Inventory Batch in Stock Restoration
**File:** `packages/api/src/routers/order.ts:2590-2603`
**Priority:** P0 - Immediate

**Current Behavior:**
- `cancelMyOrder` creates `inventoryTransaction` but NOT `inventoryBatch`

**Required Changes:**
1. Add `inventoryBatch.create()` call matching `updateStatus` pattern
2. Include proper batch metadata (order number, restoration reason)

**Testing Requirements:**
- [ ] Unit test: Verify batch created on cancellation
- [ ] Integration test: FIFO order maintained after restoration

**Dependencies:** Complete after Issue #1

---

#### Issue #16: Inconsistent Stock Restoration Logic
**File:** `packages/api/src/routers/order.ts:2575-2612` vs `1152-1352`
**Priority:** P1

**Current Behavior:**
- Two different code paths (~35 lines vs ~150 lines) for stock restoration
- Subproduct handling missing in `cancelMyOrder`

**Required Changes:**
1. Extract stock restoration into shared service:
   ```
   packages/api/src/services/stock-restoration.ts
   ```
2. Implement unified logic covering:
   - `stockConsumed` check
   - Subproduct-to-parent relationships
   - Inventory batch creation
   - Atomic guards
3. Refactor both `cancelMyOrder` and `updateStatus` to use shared service

**Testing Requirements:**
- [ ] Unit tests for shared service
- [ ] Integration tests for both calling procedures
- [ ] Edge case: Subproduct order cancellation

---

### Sprint 1.2: Credit & Authorization

#### Issue #2: Credit Limit Bypass in Reorder
**File:** `packages/api/src/routers/order.ts:1638-1645`
**Priority:** P0 - Immediate

**Current Behavior:**
- Checks against total `creditLimit` instead of available credit
- Customers with pending orders can exceed limits

**Required Changes:**
1. Replace credit check:
   ```typescript
   // Before (wrong)
   if (totals.totalAmount > creditLimit) { ... }

   // After (correct)
   const availableCredit = await calculateAvailableCredit(customer.id, creditLimit);
   if (totals.totalAmount > availableCredit) { ... }
   ```

**Testing Requirements:**
- [ ] Unit test: Reorder with existing pending orders
- [ ] Unit test: Reorder at exactly available credit limit
- [ ] Integration test: Multiple concurrent reorders

---

#### Issue #13: Pricing Router Missing Authorization
**File:** `packages/api/src/routers/pricing.ts:237-265`
**Priority:** P0 - Security

**Current Behavior:**
- Any authenticated user can query any customer's pricing

**Required Changes:**
1. Add customer ownership check:
   ```typescript
   if (ctx.userRole === 'customer') {
     const myCustomer = await getCustomerByClerkId(ctx.userId);
     if (input.customerId !== myCustomer.id) {
       throw new TRPCError({ code: 'FORBIDDEN' });
     }
   }
   ```
2. Apply same pattern to `getCustomerPrices` (Issue #32)

**Testing Requirements:**
- [ ] Unit test: Customer cannot access other customer's pricing
- [ ] Unit test: Admin/sales CAN access any customer's pricing
- [ ] Security audit: Review all pricing endpoints

---

#### Issue #4: Missing Email Uniqueness Check
**File:** `packages/api/src/routers/customer.ts:160-162`
**Priority:** P1

**Current Behavior:**
- Registration only checks `clerkUserId` uniqueness

**Required Changes:**
1. Add email uniqueness validation in registration
2. Add database unique constraint on email field
3. Handle edge case: Same person, different Clerk accounts

**Testing Requirements:**
- [ ] Unit test: Duplicate email rejected
- [ ] Migration test: Existing duplicates handled

**Migration Required:** Yes - add unique constraint

---

### Sprint 1.3: Race Conditions & Concurrency

#### Issue #7: Packing Session Hijacking
**File:** `packages/api/src/routers/packing.ts:164-167`
**Priority:** P0

**Current Behavior:**
- Starting a session cancels ALL other active sessions for that delivery date
- Multiple packers overwrite each other's work

**Required Changes:**
1. Implement session locking per order, not per date
2. Add explicit "take over" confirmation flow
3. Preserve previous session's progress

**Design Decision Required:**
- Option A: Lock at order level (allows parallel packing)
- Option B: Lock at date+area level (single packer per area)
- **Recommendation:** Option A with area assignment for organization

**Testing Requirements:**
- [ ] Integration test: Two packers, same date, different orders
- [ ] Integration test: Session takeover flow
- [ ] Load test: 10 concurrent packers

---

#### Issue #8: Packing Timeout Not Enforced
**File:** `packages/api/src/routers/packing.ts`
**Priority:** P0

**Current Behavior:**
- 30-minute timeout defined but never executed
- Orders locked indefinitely

**Required Changes:**
1. Implement cron job or scheduled task:
   ```
   /apps/admin-portal/app/api/cron/packing-timeout/route.ts
   ```
2. Call `processTimedOutSessions()` every 5 minutes
3. Add Vercel cron configuration

**Testing Requirements:**
- [ ] Unit test: Sessions older than 30 min are processed
- [ ] Integration test: Cron endpoint authorization
- [ ] Monitoring: Alert on high timeout frequency

---

#### Issue #5: Race Condition on Area Assignment
**File:** `packages/api/src/routers/delivery.ts:1496-1551`
**Priority:** P1

**Current Behavior:**
- `setDriverAreas` has no transaction protection

**Required Changes:**
1. Wrap in `prisma.$transaction()`
2. Add optimistic locking or database-level constraint
3. Return clear error on conflict

**Testing Requirements:**
- [ ] Concurrent assignment test
- [ ] Database constraint verification

---

#### Issue #6: Non-Transactional Bulk Assignment
**File:** `packages/api/src/routers/delivery.ts:1638-1778`
**Priority:** P1

**Current Behavior:**
- `autoAssignDriversByArea` loops individual updates
- Crash midway leaves inconsistent state

**Required Changes:**
1. Wrap entire operation in transaction
2. Use `prisma.order.updateMany()` where possible
3. Add idempotency key to prevent duplicate runs

**Testing Requirements:**
- [ ] Simulate failure midway
- [ ] Verify rollback on error
- [ ] Idempotency test: Run twice, same result

---

### Sprint 1.4: Customer Portal Critical

#### Issue #12: Timezone Off-by-One Error
**File:** `apps/customer-portal/app/[locale]/checkout/components/order-summary.tsx:59-60,67-68,72`
**Priority:** P0 - Customer-facing

**Current Behavior:**
- `.toISOString().split('T')[0]` converts to UTC, causing one-day shift

**Required Changes:**
1. Install timezone-aware library (date-fns-tz or dayjs with timezone)
2. Replace all date formatting:
   ```typescript
   // Before (wrong)
   date.toISOString().split('T')[0]

   // After (correct)
   formatInTimeZone(date, 'Australia/Sydney', 'yyyy-MM-dd')
   ```
3. Apply same fix to all date displays (Issue #60)

**Testing Requirements:**
- [ ] Unit test: Dates near midnight Sydney time
- [ ] E2E test: Customer in different timezone
- [ ] Visual test: Date picker shows correct dates

---

#### Issue #29: Credit Calculation Inconsistency
**Files:** `packages/api/src/routers/cart.ts:240-245` vs `order.ts:154-159`
**Priority:** P1

**Current Behavior:**
- Cart excludes `awaiting_approval` orders
- Order creation includes them
- Customer sees "available" credit but order fails

**Required Changes:**
1. Extract credit calculation to shared function:
   ```
   packages/api/src/services/credit-calculation.ts
   ```
2. Ensure both cart and order use same logic
3. Include `awaiting_approval` in both

**Testing Requirements:**
- [ ] Unit test: Cart and order show same available credit
- [ ] Integration test: Backorder pending, new order attempt

---

#### Issue #11: Cached Cart Prices Become Stale
**File:** `packages/api/src/routers/cart.ts:390-391,506`
**Priority:** P1

**Current Behavior:**
- Cart stores pricing at add-to-cart time
- Price changes don't propagate

**Required Changes:**
1. Option A: Re-calculate prices on cart fetch (recommended)
2. Option B: Invalidate cart items when price changes
3. Show price change warning to customer if different from added price

**Design Decision Required:**
- Should customers honor original price or current price?
- **Recommendation:** Current price with notification

**Testing Requirements:**
- [ ] Integration test: Price change after add to cart
- [ ] E2E test: Customer sees price change notification

---

## Phase 2: High Severity Issues

**Timeline:** Week 3-4
**Goal:** Address security vulnerabilities and data integrity issues

### Sprint 2.1: Validation & Input Sanitization

#### Issue #18: Floating-Point Quantities Allowed
**Files:** `packages/api/src/routers/order.ts:179,581`
**Priority:** P2

**Required Changes:**
1. Add `.int()` to all quantity validations:
   ```typescript
   quantity: z.number().int().min(1).max(10000)
   ```
2. Apply to: order.ts, cart.ts, packing.ts
3. Add upper bounds (Issue #26, #31)

**Files to Update:**
- `packages/api/src/routers/order.ts:179,581`
- `packages/api/src/routers/cart.ts:267,464`
- `packages/api/src/routers/packing.ts:319`

---

#### Issue #40: Empty Items Array Not Validated
**File:** `packages/api/src/routers/order.ts:176-181`
**Priority:** P2

**Required Changes:**
1. Add `.min(1)` to items array in `create` procedure
2. Verify all order creation endpoints have this validation

---

#### Issue #45-50: Customer Validation Gaps
**Files:** Various in `customer.ts`
**Priority:** P2

**Required Changes:**
1. Add postcode validation: `z.string().regex(/^\d{4}$/)`
2. Add phone validation using shared utility
3. Add license expiry future date check
4. Add credit limit upper bounds: `.max(10000000)` (100k in cents)
5. Add `.min(0)` to prevent negative values
6. Log warning when coordinates/area assignment fails

---

### Sprint 2.2: Transaction Safety

#### Issue #17: Race Condition in confirmOrder
**File:** `packages/api/src/routers/order.ts:2388-2453`
**Priority:** P2

**Required Changes:**
1. Wrap stock check and update in transaction
2. Use `SELECT FOR UPDATE` pattern for stock rows
3. Add retry logic for deadlock scenarios

---

#### Issue #20: Race Condition in Credit Rejection
**File:** `packages/api/src/routers/customer.ts:871-897`
**Priority:** P2

**Required Changes:**
1. Wrap in transaction (match `approveCredit` pattern)
2. Add atomic status check

---

#### Issue #22-24: Delivery Router Race Conditions
**Files:** `packages/api/src/routers/delivery.ts`
**Priority:** P2

**Required Changes:**
1. Add transaction to POD upload (#22)
2. Add transaction to driver reassignment (#23)
3. Add idempotency to auto-assign (#24)

---

#### Issue #27: Cart Race Condition
**File:** `packages/api/src/routers/cart.ts:86-112`
**Priority:** P2

**Required Changes:**
1. Implement optimistic locking with version field
2. Or use `findFirst` + `update` in transaction
3. Return conflict error on concurrent modification

---

### Sprint 2.3: Packing Router Hardening

#### Issue #9: markItemPacked Race Condition
**File:** `packages/api/src/routers/packing.ts:687-725`
**Priority:** P2

**Required Changes:**
1. Add version control to packed items
2. Use atomic update pattern
3. Return conflict on version mismatch

---

#### Issue #10: addPackingNotes Race Condition
**File:** `packages/api/src/routers/packing.ts:1240-1250`
**Priority:** P2

**Required Changes:**
1. Use atomic append pattern
2. Or implement optimistic locking

---

#### Issue #30: pauseOrder Race Condition
**File:** `packages/api/src/routers/packing.ts:1308-1327`
**Priority:** P2

**Required Changes:**
1. Add atomic guard
2. Return current state on conflict

---

### Sprint 2.4: Monetary & GST Handling

#### Issue #25: Cached GST Settings
**File:** `packages/api/src/routers/cart.ts:377,396-397,513-515`
**Priority:** P2

**Required Changes:**
1. Re-fetch GST settings on cart retrieval
2. Or invalidate cart items when GST settings change

---

#### Issue #33: Floating-Point Monetary Math
**File:** `packages/api/src/routers/inventory.ts:100-103,143,598,638`
**Priority:** P2

**Required Changes:**
1. Replace all raw math with dinero.js utilities
2. Audit entire codebase for monetary calculations
3. Add lint rule to prevent `* 0.1` patterns on money

---

#### Issue #34: GST Calculation Not Using Dinero
**File:** `packages/shared/src/utils/pricing.ts:55`
**Priority:** P2

**Required Changes:**
1. Use `calculateGST()` from money.ts
2. Ensure consistent rounding

---

#### Issue #35: Subproduct Floating-Point
**File:** `packages/shared/src/utils/subproduct.ts:34-36`
**Priority:** P2

**Required Changes:**
1. Use integer math for stock calculations
2. Document precision requirements

---

## Phase 3: Medium Severity Issues

**Timeline:** Week 5-6
**Goal:** Fix edge cases and improve UX

### Sprint 3.1: Checkout Flow Improvements

| Issue | File | Fix |
|-------|------|-----|
| #28 | order-summary.tsx:132,390-392 | Use Sydney timezone for Sunday check |
| #43 | order.ts:2469-2475 | Compare dates at day level, not millisecond |
| #59 | order-summary.tsx:49-62 | Reduce refresh interval to 30 seconds |
| #61 | order-summary.tsx:110-152 | Add pre-flight cutoff check before submit |

---

### Sprint 3.2: Delivery Router Improvements

| Issue | File | Fix |
|-------|------|-----|
| #51 | delivery.ts:214-321 | Move validation before state change |
| #52 | delivery.ts:1199-1352 | Add `returnedAt` timestamp field |
| #53 | delivery.ts:987-1055 | Add URL format validation |
| #54 | delivery.ts:987-1055 | Prevent POD overwrite or maintain history |
| #55 | delivery.ts:1058-1196 | Add time window validation for POD |
| #56 | delivery.ts:367-493 | Add distributed lock for route calculation |
| #57 | delivery.ts | Standardize date filtering approach |
| #58 | delivery.ts:30-49 | Move external API calls outside transaction |

---

### Sprint 3.3: Packing & Inventory

| Issue | File | Fix |
|-------|------|-----|
| #62 | packing.ts | Update activity on read operations |
| #63 | packing.ts:540-551 | Calculate actual cost for return batches |
| #64 | packing.ts:1115-1127 | Strengthen idempotency check |
| #65 | inventory.ts:614-634 | Enforce FIFO in consumption logic |

---

### Sprint 3.4: Pricing & Validation

| Issue | File | Fix |
|-------|------|-----|
| #41 | order.ts:2575-2634 | Add atomic guard |
| #42 | order.ts:637-642 | Require non-empty bypass reason |
| #44 | order.ts:1938-1974 | Add stock reservation on approval |
| #66 | pricing.ts | Validate no overlapping date ranges |

---

## Phase 4: Low Severity & Technical Debt

**Timeline:** Week 7+
**Goal:** Code quality and compliance

### Cleanup Tasks

| Issue | File | Fix |
|-------|------|-----|
| #67 | order.ts:200-217 | Add explicit `customerIdType` field |
| #68 | order.ts (multiple) | Use i18n for error messages |
| #69 | customer.ts | Implement ACN checksum validation |
| #70 | customer.ts | Add phone number validation |
| #71 | delivery.ts | Validate POD timestamp |
| #72 | money.ts:80-85 | Optimize toCents implementation |
| #73 | pricing.ts | Add date filtering at query level |

---

## Cross-Cutting Concerns

### Shared Services to Create

1. **Stock Restoration Service**
   ```
   packages/api/src/services/stock-restoration.ts
   ```
   - Unified logic for all stock restoration scenarios
   - Handles subproducts, batches, transactions

2. **Credit Calculation Service**
   ```
   packages/api/src/services/credit-calculation.ts
   ```
   - Single source of truth for available credit
   - Used by cart, order, and reorder

3. **Timezone Utilities**
   ```
   packages/shared/src/utils/timezone.ts
   ```
   - Sydney timezone handling
   - Date comparison utilities
   - Day-of-week checks

4. **Validation Utilities**
   ```
   packages/shared/src/utils/validation.ts
   ```
   - Australian phone format
   - ACN/ABN with checksum
   - Postcode format

### Database Migrations Required

1. Add `version` field to `Cart` for optimistic locking
2. Add unique constraint on `Customer.email`
3. Add `returnedAt` field to `Order`
4. Add `podUploadedAt` field to `Delivery`

### Configuration Changes

1. Add Vercel cron for packing timeout
2. Reduce cutoff refresh interval to 30 seconds
3. Add feature flags for gradual rollout

---

## Testing Strategy

### Unit Tests (Per Issue)
- Each fix must include unit tests
- Cover happy path and edge cases
- Test concurrent scenarios where applicable

### Integration Tests
- Cross-service interactions
- Transaction rollback verification
- Race condition simulation

### E2E Tests
- Customer checkout flow (timezone scenarios)
- Packing workflow (multiple packers)
- Credit limit scenarios

### Load Tests
- Concurrent order placement
- Concurrent packing operations
- Cart operations under load

### Security Tests
- Authorization bypass attempts
- Input validation fuzzing
- Rate limiting verification

---

## Rollback Procedures

### Feature Flags
All critical fixes should be behind feature flags:
- `FF_STOCK_CONSUMED_CHECK`
- `FF_CREDIT_AVAILABLE_CHECK`
- `FF_SESSION_LOCKING`
- `FF_TIMEZONE_AWARE_DATES`

### Database Rollback
- Keep migration down scripts
- Test rollback in staging
- Document data implications

### Monitoring
- Alert on error rate increase > 5%
- Monitor credit limit violations
- Track stock discrepancies

---

## Appendix: Issue Quick Reference

| # | Severity | Phase | Summary |
|---|----------|-------|---------|
| 1 | 🔴 | 1.1 | Stock restoration without check |
| 2 | 🔴 | 1.2 | Credit limit bypass in reorder |
| 3 | 🔴 | 1.1 | Missing inventory batch |
| 4 | 🔴 | 1.2 | Missing email uniqueness |
| 5 | 🔴 | 1.3 | Area assignment race condition |
| 6 | 🔴 | 1.3 | Bulk assignment no transaction |
| 7 | 🔴 | 1.3 | Packing session hijacking |
| 8 | 🔴 | 1.3 | Timeout not enforced |
| 9 | 🔴 | 2.3 | markItemPacked race condition |
| 10 | 🔴 | 2.3 | addPackingNotes race condition |
| 11 | 🔴 | 1.4 | Cached cart prices stale |
| 12 | 🔴 | 1.4 | Timezone off-by-one |
| 13 | 🔴 | 1.2 | Pricing missing authorization |
| 14 | 🔴 | 2.1 | Invalid Prisma query |
| 15 | 🔴 | 2.2 | Inventory batch race condition |
| 16 | 🟠 | 1.1 | Inconsistent stock restoration |
| 17 | 🟠 | 2.2 | confirmOrder race condition |
| 18 | 🟠 | 2.1 | Floating-point quantities |
| 19 | 🟠 | 1.1 | Stock restoration inconsistent |
| 20 | 🟠 | 2.2 | Credit rejection race condition |
| 21 | 🟠 | 2.1 | Validation inconsistencies |
| 22 | 🟠 | 2.2 | POD upload race condition |
| 23 | 🟠 | 2.2 | Driver reassignment no transaction |
| 24 | 🟠 | 2.2 | Auto-assign no idempotency |
| 25 | 🟠 | 2.4 | Cached GST settings |
| 26 | 🟠 | 2.1 | No quantity upper bounds |
| 27 | 🟠 | 2.2 | Cart race condition |
| 28 | 🟠 | 3.1 | UTC vs Sydney day mismatch |
| 29 | 🟠 | 1.4 | Credit calculation inconsistency |
| 30 | 🟠 | 2.3 | pauseOrder race condition |
| 31 | 🟠 | 2.1 | Unlimited quantity in packing |
| 32 | 🟠 | 1.2 | Pricing weak authorization |
| 33 | 🟠 | 2.4 | Floating-point monetary math |
| 34 | 🟠 | 2.4 | GST not using dinero |
| 35 | 🟠 | 2.4 | Subproduct floating-point |
| 36 | 🟠 | 3.1 | Hardcoded timezone |
| 37 | 🟠 | 3.3 | Packing reversion unclear |
| 38 | 🟠 | 3.4 | Permission cache too long |
| 39 | 🟠 | 3.4 | Profile data overwrite |
| 40-66 | 🟡 | 3.x | Medium severity issues |
| 67-73 | 🔵 | 4 | Low severity issues |
