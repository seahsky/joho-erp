# Order-Packing Workflow Bug Fix Implementation Plan

## Executive Summary

This plan addresses 6 interconnected issues in the order-packing stock management workflow. The issues primarily involve double stock consumption, race conditions, and incorrect aggregation logic for multi-subproduct orders.

---

## Issue #1: Reorder Double Stock Consumption (CRITICAL)

### Problem Analysis
The `reorder` mutation in `/packages/api/src/routers/order.ts` (lines 1574-1653) contains a stock reduction block that runs when `!stockValidation.requiresBackorder`. This violates the architectural principle that **stock should ONLY be consumed at the packing step** via `markOrderReady`.

### Current Problematic Code Location
- **File:** `/packages/api/src/routers/order.ts`
- **Lines:** 1574-1653
- **Function:** `reorder` mutation

### Fix Strategy
**Simply delete the entire block from line 1574 to line 1653.**

The block starts with:
```typescript
// If NOT a backorder, reduce stock immediately
if (!stockValidation.requiresBackorder) {
```

And ends before:
```typescript
return createdOrder;
```

### Code to Remove
Delete this entire section (approximately 80 lines):
```typescript
// If NOT a backorder, reduce stock immediately
if (!stockValidation.requiresBackorder) {
  // Track which parent products have been updated to avoid duplicate recalculations
  const updatedParentIds = new Set<string>();

  for (const item of newOrderItems) {
    // ... all stock reduction logic ...
  }
}
```

### Verification
After removal, the `reorder` function should:
1. Create the order with `stockConsumed: false` (default)
2. NOT touch any product stock
3. Let `markOrderReady` handle stock reduction when packing is complete

---

## Issue #2: Multi-Subproduct Parent Stock Desync (CRITICAL)

### Problem Analysis
The `markOrderReady` mutation in `/packages/api/src/routers/packing.ts` (lines 743-884) uses an `updatedParentIds` Set that only updates parent stock for the FIRST subproduct encountered. 

**Scenario:** An order has 2 subproducts (SubA and SubB) from the same parent product.
- SubA consumes 5kg from parent (parentStock goes 100 -> 95)
- SubB consumes 3kg from parent
- BUG: Because parent is in `updatedParentIds`, SubB's 3kg is consumed from batches but parent stock stays at 95 instead of 92

### Current Problematic Code Pattern
```typescript
const updatedParentIds = new Set<string>();

for (const item of freshOrder.items as any[]) {
  // ... calculate consumeQuantity ...
  
  // consumeStock() ALWAYS runs - correct
  await consumeStock(consumeFromProductId, consumeQuantity, ...);
  
  // Update parent stock - ONLY runs once per parent - BUG
  if (productIsSubproduct && parentProduct && !updatedParentIds.has(parentProduct.id)) {
    await tx.product.updateMany({
      where: { id: parentProduct.id, currentStock: previousStock },
      data: { currentStock: newStock },  // Uses FIRST subproduct's newStock only!
    });
    updatedParentIds.add(parentProduct.id);
  }
}
```

### Fix Strategy: Two-Pass Aggregation Pattern

**Pass 1: Aggregate consumption per parent**
Before the main loop, create a Map to track total consumption per parent:

```typescript
// PHASE 1: Aggregate total consumption per parent product
const parentConsumptionAggregates = new Map<string, {
  parentProduct: typeof products[0]['parentProduct'];
  totalConsumption: number;
  initialStock: number | null; // Will be set on first encounter
  subproductDetails: Array<{
    productName: string;
    quantity: number;
    unit: string;
    consumeQuantity: number;
  }>;
}>();

for (const item of freshOrder.items as any[]) {
  const product = productMap.get(item.productId);
  if (!product) {
    missingProducts.push(`${item.productName} (${item.sku})`);
    continue;
  }

  const productIsSubproduct = isSubproduct(product);
  if (productIsSubproduct && product.parentProduct) {
    const consumeQuantity = calculateParentConsumption(
      item.quantity, 
      product.estimatedLossPercentage ?? 0
    );
    
    const parentId = product.parentProduct.id;
    const existing = parentConsumptionAggregates.get(parentId);
    
    if (existing) {
      existing.totalConsumption += consumeQuantity;
      existing.subproductDetails.push({
        productName: product.name,
        quantity: item.quantity,
        unit: product.unit,
        consumeQuantity,
      });
    } else {
      parentConsumptionAggregates.set(parentId, {
        parentProduct: product.parentProduct,
        totalConsumption: consumeQuantity,
        initialStock: null, // Will be fetched in Phase 2
        subproductDetails: [{
          productName: product.name,
          quantity: item.quantity,
          unit: product.unit,
          consumeQuantity,
        }],
      });
    }
  }
}
```

