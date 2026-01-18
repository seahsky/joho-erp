# Order-to-Packing Workflow Fix Plan

**Date:** 2026-01-18
**Audit Branch:** `claude/audit-order-packing-workflow-dY4PE`
**Status:** Draft - Pending Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Issues Overview](#issues-overview)
3. [Fix Plan: Issue #1 - Reorder Double Stock Consumption](#fix-plan-issue-1---reorder-double-stock-consumption)
4. [Fix Plan: Issue #2 - Multi-Subproduct Parent Stock Desync](#fix-plan-issue-2---multi-subproduct-parent-stock-desync)
5. [Fix Plan: Issue #3 - resetOrder Stuck State](#fix-plan-issue-3---resetorder-stuck-state)
6. [Fix Plan: Issue #4 - Multi-Subproduct Restoration Bug](#fix-plan-issue-4---multi-subproduct-restoration-bug)
7. [Fix Plan: Issue #5 - Stock Validation Outside Transaction](#fix-plan-issue-5---stock-validation-outside-transaction)
8. [Fix Plan: Issue #6 - Inconsistent Audit Trail](#fix-plan-issue-6---inconsistent-audit-trail)
9. [Implementation Order](#implementation-order)
10. [Testing Strategy](#testing-strategy)
11. [Rollback Plan](#rollback-plan)

---

## Executive Summary

This document outlines the comprehensive fix plan for logic flaws identified in the customer ordering workflow to packing system. The audit found **2 critical**, **2 high**, and **2 medium** severity issues that can cause inventory inconsistencies, workflow breakages, and data corruption.

### Key Architectural Principle

The system is designed with **delayed stock reduction** - stock should ONLY be consumed at the packing step (`markOrderReady`), not at order creation. This allows for:
- Backorder management
- Quantity adjustments during packing
- Flexible order modifications before final packing

All fixes must maintain this architectural principle.

---

## Issues Overview

| Priority | Issue | Severity | File | Estimated Effort |
|----------|-------|----------|------|------------------|
| P0 | Reorder double stock consumption | CRITICAL | order.ts | Small |
| P0 | Multi-subproduct parent stock desync | CRITICAL | packing.ts | Medium |
| P1 | resetOrder allows packed orders | HIGH | packing.ts | Small |
| P1 | Multi-subproduct restoration bug | HIGH | order.ts | Medium |
| P2 | Stock validation outside transaction | MEDIUM | packing.ts | Small |
| P2 | Inconsistent audit trail | MEDIUM | packing.ts | Small |

---

## Fix Plan: Issue #1 - Reorder Double Stock Consumption

### Problem Statement

The `reorder` function in `order.ts:1574-1653` reduces stock immediately when creating a reorder, which contradicts the system design where stock should only be reduced at packing.

### Current Behavior

```
Customer creates reorder → Stock reduced immediately → Order marked ready at packing → Stock reduced AGAIN
```

### Expected Behavior

```
Customer creates reorder → NO stock reduction → Order marked ready at packing → Stock reduced ONCE
```

### Solution

**Remove the stock reduction block from the `reorder` function.**

#### File: `packages/api/src/routers/order.ts`

**Location:** Lines 1574-1653 (approximate)

**Change:** Remove the entire stock reduction loop that runs when `!stockValidation.requiresBackorder`.

```typescript
// BEFORE (problematic code to REMOVE):
if (!stockValidation.requiresBackorder) {
  for (const item of newOrderItems) {
    const product = products.find((p) => p.id === item.productId);
    // ... stock reduction logic ...
    const transaction = await tx.inventoryTransaction.create({ ... });
    const result = await consumeStock(...);
    await tx.product.update({ ... });
  }
}

// AFTER (stock reduction removed):
// Stock is NOT reduced at reorder creation
// Stock reduction happens at packing step (markOrderReady) to allow for quantity adjustments
// (No stock reduction code here - just create the order)
```

### Verification Steps

1. Create a reorder for an existing order
2. Verify `Product.currentStock` is NOT changed after reorder creation
3. Verify no `InventoryTransaction` records are created at reorder time
4. Pack the reorder using `markOrderReady`
5. Verify stock is reduced ONCE at packing

### Risk Assessment

- **Risk Level:** Low
- **Breaking Changes:** None - this aligns behavior with the documented design
- **Backward Compatibility:** Existing orders unaffected

---

## Fix Plan: Issue #2 - Multi-Subproduct Parent Stock Desync

### Problem Statement

When an order contains multiple subproducts from the same parent product, only the first subproduct's consumption is reflected in `Product.currentStock`, while batch consumption happens for ALL items.

### Root Cause

The `updatedParentIds` Set in `markOrderReady` prevents the parent stock update for subsequent subproducts:

```typescript
// Current problematic pattern:
const updatedParentIds = new Set<string>();

for (const item of items) {
  consumeStock(...); // Always runs - batches consumed

  if (!updatedParentIds.has(parentProduct.id)) {
    // Only runs for FIRST subproduct of this parent
    updateParentStock(...);
    updatedParentIds.add(parentProduct.id);
  }
  // SECOND subproduct: parent stock NOT updated!
}
```

### Solution

**Aggregate parent consumption first, then update each parent once with total consumption.**

#### File: `packages/api/src/routers/packing.ts`

**Location:** Lines 743-884 (the stock consumption loop in `markOrderReady`)

**New Approach:**

```typescript
// PHASE 1: Aggregate consumption per parent
const parentConsumptions = new Map<string, {
  totalConsumption: number;
  items: Array<{ productName: string; quantity: number; unit: string }>;
}>();

const regularProductUpdates: Array<{
  productId: string;
  consumeQuantity: number;
  product: Product;
}> = [];

for (const item of freshOrder.items as any[]) {
  const product = productMap.get(item.productId);
  if (!product) {
    missingProducts.push(`${item.productName} (${item.sku})`);
    continue;
  }

  const productIsSubproduct = isSubproduct(product);
  const parentProduct = productIsSubproduct ? product.parentProduct : null;
  const consumeFromProductId = parentProduct ? parentProduct.id : product.id;

  const consumeQuantity = productIsSubproduct
    ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
    : item.quantity;

  if (productIsSubproduct && parentProduct) {
    // Aggregate for parent
    const existing = parentConsumptions.get(parentProduct.id) || {
      totalConsumption: 0,
      items: [],
    };
    existing.totalConsumption += consumeQuantity;
    existing.items.push({
      productName: product.name,
      quantity: item.quantity,
      unit: product.unit,
    });
    parentConsumptions.set(parentProduct.id, existing);
  } else {
    // Track regular products for later processing
    regularProductUpdates.push({ productId: product.id, consumeQuantity, product });
  }
}

// PHASE 2: Process parent products (with aggregated consumption)
for (const [parentId, { totalConsumption, items }] of parentConsumptions) {
  // Fetch fresh parent stock
  const parentProduct = await tx.product.findUnique({ where: { id: parentId } });
  if (!parentProduct) continue;

  const previousStock = parentProduct.currentStock;
  const newStock = previousStock - totalConsumption;

  // Validate stock
  if (newStock < 0) {
    const itemList = items.map(i => `${i.productName} (${i.quantity}${i.unit})`).join(', ');
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient stock for parent product ${parentProduct.name}. Available: ${previousStock}, Required: ${totalConsumption} (for: ${itemList})`,
    });
  }

  // Create single inventory transaction for total consumption
  const transactionNotes = `Subproducts packed for order ${freshOrder.orderNumber}: ${items.map(i => `${i.productName} (${i.quantity}${i.unit})`).join(', ')}`;

  const transaction = await tx.inventoryTransaction.create({
    data: {
      productId: parentId,
      type: 'sale',
      quantity: -totalConsumption,
      previousStock,
      newStock,
      referenceType: 'order',
      referenceId: freshOrder.id,
      notes: transactionNotes,
      createdBy: ctx.userId || 'system',
    },
  });

  // Consume from batches
  await consumeStock(parentId, totalConsumption, transaction.id, freshOrder.id, freshOrder.orderNumber, tx);

  // Update parent stock (atomic)
  const updateResult = await tx.product.updateMany({
    where: { id: parentId, currentStock: previousStock },
    data: { currentStock: newStock },
  });

  if (updateResult.count === 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Stock for ${parentProduct.name} modified concurrently. Please retry.`,
    });
  }

  // Recalculate all subproduct stocks
  const subproducts = await tx.product.findMany({
    where: { parentProductId: parentId },
    select: { id: true, parentProductId: true, estimatedLossPercentage: true },
  });

  if (subproducts.length > 0) {
    const updatedStocks = calculateAllSubproductStocks(newStock, subproducts);
    for (const { id, newStock: subStock } of updatedStocks) {
      await tx.product.update({
        where: { id },
        data: { currentStock: subStock },
      });
    }
  }
}

// PHASE 3: Process regular products (unchanged logic)
for (const { productId, consumeQuantity, product } of regularProductUpdates) {
  // ... existing regular product logic ...
}
```

### Verification Steps

1. Create an order with 2+ subproducts from the same parent (e.g., "Salmon Fillet 200g" and "Salmon Fillet 500g" both from "Salmon")
2. Note parent stock before packing (e.g., 100kg)
3. Pack the order via `markOrderReady`
4. Verify parent stock is reduced by TOTAL consumption (e.g., both fillets' consumption combined)
5. Verify batch consumption matches parent stock change
6. Verify a single `InventoryTransaction` is created for the parent (with combined notes)

### Risk Assessment

- **Risk Level:** Medium
- **Breaking Changes:** Changes to inventory transaction structure (combined vs separate)
- **Backward Compatibility:** Existing orders unaffected; new behavior for future orders

---

## Fix Plan: Issue #3 - resetOrder Stuck State

### Problem Statement

The `resetOrder` function allows resetting orders with status `'ready_for_delivery'` (where stock was already consumed), but doesn't:
1. Check the `stockConsumed` flag
2. Restore consumed stock
3. Clear the `stockConsumed` flag

This leaves orders in a stuck state where they can't be re-packed.

### Solution Options

#### Option A: Prevent Reset of Stock-Consumed Orders (Recommended)

**Simpler, safer approach** - prevent the invalid operation entirely.

```typescript
// File: packages/api/src/routers/packing.ts
// Location: resetOrder mutation (lines 1161-1231)

// Add check BEFORE status check:
if (order.stockConsumed) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Cannot reset order after stock has been consumed. To modify this order, please cancel it and create a new order.',
  });
}

// Also remove 'ready_for_delivery' from allowed statuses:
if (!['packing', 'confirmed'].includes(order.status)) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Only orders in packing or confirmed status can be reset',
  });
}
```

#### Option B: Full Reset with Stock Restoration

**More complex** - restore stock and allow re-packing.

```typescript
// If stockConsumed is true, restore stock before resetting
if (order.stockConsumed) {
  await prisma.$transaction(async (tx) => {
    // Restore stock for each item (similar to cancellation logic)
    // ... stock restoration code ...

    // Clear stockConsumed flag
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        stockConsumed: false,
        stockConsumedAt: null,
        // ... other reset fields ...
      },
    });
  });
}
```

### Recommended Approach

**Option A** is recommended because:
1. Simpler to implement and test
2. Lower risk of inventory errors
3. Clearer user workflow (cancel → recreate if changes needed after packing)
4. Consistent with the principle that packed orders are "finalized"

### Verification Steps

1. Create and pack an order (status becomes 'ready_for_delivery', stockConsumed=true)
2. Attempt to reset the order
3. Verify error message is shown: "Cannot reset order after stock has been consumed"
4. Verify order status remains 'ready_for_delivery'
5. Verify stock is unchanged

### Risk Assessment

- **Risk Level:** Low
- **Breaking Changes:** Users can no longer reset packed orders (but this was broken anyway)
- **Backward Compatibility:** Existing stuck orders will need to be cancelled manually

---

## Fix Plan: Issue #4 - Multi-Subproduct Restoration Bug

### Problem Statement

The cancellation stock restoration has the same bug as `markOrderReady` - it uses `updatedParentIds` Set which causes only the first subproduct's stock to be restored.

### Solution

**Apply the same aggregation pattern as Issue #2 to the cancellation logic.**

#### File: `packages/api/src/routers/order.ts`

**Location:** Lines 1146-1255 (stock restoration in cancel mutation)

**Change:** Aggregate restoration amounts per parent, then restore once with total.

```typescript
// PHASE 1: Aggregate restoration per parent
const parentRestorations = new Map<string, {
  totalRestoration: number;
  items: Array<{ productName: string; quantity: number; unit: string }>;
}>();

for (const item of currentOrder.items as any[]) {
  const product = products.find((p) => p.id === item.productId);
  if (!product) continue;

  const productIsSubproduct = isSubproduct(product);
  const parentProduct = productIsSubproduct ? product.parentProduct : null;

  const restoreQuantity = productIsSubproduct
    ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
    : item.quantity;

  if (productIsSubproduct && parentProduct) {
    const existing = parentRestorations.get(parentProduct.id) || {
      totalRestoration: 0,
      items: [],
    };
    existing.totalRestoration += restoreQuantity;
    existing.items.push({
      productName: product.name,
      quantity: item.quantity,
      unit: product.unit,
    });
    parentRestorations.set(parentProduct.id, existing);
  } else {
    // Handle regular products (existing logic)
  }
}

// PHASE 2: Restore parent products with aggregated amounts
for (const [parentId, { totalRestoration, items }] of parentRestorations) {
  const parentProduct = await tx.product.findUnique({ where: { id: parentId } });
  if (!parentProduct) continue;

  const currentStock = parentProduct.currentStock;
  const newStock = currentStock + totalRestoration;

  // Create single restoration transaction
  const transaction = await tx.inventoryTransaction.create({
    data: {
      productId: parentId,
      type: 'return',
      quantity: totalRestoration,
      previousStock: currentStock,
      newStock,
      referenceType: 'order',
      referenceId: currentOrder.id,
      notes: `Stock restored from cancelled order ${currentOrder.orderNumber}: ${items.map(i => `${i.productName} (${i.quantity}${i.unit})`).join(', ')}`,
      createdBy: ctx.userId,
    },
  });

  // Update parent stock
  await tx.product.update({
    where: { id: parentId },
    data: { currentStock: newStock },
  });

  // Recalculate subproduct stocks
  await updateParentAndSubproductStocks(parentId, newStock, tx);
}
```

### Verification Steps

1. Create an order with 2+ subproducts from the same parent
2. Pack the order (consume stock)
3. Cancel the order
4. Verify parent stock is restored by TOTAL amount (all subproducts combined)
5. Verify `InventoryTransaction` shows correct restoration amount

### Risk Assessment

- **Risk Level:** Medium
- **Breaking Changes:** Changes to restoration transaction structure
- **Backward Compatibility:** Existing cancelled orders unaffected

---

## Fix Plan: Issue #5 - Stock Validation Outside Transaction

### Problem Statement

Initial stock availability check in `updateItemQuantity` is performed outside the transaction, creating a race condition window.

### Solution

**Move the stock validation inside the transaction.**

#### File: `packages/api/src/routers/packing.ts`

**Location:** Lines 396-418 and 454+

**Change:**

```typescript
// BEFORE: Validation outside transaction
const product = await prisma.product.findUnique({ where: { id: orderItem.productId } });
if (quantityDiff > 0 && product.currentStock < quantityDiff) {
  throw new TRPCError({ ... }); // Outside transaction
}

await prisma.$transaction(async (tx) => {
  // Transaction logic
});

// AFTER: Validation inside transaction
await prisma.$transaction(async (tx) => {
  // Re-fetch product inside transaction for accurate stock check
  const product = await tx.product.findUnique({
    where: { id: orderItem.productId },
    include: { parentProduct: true },
  });

  if (!product) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
  }

  // Validate stock availability with fresh data
  if (quantityDiff > 0) {
    const availableStock = product.parentProduct
      ? product.parentProduct.currentStock
      : product.currentStock;

    if (availableStock < quantityDiff) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient stock. Available: ${availableStock}, Required increase: ${quantityDiff}`,
      });
    }
  }

  // Continue with quantity update logic...
});
```

### Verification Steps

1. Simulate concurrent requests (one consuming stock, one trying to increase quantity)
2. Verify that the transaction properly handles the race condition
3. Verify appropriate error messages for insufficient stock

### Risk Assessment

- **Risk Level:** Low
- **Breaking Changes:** None - same behavior, better consistency
- **Backward Compatibility:** Fully compatible

---

## Fix Plan: Issue #6 - Inconsistent Audit Trail

### Problem Statement

`InventoryTransaction` records show `previousStock` and `newStock` values that may be inaccurate for multi-subproduct orders due to Issue #2.

### Solution

**This is automatically fixed by Issue #2's fix** - by aggregating consumption and creating a single transaction per parent, the audit trail becomes accurate.

### Additional Improvement (Optional)

Add a `relatedItems` field to `InventoryTransaction` to track which order items contributed to the transaction:

```typescript
// In InventoryTransaction creation:
const transaction = await tx.inventoryTransaction.create({
  data: {
    productId: parentId,
    type: 'sale',
    quantity: -totalConsumption,
    previousStock,
    newStock,
    referenceType: 'order',
    referenceId: freshOrder.id,
    notes: transactionNotes,
    // Optional: Add structured data about contributing items
    metadata: {
      contributingItems: items.map(i => ({
        productName: i.productName,
        quantity: i.quantity,
        unit: i.unit,
      })),
    },
    createdBy: ctx.userId || 'system',
  },
});
```

### Verification Steps

1. After implementing Issue #2 fix, verify inventory transactions have accurate values
2. Verify audit log shows combined consumption for multi-subproduct orders
3. Verify `previousStock` + `quantity` = `newStock` for all transactions

---

## Implementation Order

### Phase 1: Critical Fixes (P0)

1. **Issue #1: Reorder Double Stock Consumption**
   - Simple removal of stock reduction code
   - Low risk, high impact
   - Implement first

2. **Issue #2: Multi-Subproduct Parent Stock Desync**
   - Core algorithmic fix
   - Required before #4 and #6
   - Implement second

### Phase 2: High Priority Fixes (P1)

3. **Issue #3: resetOrder Stuck State**
   - Simple validation addition
   - Can be done in parallel with #4

4. **Issue #4: Multi-Subproduct Restoration Bug**
   - Similar pattern to #2
   - Apply same aggregation approach

### Phase 3: Medium Priority Fixes (P2)

5. **Issue #5: Stock Validation Outside Transaction**
   - Code reorganization
   - Low risk

6. **Issue #6: Inconsistent Audit Trail**
   - Mostly fixed by #2
   - Optional metadata enhancement

---

## Testing Strategy

### Unit Tests

```typescript
describe('Order Workflow Fixes', () => {
  describe('Issue #1: Reorder', () => {
    it('should NOT reduce stock when creating reorder', async () => {
      // Create original order, pack it
      // Create reorder
      // Assert: stock unchanged after reorder creation
      // Pack reorder
      // Assert: stock reduced once
    });
  });

  describe('Issue #2: Multi-Subproduct markOrderReady', () => {
    it('should correctly reduce parent stock for multiple subproducts', async () => {
      // Create order with 2 subproducts from same parent
      // Pack order
      // Assert: parent stock reduced by TOTAL consumption
      // Assert: single InventoryTransaction for parent
    });

    it('should handle mixed regular and subproducts', async () => {
      // Create order with regular product + 2 subproducts from same parent
      // Pack order
      // Assert: regular product stock reduced correctly
      // Assert: parent stock reduced by total subproduct consumption
    });
  });

  describe('Issue #3: resetOrder', () => {
    it('should prevent reset of stock-consumed orders', async () => {
      // Create and pack order
      // Attempt reset
      // Assert: error thrown with appropriate message
    });

    it('should allow reset of non-consumed orders', async () => {
      // Create order (status: confirmed)
      // Reset order
      // Assert: success
    });
  });

  describe('Issue #4: Cancellation Restoration', () => {
    it('should correctly restore parent stock for multiple subproducts', async () => {
      // Create order with 2 subproducts from same parent
      // Pack order
      // Cancel order
      // Assert: parent stock restored to original
      // Assert: single restoration InventoryTransaction
    });
  });
});
```

### Integration Tests

1. **End-to-End Order Flow**
   - Customer creates order → Admin packs → Delivery → Complete
   - Verify stock at each step

2. **Backorder Flow**
   - Order with insufficient stock → Backorder created → Approved → Packed
   - Verify stock only reduced at packing

3. **Cancellation Flow**
   - Packed order cancelled
   - Verify full stock restoration

### Manual Testing Checklist

- [ ] Create order with single product - verify stock flow
- [ ] Create order with multiple regular products - verify stock flow
- [ ] Create order with single subproduct - verify parent stock flow
- [ ] Create order with multiple subproducts from same parent - verify parent stock flow
- [ ] Create order with subproducts from different parents - verify each parent stock flow
- [ ] Reorder flow - verify no double consumption
- [ ] Reset confirmed order - verify success
- [ ] Reset packing order - verify success
- [ ] Reset ready_for_delivery order - verify error
- [ ] Cancel packed order - verify full stock restoration
- [ ] Cancel packed order with multi-subproducts - verify full parent restoration

---

## Rollback Plan

### If Issues Occur Post-Deployment

1. **Immediate Rollback**
   - Revert the deployment to previous version
   - All fixes are backward compatible, so rollback is safe

2. **Data Reconciliation**
   - Run inventory audit script to identify discrepancies
   - Compare `Product.currentStock` with sum of `InventoryBatch.quantityRemaining`
   - Generate reconciliation report

3. **Manual Corrections**
   - For any inventory discrepancies found:
     - Create adjustment `InventoryTransaction` with type 'adjustment'
     - Update `Product.currentStock` to match batch totals
     - Document corrections in audit log

### Inventory Reconciliation Query

```sql
-- Find products where currentStock doesn't match batch totals
SELECT
  p.id,
  p.name,
  p.currentStock,
  COALESCE(SUM(b.quantityRemaining), 0) as batchTotal,
  p.currentStock - COALESCE(SUM(b.quantityRemaining), 0) as discrepancy
FROM "Product" p
LEFT JOIN "InventoryBatch" b ON b."productId" = p.id AND b."isConsumed" = false
GROUP BY p.id, p.name, p.currentStock
HAVING p.currentStock != COALESCE(SUM(b.quantityRemaining), 0);
```

---

## Appendix: Affected Files

| File | Changes |
|------|---------|
| `packages/api/src/routers/order.ts` | Issues #1, #4 |
| `packages/api/src/routers/packing.ts` | Issues #2, #3, #5, #6 |

---

## Sign-Off

- [ ] Development Review
- [ ] Code Review
- [ ] QA Testing
- [ ] Stakeholder Approval
- [ ] Deployment Scheduled

---

*Document Version: 1.0*
*Last Updated: 2026-01-18*
