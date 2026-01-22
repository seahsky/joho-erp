# Code Review Remediation Plan

**Review Date:** 2026-01-22
**Scope:** Admin Portal & Customer Portal
**Total Issues Identified:** 47+

---

## Executive Summary

This document outlines the remediation plan for issues identified during the deep code review of both portals. Issues are organized into phases based on severity and risk, with clear action items for each.

---

## Phase 1: Critical Security & Data Integrity (Immediate)

### 1.1 CRON Endpoint Authorization Bypass

**Risk:** High - Endpoints publicly accessible if CRON_SECRET env var not set
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/api/cron/packing-timeout/route.ts`
- `apps/admin-portal/app/api/cron/sms-reminder/route.ts`
- `apps/admin-portal/app/api/cron/low-stock/route.ts`

**Action Items:**
- [ ] Change condition from `if (CRON_SECRET && ...)` to `if (!CRON_SECRET || ...)`
- [ ] Add explicit error response when CRON_SECRET is not configured
- [ ] Add logging for unauthorized access attempts
- [ ] Update `.env.example` to document CRON_SECRET as mandatory

**Implementation Pattern:**
```typescript
// Before (vulnerable)
if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// After (secure)
if (!CRON_SECRET) {
  console.error('CRON_SECRET environment variable is not configured');
  return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
}
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### 1.2 Non-null Assertion Runtime Crashes

**Risk:** High - Application crashes when accessing POD data
**Effort:** Medium
**Files to modify:**
- `apps/customer-portal/app/[locale]/orders/components/order-details-modal.tsx`

**Action Items:**
- [ ] Replace all `!` non-null assertions with proper null checks (lines 279, 291, 296, 300, 450, 458, 463)
- [ ] Add conditional rendering for POD section when `proofOfDelivery` is null
- [ ] Add type guards for `deliveryAddress` access (lines 249-252)
- [ ] Consider creating a type-safe helper for POD data access

**Implementation Pattern:**
```typescript
// Before (crash-prone)
{(order.delivery as Delivery).proofOfDelivery!.fileUrl}

// After (safe)
{order.delivery?.proofOfDelivery?.fileUrl && (
  <Image src={order.delivery.proofOfDelivery.fileUrl} ... />
)}
```

---

### 1.3 Floating-Point GST Calculations

**Risk:** High - Financial calculation errors
**Effort:** Medium
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/orders/create/page.tsx` (line 134)
- `packages/api/src/routers/cart.ts` (line 174)

**Action Items:**
- [ ] Replace `Math.round((item.subtotal * rate) / 100)` with dinero.js `calculateGST()`
- [ ] Replace `Math.round(rate)` in cart router with proper dinero multiplication
- [ ] Add unit tests for GST calculations with edge cases
- [ ] Audit all `Math.round` usages on monetary values

**Implementation Pattern:**
```typescript
// Before (floating-point error prone)
const gst = Math.round((subtotal * rate) / 100);

// After (dinero.js)
import { createMoney, calculateGST, toCents } from '@joho-erp/shared';
const subtotalMoney = createMoney(subtotal);
const { gst } = calculateGST(subtotalMoney);
const gstCents = toCents(gst);
```

---

## Phase 2: Error Handling & User Experience (High Priority)

### 2.1 Swallowed Errors Without User Notification

**Risk:** Medium - Silent failures, poor debugging
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/customers/new/page.tsx` (lines 633-637)
- `apps/customer-portal/components/address-search.tsx` (lines 72-76)
- `apps/admin-portal/app/[locale]/(app)/deliveries/components/RouteManifestDialog.tsx` (lines 199-203)
- `apps/admin-portal/app/[locale]/(app)/packing/page.tsx` (lines 108-112)

**Action Items:**
- [ ] Add toast notifications for all caught errors
- [ ] Use translated error messages via `t('errors.operationFailed')`
- [ ] Keep console.error for debugging but add user-facing feedback
- [ ] Create standardized error handling utility

**Implementation Pattern:**
```typescript
// Before (swallowed)
} catch (error) {
  console.error('Failed to create customer:', error);
}

// After (user notified)
} catch (error) {
  console.error('Failed to create customer:', error);
  toast.error(t('errors.customerCreationFailed'));
}
```

---

### 2.2 Double Submission Prevention

**Risk:** Medium - Duplicate records, financial discrepancies
**Effort:** Low
**Files to modify:**
- `apps/customer-portal/app/[locale]/onboarding/components/signature-step.tsx` (line 411)
- `apps/admin-portal/app/[locale]/(app)/suppliers/new/page.tsx` (lines 271-310)
- `apps/admin-portal/app/[locale]/(app)/customers/new/page.tsx` (lines 599-638)

**Action Items:**
- [ ] Add `isPending` check from mutation before calling `mutateAsync()`
- [ ] Disable submit buttons using `mutation.isPending`
- [ ] Add debounce to form submission handlers
- [ ] Consider using `useTransition` for optimistic UI patterns