**Pass 2: Fetch fresh parent stocks and validate**
```typescript
// PHASE 2: Fetch fresh parent stocks inside transaction
for (const [parentId, aggregate] of parentConsumptionAggregates) {
  const freshParent = await tx.product.findUnique({ 
    where: { id: parentId },
    select: { id: true, currentStock: true, name: true }
  });
  
  if (!freshParent) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Parent product ${aggregate.parentProduct?.name || parentId} not found`,
    });
  }
  
  aggregate.initialStock = freshParent.currentStock;
  
  // Validate total consumption against available stock
  const finalStock = freshParent.currentStock - aggregate.totalConsumption;
  if (finalStock < 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient stock for ${freshParent.name}. Available: ${freshParent.currentStock}, Required: ${aggregate.totalConsumption}`,
    });
  }
}
```

**Pass 3: Process items with batch consumption (no parent stock update in loop)**
```typescript
// PHASE 3: Process each item - consume batches only, defer parent stock update
for (const item of freshOrder.items as any[]) {
  const product = productMap.get(item.productId);
  if (!product) continue; // Already tracked in missingProducts

  const productIsSubproduct = isSubproduct(product);
  const parentProduct = productIsSubproduct ? product.parentProduct : null;

  const consumeFromProductId = parentProduct ? parentProduct.id : product.id;
  
  const consumeQuantity = productIsSubproduct
    ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
    : item.quantity;

  // For regular products, get fresh stock for validation
  if (!productIsSubproduct) {
    const freshProduct = await tx.product.findUnique({ 
      where: { id: product.id } 
    });
    if (!freshProduct) continue;
    
    const newStock = freshProduct.currentStock - consumeQuantity;
    if (newStock < 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient stock for ${product.name}. Available: ${freshProduct.currentStock}, Required: ${consumeQuantity}`,
      });
    }
  }

  // Get parent aggregate data for transaction notes
  const parentAggregate = parentProduct 
    ? parentConsumptionAggregates.get(parentProduct.id) 
    : null;
  
  const previousStock = productIsSubproduct && parentAggregate?.initialStock !== null
    ? parentAggregate.initialStock
    : (await tx.product.findUnique({ where: { id: consumeFromProductId } }))?.currentStock ?? 0;
    
  // Create inventory transaction
  const transactionNotes = productIsSubproduct
    ? `Subproduct packed: ${product.name} (${item.quantity}${product.unit}) for order ${freshOrder.orderNumber}`
    : `Stock consumed at packing for order ${freshOrder.orderNumber}`;

  const transaction = await tx.inventoryTransaction.create({
    data: {
      productId: consumeFromProductId,
      type: 'sale',
      quantity: -consumeQuantity,
      previousStock,
      newStock: previousStock - consumeQuantity, // Individual transaction shows individual change
      referenceType: 'order',
      referenceId: freshOrder.id,
      notes: transactionNotes,
      createdBy: ctx.userId || 'system',
    },
  });

  // Consume from batches
  try {
    const result = await consumeStock(
      consumeFromProductId,
      consumeQuantity,
      transaction.id,
      freshOrder.id,
      freshOrder.orderNumber,
      tx
    );

    if (result.expiryWarnings.length > 0) {
      console.warn(`Expiry warnings for order ${freshOrder.orderNumber}:`, result.expiryWarnings);
    }
  } catch (stockError) {
    console.error(`Stock consumption failed for order ${freshOrder.orderNumber}, product ${product.id}:`, stockError);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to consume stock for ${product.name}. Transaction rolled back.`,
    });
  }

  // For regular products (not subproducts), update stock immediately
  if (!productIsSubproduct) {
    const freshProduct = await tx.product.findUnique({ where: { id: product.id } });
    if (!freshProduct) continue;
    
    const newStock = freshProduct.currentStock - consumeQuantity;
    
    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    // Recalculate subproduct stocks if this is a parent
    const subproducts = await tx.product.findMany({
      where: { parentProductId: product.id },
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
}
```

**Pass 4: Update all parent products with aggregated consumption**
```typescript
// PHASE 4: Update parent products with TOTAL aggregated consumption
for (const [parentId, aggregate] of parentConsumptionAggregates) {
  if (aggregate.initialStock === null) continue;
  
  const finalParentStock = aggregate.initialStock - aggregate.totalConsumption;
  
  // Use atomic update with optimistic locking
  const parentUpdateResult = await tx.product.updateMany({
    where: { 
      id: parentId, 
      currentStock: aggregate.initialStock  // Optimistic lock
    },
    data: { currentStock: finalParentStock },
  });

  if (parentUpdateResult.count === 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Stock for ${aggregate.parentProduct?.name || parentId} modified concurrently. Please retry.`,
    });
  }

  // Recalculate all subproduct stocks from new parent stock
  const subproducts = await tx.product.findMany({
    where: { parentProductId: parentId },
    select: { id: true, parentProductId: true, estimatedLossPercentage: true },
  });

  if (subproducts.length > 0) {
    const updatedStocks = calculateAllSubproductStocks(finalParentStock, subproducts);
    for (const { id, newStock: subStock } of updatedStocks) {
      await tx.product.update({
        where: { id },
        data: { currentStock: subStock },
      });
    }
  }
}
```

### Resulting Behavior
- SubA (5kg) and SubB (3kg) from same parent are aggregated to 8kg total
- Parent stock goes 100 -> 92 in ONE atomic update
- All subproduct stocks are recalculated from 92
- Each subproduct's batch consumption is tracked separately in InventoryTransaction

---

## Issue #3: resetOrder Stuck State (HIGH)

### Problem Analysis
The `resetOrder` mutation allows resetting orders with 'ready_for_delivery' status without checking the `stockConsumed` flag. If an order is in 'ready_for_delivery' AND has `stockConsumed: true`, resetting it would create a stuck state where stock was consumed but the order is back to 'confirmed'.

### Current Problematic Code
**File:** `/packages/api/src/routers/packing.ts`
**Lines:** 1182-1188

```typescript
// Only allow resetting orders that are in 'packing', 'confirmed', or 'ready_for_delivery' status
if (!['packing', 'confirmed', 'ready_for_delivery'].includes(order.status)) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Only orders in packing, confirmed, or ready_for_delivery status can be reset',
  });
}
```

### Fix Strategy
Add an explicit check for `stockConsumed` before the status check, and remove 'ready_for_delivery' from allowed statuses:

```typescript
// CRITICAL: Cannot reset orders that have already consumed stock
// This would create a stuck state where stock is consumed but order is back to 'confirmed'
if (order.stockConsumed === true) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Cannot reset order that has already consumed stock. Use cancel to restore stock.',
  });
}

// Only allow resetting orders that are in 'packing' or 'confirmed' status
// 'ready_for_delivery' orders have stockConsumed=true and are blocked above
if (!['packing', 'confirmed'].includes(order.status)) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Only orders in packing or confirmed status can be reset',
  });
}
```

### Location for Changes
- **File:** `/packages/api/src/routers/packing.ts`
- **Insert after:** Line 1180 (after the order null check)
- **Modify:** Lines 1182-1188

---

## Issue #4: Multi-Subproduct Restoration Bug (HIGH)

### Problem Analysis
The `cancel` mutation's stock restoration logic in `/packages/api/src/routers/order.ts` (lines 1112-1258) has the same bug as Issue #2 - it uses `updatedParentIds` which causes only the first subproduct's stock to be restored to the parent.

### Current Problematic Code Pattern
Same pattern as Issue #2:
```typescript
const updatedParentIds = new Set<string>();

for (const item of currentOrder.items as any[]) {
  // ... calculate restoreQuantity ...
  
  // Create inventory transaction - runs for each item
  await tx.inventoryTransaction.create({ ... });
  
  // Create batch - runs for each item
  await tx.inventoryBatch.create({ ... });
  
  // Update parent stock - ONLY runs once - BUG
  if (productIsSubproduct && parentProduct && !updatedParentIds.has(parentProduct.id)) {
    await tx.product.update({
      where: { id: parentProduct.id },
      data: { currentStock: newStock },  // Uses FIRST subproduct's newStock only!
    });
    updatedParentIds.add(parentProduct.id);
  }
}
```

### Fix Strategy: Same Two-Pass Pattern as Issue #2

**Pass 1: Aggregate restoration amounts per parent**
```typescript
// PHASE 1: Aggregate total restoration per parent product
const parentRestorationAggregates = new Map<string, {
  parentProduct: typeof products[0]['parentProduct'];
  totalRestoration: number;
  subproductDetails: Array<{
    productName: string;
    quantity: number;
    unit: string;
    restoreQuantity: number;
  }>;
}>();