**Implementation Pattern:**
```typescript
// Before
const handleSubmit = async () => {
  await createCustomer.mutateAsync(data);
};

// After
const handleSubmit = async () => {
  if (createCustomer.isPending) return;
  await createCustomer.mutateAsync(data);
};

// Button
<Button disabled={createCustomer.isPending}>
  {createCustomer.isPending ? t('common.saving') : t('common.save')}
</Button>
```

---

### 2.3 Form Inputs Not Disabled During Mutation

**Risk:** Low - Data corruption possible
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/deliveries/components/MarkDeliveredDialog.tsx` (line 167)
- `apps/admin-portal/app/[locale]/(app)/driver/components/CompleteDeliveryDialog.tsx` (lines 97-104)
- `apps/admin-portal/app/[locale]/(app)/driver/components/ReturnDialog.tsx` (lines 120-127)
- `apps/admin-portal/app/[locale]/(app)/orders/components/ConfirmOrderDialog.tsx` (lines 168-174)

**Action Items:**
- [ ] Add `disabled={mutation.isPending}` to all form inputs in dialogs
- [ ] Create a reusable `FormFieldset` component that auto-disables children during loading
- [ ] Audit all dialog forms for consistency

---

### 2.4 Missing Validation Feedback

**Risk:** Low - Confusing UX
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/orders/components/BackorderApprovalDialog.tsx` (lines 145-185)
- `apps/admin-portal/app/[locale]/(app)/pricing/components/SetPriceDialog.tsx` (lines 180-187)

**Action Items:**
- [ ] Add toast notifications when validation fails
- [ ] Show inline validation errors on form fields
- [ ] Use consistent validation feedback pattern across all forms

---

## Phase 3: Money Handling Standardization (High Priority)

### 3.1 Manual Float Conversion for Display

**Risk:** Medium - Inconsistent formatting, potential rounding errors
**Effort:** Medium
**Files to modify:**
- `apps/customer-portal/app/[locale]/onboarding/components/business-info-step.tsx` (lines 342, 358)
- `apps/admin-portal/app/[locale]/(app)/customers/new/page.tsx` (lines 1298, 1317, 1339)
- `apps/admin-portal/components/dashboard/RevenueChart.tsx` (lines 115, 165)

**Action Items:**
- [ ] Replace `value / 100` with `formatCentsForInput()` for form inputs
- [ ] Replace `(value / 100).toFixed(0)` with `formatAUD()` for display
- [ ] Create chart-specific formatter if needed: `formatAUDCompact()`
- [ ] Add ESLint rule to flag `/ 100` patterns on monetary variables

---

### 3.2 Floating-Point Operations on Prices

**Risk:** Medium - Calculation errors
**Effort:** Medium
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/pricing/components/SetPriceDialog.tsx` (line 208)
- `apps/admin-portal/app/[locale]/(app)/products/components/CustomerPricingSection.tsx` (lines 138, 155-156, 171, 200)

**Action Items:**
- [ ] Replace `parseFloat()` with `parseToCents()` for user input
- [ ] Use `getDiscountPercentage()` from money utils for discount calculations
- [ ] Replace all floating-point price operations with dinero equivalents
- [ ] Add type annotations indicating cents vs dollars

---

### 3.3 Local formatAUD Reimplementation

**Risk:** Low - Code duplication, inconsistency
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/inventory/components/exports/InventoryReportDocument.tsx` (line 112)

**Action Items:**
- [ ] Remove local `formatAUD` function
- [ ] Import from `@joho-erp/shared`
- [ ] Search for other local currency formatters and consolidate

---

## Phase 4: Internationalization Compliance (Medium Priority)

### 4.1 Untranslated Error Messages

**Risk:** Medium - i18n compliance violation, poor UX for non-English users
**Effort:** High (30+ instances)

**Customer Portal Files:**
- [ ] `components/mini-cart/mini-cart-content.tsx` (line 83)
- [ ] `app/[locale]/orders/components/order-details-modal.tsx` (lines 116, 161)
- [ ] `app/[locale]/orders/components/order-list.tsx` (lines 101, 173)
- [ ] `app/[locale]/checkout/components/order-summary.tsx` (line 101)
- [ ] `app/[locale]/products/components/product-list.tsx` (line 206)
- [ ] `app/[locale]/products/components/inline-quantity-controls.tsx` (lines 84, 124, 164)
- [ ] `app/[locale]/dashboard/components/dashboard-content.tsx` (line 51)
- [ ] `app/[locale]/cart/page.tsx` (line 102)