for (const item of currentOrder.items as any[]) {
  const product = productMap.get(item.productId);
  if (!product) continue;

  const productIsSubproduct = isSubproduct(product);
  if (productIsSubproduct && product.parentProduct) {
    const restoreQuantity = calculateParentConsumption(
      item.quantity, 
      product.estimatedLossPercentage ?? 0
    );
    
    const parentId = product.parentProduct.id;
    const existing = parentRestorationAggregates.get(parentId);
    
    if (existing) {
      existing.totalRestoration += restoreQuantity;
      existing.subproductDetails.push({
        productName: product.name,
        quantity: item.quantity,
        unit: product.unit,
        restoreQuantity,
      });
    } else {
      parentRestorationAggregates.set(parentId, {
        parentProduct: product.parentProduct,
        totalRestoration: restoreQuantity,
        subproductDetails: [{
          productName: product.name,
          quantity: item.quantity,
          unit: product.unit,
          restoreQuantity,
        }],
      });
    }
  }
}
```

**Pass 2: Process individual items (create transactions and batches)**
```typescript
// PHASE 2: Create individual inventory transactions and batches
for (const item of currentOrder.items as any[]) {
  const product = productMap.get(item.productId);
  if (!product) continue;

  const productIsSubproduct = isSubproduct(product);
  const parentProduct = productIsSubproduct ? product.parentProduct : null;
  const restoreToProductId = parentProduct ? parentProduct.id : product.id;

  const restoreQuantity = productIsSubproduct
    ? calculateParentConsumption(item.quantity, product.estimatedLossPercentage ?? 0)
    : item.quantity;

  // Get current stock for transaction record
  const restoreToProduct = await tx.product.findUnique({ 
    where: { id: restoreToProductId } 
  });
  if (!restoreToProduct) continue;

  const currentStock = restoreToProduct.currentStock;
  const transactionNewStock = currentStock + restoreQuantity; // Individual view

  const transactionNotes = productIsSubproduct
    ? `Subproduct stock restored: ${product.name} (${item.quantity}${product.unit}) from cancelled order ${currentOrder.orderNumber}`
    : `Stock restored from cancelled order ${currentOrder.orderNumber}`;

  await tx.inventoryTransaction.create({
    data: {
      productId: restoreToProductId,
      type: 'return',
      quantity: restoreQuantity,
      previousStock: currentStock,
      newStock: transactionNewStock,
      referenceType: 'order',
      referenceId: input.orderId,
      notes: transactionNotes,
      createdBy: ctx.userId,
    },
  });

  await tx.inventoryBatch.create({
    data: {
      productId: restoreToProductId,
      quantityRemaining: restoreQuantity,
      initialQuantity: restoreQuantity,
      costPerUnit: 0,
      receivedAt: new Date(),
      notes: `Stock returned from cancelled order ${currentOrder.orderNumber}`,
    },
  });

  // For regular products, update stock immediately
  if (!productIsSubproduct) {
    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: transactionNewStock },
    });

    // Recalculate subproduct stocks if this is a parent
    const subproducts = await tx.product.findMany({
      where: { parentProductId: product.id },
      select: { id: true, parentProductId: true, estimatedLossPercentage: true },
    });

    if (subproducts.length > 0) {
      const updatedStocks = calculateAllSubproductStocks(transactionNewStock, subproducts);
      for (const { id, newStock: subStock } of updatedStocks) {
        await tx.product.update({
          where: { id },
          data: { currentStock: subStock },
        });
      }
    }
  }
}
```

**Pass 3: Update parent products with aggregated restoration**
```typescript
// PHASE 3: Update parent products with TOTAL aggregated restoration
for (const [parentId, aggregate] of parentRestorationAggregates) {
  // Get current parent stock
  const parentProduct = await tx.product.findUnique({ 
    where: { id: parentId } 
  });
  if (!parentProduct) continue;

  const finalParentStock = parentProduct.currentStock + aggregate.totalRestoration;

  await tx.product.update({
    where: { id: parentId },
    data: { currentStock: finalParentStock },
  });

  // Recalculate all subproduct stocks
  const subproducts = await tx.product.findMany({
    where: { parentProductId: parentId },
    select: { id: true, parentProductId: true, estimatedLossPercentage: true },
  });

  if (subproducts.length > 0) {
    const updatedStocks = calculateAllSubproductStocks(finalParentStock, subproducts);
    for (const { id, newStock: subStock } of updatedStocks) {
      await tx.product.update({
        where: { id },
        data: { currentStock: subStock },
      });
    }
  }
}
```

---

## Issue #5: Stock Validation Outside Transaction (MEDIUM)

### Problem Analysis
In `updateItemQuantity` mutation (`/packages/api/src/routers/packing.ts`), the stock validation (lines 395-418) happens outside the transaction, creating a TOCTOU (Time-of-Check-Time-of-Use) race condition.

### Current Problematic Code
```typescript
// Lines 395-410: OUTSIDE transaction
const product = await prisma.product.findUnique({
  where: { id: productId },
  select: { id: true, currentStock: true, name: true },
});

if (!product) { throw ... }

// Lines 412-418: Stock validation OUTSIDE transaction
if (quantityDiff > 0 && product.currentStock < quantityDiff) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Insufficient stock. Only ${product.currentStock} ${item.unit} available.`,
  });
}

// Line 454: Transaction starts
await prisma.$transaction(async (tx) => {
  // ... stock might have changed by now!
});
```

### Fix Strategy
Move the product fetch and stock validation INSIDE the transaction:

```typescript
// Remove lines 395-418 entirely (product fetch and validation outside tx)

// Line 454 onwards - move validation inside transaction
await prisma.$transaction(async (tx) => {
  // Fetch product INSIDE transaction with fresh data
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { id: true, currentStock: true, name: true },
  });

  if (!product) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Product not found',
    });
  }

  // Validate stock availability with transaction-consistent data
  if (quantityDiff > 0 && product.currentStock < quantityDiff) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient stock. Only ${product.currentStock} ${item.unit} available.`,
    });
  }

  // Calculate new stock with fresh data
  const newStock = product.currentStock - quantityDiff;

  // Re-check stockConsumed inside transaction (keep existing code)
  const freshOrder = await tx.order.findUnique({
    where: { id: orderId },
    select: { stockConsumed: true, status: true },
  });
  // ... rest of transaction logic
});
```

### Note on Existing Code
The transaction already has checks for `stockConsumed` (lines 456-466), so we just need to move the product fetch and stock validation to join it.

---

## Issue #6: Inconsistent Audit Trail (MEDIUM)

### Problem Analysis
This issue is auto-fixed by Issue #2. When we aggregate consumption and create a single accurate update, the InventoryTransaction records will accurately reflect:
1. Each individual subproduct's consumption (separate transactions per item)
2. The correct final stock values

### No Additional Code Changes Required
Issue #2's implementation ensures:
- Each subproduct gets its own InventoryTransaction with correct `previousStock` and `newStock`
- Parent product stock is updated once with the correct aggregate amount
- Audit trail shows the full picture of what was consumed

---

## Implementation Order and Dependencies

```
Issue #1 (Reorder) ─────────────────────────────────────────────────────────►
     │                                                                        
     │  Issue #2 (markOrderReady aggregation) ─────────────────────────────►  
     │       │                                                                
     │       │  Issue #3 (resetOrder guard) ──────────────────────────────►  
     │       │       │                                                        
     │       │       │  Issue #4 (cancel aggregation) ────────────────────►  
     │       │       │       │                                                
     │       │       │       │  Issue #5 (updateItemQuantity tx) ─────────►  
     │       │       │       │       │                                        
     │       │       │       │       │  Issue #6 (auto-fixed by #2) ──────►  