**Admin Portal Files:**
- [ ] `components/xero-sync-badge.tsx` (lines 101, 325)
- [ ] `app/[locale]/(app)/pricing/components/SetPriceDialog.tsx` (lines 129, 132)
- [ ] `app/[locale]/(app)/pricing/components/BulkImportDialog.tsx` (lines 60, 63, 146)
- [ ] `app/[locale]/(app)/orders/page.tsx` (lines 146, 165, 186, 232)
- [ ] `app/[locale]/(app)/orders/components/ConfirmOrderDialog.tsx` (line 79)
- [ ] `app/[locale]/(app)/orders/components/OrderActions.tsx` (lines 67, 83)
- [ ] `app/[locale]/(app)/deliveries/components/MarkDeliveredDialog.tsx` (line 86)
- [ ] `app/[locale]/(app)/inventory/components/StockAdjustmentDialog.tsx` (line 166)
- [ ] `app/[locale]/(app)/settings/xero-sync/page.tsx` (line 107)

**Action Items:**
- [ ] Create error message translation keys in all 6 message files
- [ ] Add namespace `errors` with common error messages
- [ ] Replace `toast.error(error.message)` with `toast.error(t('errors.operationFailed'))`
- [ ] For specific errors, map error codes to translation keys
- [ ] Add hardcoded string `'An error occurred'` to translations

**Translation Keys to Add:**
```json
{
  "errors": {
    "operationFailed": "Operation failed. Please try again.",
    "networkError": "Network error. Please check your connection.",
    "validationFailed": "Please check your input and try again.",
    "unauthorized": "You don't have permission to perform this action.",
    "notFound": "The requested resource was not found.",
    "serverError": "Server error. Please try again later."
  }
}
```

---

## Phase 5: Authorization & Validation (Medium Priority)

### 5.1 Missing Ownership Validation in API

**Risk:** Medium - Data exposure across customers
**Effort:** Low
**Files to modify:**
- `packages/api/src/routers/pricing.ts` (lines 146-174)

**Action Items:**
- [ ] Add ownership check for `getCustomerProductPrice` endpoint
- [ ] Validate that requesting user has permission to view customer data
- [ ] Consider removing endpoint if unused
- [ ] Add integration test for authorization

---

### 5.2 Upload Endpoint Validation

**Risk:** Low - Invalid data in storage
**Effort:** Low
**Files to modify:**
- `apps/customer-portal/app/api/upload/identity-document/route.ts` (lines 51, 112)

**Action Items:**
- [ ] Add validation that customerId is valid MongoDB ObjectID format
- [ ] Add file size limits to upload endpoints
- [ ] Add rate limiting to prevent abuse
- [ ] Log upload attempts for audit

---

### 5.3 File Upload Size Validation

**Risk:** Low - Large file uploads, storage abuse
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/driver/components/PODUploadDialog.tsx` (line 145)
- `apps/customer-portal/app/[locale]/onboarding/components/signature-step.tsx` (lines 202, 215, 236)

**Action Items:**
- [ ] Add client-side file size validation (max 5MB recommended)
- [ ] Show user-friendly error for oversized files
- [ ] Add server-side size validation as backup

---

## Phase 6: Code Quality & Null Safety (Lower Priority)

### 6.1 Missing Optional Chaining

**Risk:** Low - Potential runtime errors
**Effort:** Low
**Files to modify:**
- `apps/admin-portal/app/[locale]/(app)/inventory/components/StockCountsTable.tsx` (lines 107-108)
- `apps/admin-portal/app/[locale]/(app)/customers/[id]/page.tsx` (lines 340, 362)

**Action Items:**
- [ ] Add optional chaining for `product.name?.toLowerCase()`
- [ ] Add type guards before accessing nested properties
- [ ] Enable stricter TypeScript null checks if not already

---

## Implementation Schedule

| Phase | Priority | Estimated Effort | Dependencies |
|-------|----------|------------------|--------------|
| Phase 1 | Critical | 1-2 days | None |
| Phase 2 | High | 2-3 days | None |
| Phase 3 | High | 2 days | None |
| Phase 4 | Medium | 3-4 days | Translation team review |
| Phase 5 | Medium | 1 day | None |
| Phase 6 | Lower | 0.5 days | None |

---

## Testing Requirements

### Unit Tests to Add
- [ ] GST calculation edge cases (rounding, zero amounts, large amounts)
- [ ] Money utility functions with edge cases
- [ ] Authorization checks for pricing endpoints

### Integration Tests to Add
- [ ] CRON endpoint authentication
- [ ] Form submission double-click prevention
- [ ] Error message display in all supported languages

### Manual Testing Checklist
- [ ] Test all forms with rapid clicking
- [ ] Test POD viewing when delivery has no POD
- [ ] Test with CRON_SECRET unset (should fail gracefully)
- [ ] Test all error scenarios show translated messages
- [ ] Test monetary displays in different locales

---

## Success Criteria

- [ ] All critical security issues resolved (Phase 1)
- [ ] No runtime crashes from null assertions
- [ ] All monetary calculations use dinero.js
- [ ] All user-facing errors are translated
- [ ] Build passes with no TypeScript errors
- [ ] All existing tests continue to pass

---

## Notes

- Do not introduce new features during remediation
- Keep PRs focused on single phases for easier review
- Run `pnpm type-check` and `pnpm build` after each phase
- Test language switching after i18n changes