```

### Recommended Implementation Sequence

1. **Issue #1** (5 minutes) - Simple deletion, no dependencies
2. **Issue #2** (30 minutes) - Core fix, enables #6
3. **Issue #3** (5 minutes) - Simple guard addition
4. **Issue #4** (20 minutes) - Same pattern as #2
5. **Issue #5** (10 minutes) - Code reorganization
6. **Issue #6** - No code needed, verified by tests

---

## Edge Cases to Handle

### Issue #2 Edge Cases
1. **Order with zero subproducts from parents** - Regular products handled separately
2. **Order with mixed regular and subproducts** - Aggregation only applies to subproducts
3. **Parent product deleted between order and packing** - Already handled by existing null checks
4. **Concurrent packing of same order** - Existing optimistic locking handles this
5. **Single subproduct from parent** - Aggregation map has one entry, works correctly

### Issue #4 Edge Cases
1. **Partial cancellation** - Not supported; full order cancellation only
2. **Already cancelled order** - Status check prevents re-cancellation
3. **Order without stockConsumed** - `shouldRestoreStock` guard prevents restoration

### Issue #5 Edge Cases
1. **Product deleted between fetch and transaction** - Handled by null check inside tx
2. **Stock changes between validation and update** - Prevented by transaction isolation

---

## Testing Strategy

### Unit Tests
1. Test aggregation logic with multiple subproducts from same parent
2. Test aggregation with mixed regular and subproduct orders
3. Test resetOrder rejection when stockConsumed is true

### Integration Tests
1. Create order with 2 subproducts from same parent, mark ready, verify parent stock
2. Cancel order with 2 subproducts, verify restoration amount
3. Attempt to reset ready_for_delivery order, verify rejection
4. Concurrent updateItemQuantity calls, verify no race condition

### Manual Testing Checklist
- [ ] Reorder creates order without consuming stock
- [ ] markOrderReady with multi-subproduct order updates parent correctly
- [ ] Cancel with multi-subproduct order restores parent correctly
- [ ] resetOrder fails for stockConsumed orders
- [ ] updateItemQuantity race condition is prevented

---

## Critical Files for Implementation

| File | Purpose |
|------|---------|
| `/packages/api/src/routers/order.ts` | Issues #1 and #4 - reorder deletion, cancel aggregation |
| `/packages/api/src/routers/packing.ts` | Issues #2, #3, #5 - markOrderReady, resetOrder, updateItemQuantity |
| `/packages/shared/src/utils/subproduct.ts` | Reference - helper functions used in fixes |
| `/packages/api/src/services/inventory-batch.ts` | Reference - consumeStock function signature |
