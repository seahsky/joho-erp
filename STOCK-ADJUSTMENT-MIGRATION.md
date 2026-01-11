# Stock Adjustment Migration: Products → Inventory Page

> **Status**: Ready for Implementation
> **Date**: 2026-01-11
> **Scope Decision**: Keep stock adjustment on BOTH pages (shared component approach)

---

## Executive Summary

This document outlines the plan to add stock count adjustment functionality to the Inventory page while maintaining the existing functionality on the Products page. The implementation uses a shared component approach following DRY principles.

### Key Benefits
- ✅ Inventory managers can adjust stock without leaving inventory page
- ✅ Product managers retain stock adjustment capability on products page
- ✅ No code duplication - single shared component
- ✅ Improved workflow for stocktakes and receiving processes
- ✅ Better role-based access with `inventory:adjust` permission

---

## Implementation Strategy

### Phase 1: Move & Share Stock Adjustment Component
**Component**: `StockAdjustmentDialog.tsx`

**Migration Path**:
- **From**: `/apps/admin-portal/app/[locale]/(app)/products/components/StockAdjustmentDialog.tsx`
- **To**: `/apps/admin-portal/app/[locale]/(app)/inventory/components/StockAdjustmentDialog.tsx`

**Rationale**:
- Inventory page is the primary home for stock operations
- Products page will import from inventory (shared component)
- Follows single source of truth principle

### Phase 2: Create Product Selection UI
**New Component**: `ProductSelector.tsx`

**Location**: `/apps/admin-portal/app/[locale]/(app)/inventory/components/ProductSelector.tsx`

**Features**:
- Search by product name or SKU (debounced 300ms)
- Category filter dropdown
- Current stock display with color-coded badges (StockLevelBadge)
- Select button per product
- Loading states with skeleton
- Empty state for no results
- Mobile-responsive (full-screen on small screens)

**Props Interface**:
```typescript
interface ProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product) => void;
}
```

**API Integration**:
- Uses `api.product.list.useQuery()` with filters
- Debounced search to reduce API calls
- Supports pagination if needed

### Phase 3: Integrate into Inventory Page
**File**: `/apps/admin-portal/app/[locale]/(app)/inventory/page.tsx`

#### Two Access Methods:

**1. Primary Button** - Top of Transaction History Card
- "Adjust Stock" button with Plus icon
- Opens ProductSelector first
- User searches/selects product
- Opens StockAdjustmentDialog with selected product
- Text label hidden on mobile to save space

**2. Quick Action** - Transaction Row Quick Access
- PackagePlus icon button on each transaction row
- Directly opens StockAdjustmentDialog for that product
- Pre-fills product context from transaction data
- Hidden on mobile (space constraints)

#### State Management:
```typescript
const [showProductSelector, setShowProductSelector] = useState(false);
const [showStockDialog, setShowStockDialog] = useState(false);
const [selectedProduct, setSelectedProduct] = useState<{
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
} | null>(null);
```

#### Event Handlers:
```typescript
// Handle product selection from ProductSelector
const handleProductSelected = (product: any) => {
  setSelectedProduct({
    id: product.id,
    name: product.name,
    sku: product.sku,
    currentStock: product.currentStock,
    unit: product.unit,
  });
  setShowProductSelector(false);
  setShowStockDialog(true);
};

// Handle successful stock adjustment
const handleStockAdjustSuccess = () => {
  refetchTransactions(); // Refresh to show new transaction
  setSelectedProduct(null);
};

// Handle quick adjust from transaction row
const handleQuickAdjust = (productData: any) => {
  setSelectedProduct({
    id: productData.productId,
    name: productData.productName,
    sku: productData.productSku,
    currentStock: productData.newStock,
    unit: productData.productUnit,
  });
  setShowStockDialog(true);
};
```

### Phase 4: Update Products Page Import
**File**: `/apps/admin-portal/app/[locale]/(app)/products/page.tsx`

**Change** (line 31):
```typescript
// OLD:
import { StockAdjustmentDialog } from './components/StockAdjustmentDialog';

// NEW:
import { StockAdjustmentDialog } from '../inventory/components/StockAdjustmentDialog';
```

**No other changes** - maintains existing functionality

### Phase 5: API Permission Update
**File**: `/packages/api/src/routers/product.ts` (line 429)

**Change**: Accept both permissions for flexibility
```typescript
// BEFORE
adjustStock: requirePermission('products:adjust_stock')

// AFTER
adjustStock: requirePermission(['products:adjust_stock', 'inventory:adjust'])
```

**Rationale**:
- Allows both product managers and inventory managers
- Backward compatible with existing permissions
- Granular role-based access control

### Phase 6: Internationalization
**Files to Update** (admin-portal only, customer-portal doesn't need inventory translations):
- `/apps/admin-portal/messages/en.json`
- `/apps/admin-portal/messages/zh-CN.json`
- `/apps/admin-portal/messages/zh-TW.json`

**Add to `inventory` namespace**:

**English**:
```json
"inventory": {
  "adjustStock": "Adjust Stock",
  "productSelector": {
    "title": "Select Product to Adjust",
    "description": "Search and select a product to adjust stock levels",
    "searchPlaceholder": "Search by product name or SKU...",
    "selectButton": "Select",
    "noProducts": "No products found",
    "currentStock": "Current Stock"
  }
}
```

**Chinese Simplified**:
```json
"inventory": {
  "adjustStock": "调整库存",
  "productSelector": {
    "title": "选择要调整的产品",
    "description": "搜索并选择要调整库存的产品",
    "searchPlaceholder": "按产品名称或SKU搜索...",
    "selectButton": "选择",
    "noProducts": "未找到产品",
    "currentStock": "当前库存"
  }
}
```

**Chinese Traditional**:
```json
"inventory": {
  "adjustStock": "調整庫存",
  "productSelector": {
    "title": "選擇要調整的產品",
    "description": "搜尋並選擇要調整庫存的產品",
    "searchPlaceholder": "按產品名稱或SKU搜尋...",
    "selectButton": "選擇",
    "noProducts": "未找到產品",
    "currentStock": "當前庫存"
  }
}
```

---

## Critical Files Summary

### Files to Modify (4 files)
1. `/apps/admin-portal/app/[locale]/(app)/inventory/page.tsx`
   - Add imports, state, handlers, UI buttons, and dialogs

2. `/apps/admin-portal/app/[locale]/(app)/products/page.tsx`
   - Update import path on line 31

3. `/packages/api/src/routers/product.ts`
   - Update permission on line 429

4. **Language files (3 files)**:
   - `/apps/admin-portal/messages/en.json`
   - `/apps/admin-portal/messages/zh-CN.json`
   - `/apps/admin-portal/messages/zh-TW.json`

### Files to Move (1 file)
`/apps/admin-portal/app/[locale]/(app)/products/components/StockAdjustmentDialog.tsx`
→
`/apps/admin-portal/app/[locale]/(app)/inventory/components/StockAdjustmentDialog.tsx`

### Files to Create (2 files)
1. `/apps/admin-portal/app/[locale]/(app)/inventory/components/ProductSelector.tsx`
   - New dialog for selecting products before adjustment

2. `/apps/admin-portal/app/[locale]/(app)/inventory/components/index.ts`
   - Component exports file

---

## Detailed Implementation Guide

### 1. Inventory Page Updates

**File**: `/apps/admin-portal/app/[locale]/(app)/inventory/page.tsx`

#### Step 1.1: Add Imports (after existing imports)
```typescript
import { StockAdjustmentDialog, ProductSelector } from './components';
import { PermissionGate } from '@/components/permission-gate';
import { Plus, PackagePlus } from 'lucide-react';
```

#### Step 1.2: Add State (after line 54)
```typescript
const [showProductSelector, setShowProductSelector] = useState(false);
const [showStockDialog, setShowStockDialog] = useState(false);
const [selectedProduct, setSelectedProduct] = useState<{
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
} | null>(null);
```

#### Step 1.3: Add Event Handlers
```typescript
const handleProductSelected = (product: any) => {
  setSelectedProduct({
    id: product.id,
    name: product.name,
    sku: product.sku,
    currentStock: product.currentStock,
    unit: product.unit,
  });
  setShowProductSelector(false);
  setShowStockDialog(true);
};

const handleStockAdjustSuccess = () => {
  refetchTransactions();
  setSelectedProduct(null);
};

const handleQuickAdjust = (productData: any) => {
  setSelectedProduct({
    id: productData.productId,
    name: productData.productName,
    sku: productData.productSku,
    currentStock: productData.newStock,
    unit: productData.productUnit,
  });
  setShowStockDialog(true);
};
```

#### Step 1.4: Update Transaction History Header (line ~235)
Find the section with RefreshCw button and replace with:
```typescript
<div className="flex items-center gap-2">
  <PermissionGate permission="inventory:adjust">
    <Button
      variant="default"
      size="sm"
      onClick={() => setShowProductSelector(true)}
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">{t('adjustStock')}</span>
    </Button>
  </PermissionGate>
  <Button variant="ghost" size="sm" onClick={() => refetchTransactions()}>
    <RefreshCw className="h-4 w-4" />
  </Button>
</div>
```

#### Step 1.5: Add Quick Action to Transaction Rows (line ~290)
In the transaction map, update the right column to include quick action button:
```typescript
<div className="flex items-start justify-end gap-2">
  <div className="text-right">
    {/* Existing quantity display */}
    <div className="flex items-center justify-end gap-2">
      <span
        className={cn(
          'font-medium',
          tx.quantity >= 0 ? 'text-green-600' : 'text-red-600'
        )}
      >
        {tx.quantity >= 0 ? '+' : ''}
        {tx.quantity} {tx.productUnit}
      </span>
    </div>
    {/* Existing stock change display */}
    <Small className="text-muted-foreground">
      {tx.previousStock} → {tx.newStock}
    </Small>
    {/* Existing date display */}
    <Small className="text-muted-foreground">
      {format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm')}
    </Small>
  </div>

  {/* NEW: Quick adjust button */}
  <PermissionGate permission="inventory:adjust">
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hidden sm:flex shrink-0"
      onClick={() => handleQuickAdjust(tx)}
      title={t('adjustStock')}
    >
      <PackagePlus className="h-4 w-4" />
    </Button>
  </PermissionGate>
</div>
```

#### Step 1.6: Add Dialogs (before closing div, after line ~361)
```typescript
{/* Stock Adjustment Dialogs */}
<ProductSelector
  open={showProductSelector}
  onOpenChange={setShowProductSelector}
  onSelectProduct={handleProductSelected}
/>

<StockAdjustmentDialog
  open={showStockDialog}
  onOpenChange={(open) => {
    setShowStockDialog(open);
    if (!open) setSelectedProduct(null);
  }}
  product={selectedProduct}
  onSuccess={handleStockAdjustSuccess}
/>
```

### 2. ProductSelector Component

**File**: `/apps/admin-portal/app/[locale]/(app)/inventory/components/ProductSelector.tsx`

**Full Implementation Template**:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  EmptyState,
  StockLevelBadge,
  Card,
  CardContent,
} from '@joho-erp/ui';
import { Search, Package } from 'lucide-react';
import { api } from '@/trpc/client';

interface ProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: any) => void;
}

export function ProductSelector({
  open,
  onOpenChange,
  onSelectProduct,
}: ProductSelectorProps) {
  const t = useTranslations('inventory.productSelector');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products with search filter
  const { data: products, isLoading } = api.product.list.useQuery(
    {
      search: debouncedSearch,
      status: 'active',
      limit: 50,
    },
    { enabled: open }
  );

  const handleSelect = (product: any) => {
    onSelectProduct(product);
    setSearch(''); // Reset search on select
  };

  const handleClose = () => {
    setSearch(''); // Reset search on close
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Product List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : products && products.items.length > 0 ? (
            products.items.map((product) => (
              <Card key={product.id} className="hover:bg-accent transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        SKU: {product.sku}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {t('currentStock')}
                        </div>
                        <StockLevelBadge
                          currentStock={product.currentStock}
                          lowStockThreshold={product.lowStockThreshold}
                          unit={product.unit}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelect(product)}
                      >
                        {t('selectButton')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={Package}
              title={t('noProducts')}
              className="py-8"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Component Index File

**File**: `/apps/admin-portal/app/[locale]/(app)/inventory/components/index.ts`

```typescript
export { StockAdjustmentDialog } from './StockAdjustmentDialog';
export { ProductSelector } from './ProductSelector';
export { StockMovementChart } from './StockMovementChart';
export { InventoryValueChart } from './InventoryValueChart';
export { ProductTurnoverTable } from './ProductTurnoverTable';
export { ComparisonAnalytics } from './ComparisonAnalytics';
export { TimePeriodSelector } from './TimePeriodSelector';
```

---

## Testing & Verification

### Build & Type Check
```bash
# Full production build
pnpm build

# TypeScript type checking
pnpm type-check
```

### Manual Testing Checklist

#### Inventory Page Tests
- [ ] Click "Adjust Stock" button → ProductSelector dialog opens
- [ ] Search for product by name → results filter correctly
- [ ] Search for product by SKU → results filter correctly
- [ ] Select product from list → StockAdjustmentDialog opens with correct product
- [ ] Complete stock adjustment → Success toast appears
- [ ] After adjustment → Transaction history refreshes automatically
- [ ] Click quick adjust icon on transaction row → StockAdjustmentDialog opens
- [ ] Quick adjust pre-fills correct product data

#### Products Page Tests (Regression)
- [ ] Stock adjustment button still visible on products page
- [ ] Click "Adjust Stock" → StockAdjustmentDialog opens
- [ ] Complete adjustment → Works as before
- [ ] No visual or functional changes to products page

#### Permission Tests
- [ ] User with `inventory:adjust` permission → Can access on inventory page
- [ ] User with `products:adjust_stock` permission → Can access on products page
- [ ] User without either permission → Buttons hidden via PermissionGate

#### i18n Tests
- [ ] Switch to English → All text displays correctly
- [ ] Switch to Chinese Simplified → All text displays correctly
- [ ] Switch to Chinese Traditional → All text displays correctly

#### Mobile Responsive Tests
- [ ] Inventory page on mobile → "Adjust Stock" text hidden, icon visible
- [ ] ProductSelector on mobile → Full-screen dialog
- [ ] Quick adjust buttons hidden on mobile (space saving)
- [ ] All dialogs properly sized on mobile

### Edge Case Testing
- [ ] Adjust stock for product with zero stock → Works correctly
- [ ] Enter negative quantity → Validation prevents negative stock
- [ ] Search with no results → Empty state displays properly
- [ ] Network error during adjustment → Error toast shows
- [ ] Close ProductSelector without selecting → State resets
- [ ] Close StockAdjustmentDialog with unsaved changes → Confirmation or reset
- [ ] Rapid clicking "Adjust Stock" button → No duplicate dialogs

---

## Rollback Plan

If critical issues arise during or after deployment:

### Immediate Rollback Steps
1. **Revert products page import**:
   ```typescript
   // Change back to:
   import { StockAdjustmentDialog } from './components/StockAdjustmentDialog';
   ```

2. **Copy component back to products**:
   ```bash
   cp apps/admin-portal/app/[locale]/(app)/inventory/components/StockAdjustmentDialog.tsx \
      apps/admin-portal/app/[locale]/(app)/products/components/
   ```

3. **Remove inventory page additions**:
   - Remove ProductSelector import and component
   - Remove stock adjustment state
   - Remove "Adjust Stock" button
   - Remove quick action buttons
   - Remove dialog components at bottom

4. **API permission change**:
   - Can remain as-is (backward compatible)
   - Or revert to single permission if needed

### Validation After Rollback
- Run `pnpm build` to ensure no errors
- Test products page stock adjustment works
- Verify no broken imports or missing components

---

## Success Criteria

### Functional Requirements
- ✅ Stock adjustment accessible from inventory page Transaction History
- ✅ ProductSelector allows searching and filtering products
- ✅ Quick adjust from transaction rows works correctly
- ✅ Transaction history refreshes after successful adjustment
- ✅ Products page functionality unchanged (regression test passes)

### Technical Requirements
- ✅ Zero build errors (`pnpm build` succeeds)
- ✅ Zero type errors (`pnpm type-check` passes)
- ✅ All components properly typed with TypeScript
- ✅ No duplicate code (DRY principle maintained)

### Internationalization
- ✅ All user-facing text translated in 3 languages
- ✅ Translation keys follow project conventions
- ✅ Language switching works for all new text

### Permission & Security
- ✅ `inventory:adjust` permission properly gates inventory page features
- ✅ `products:adjust_stock` permission still works on products page
- ✅ API accepts both permissions (backward compatible)
- ✅ PermissionGate components used consistently

### UX & Design
- ✅ Mobile-responsive design on all screen sizes
- ✅ Consistent with existing design patterns
- ✅ Loading states for async operations
- ✅ Empty states for no results
- ✅ Error handling with user-friendly messages
- ✅ Quick action buttons improve efficiency

---

## Timeline & Migration Strategy

### Phase-by-Phase Deployment

**Phase 1**: Preparation (No user impact)
- Update API permission to accept both permissions
- Deploy to production (backward compatible)

**Phase 2**: Component Creation (No user impact)
- Move StockAdjustmentDialog to inventory/components/
- Create ProductSelector component
- Update products page import
- Deploy to production (products page works as before)

**Phase 3**: Inventory Page Integration (New feature)
- Add stock adjustment to inventory page
- Add translations
- Deploy to production (new functionality available)

**Phase 4**: Validation & Monitoring
- Monitor for errors in production logs
- Gather user feedback
- Performance monitoring

### Deployment Checklist
- [ ] Run all tests in development environment
- [ ] Create backup of current production code
- [ ] Deploy Phase 1 (API update)
- [ ] Verify products page still works
- [ ] Deploy Phase 2 (component migration)
- [ ] Verify products page still works
- [ ] Deploy Phase 3 (inventory integration)
- [ ] Verify both pages work correctly
- [ ] Monitor production for 24 hours
- [ ] Gather initial user feedback

---

## Additional Notes

### Why Keep on Both Pages?
Different user personas have different workflows:

**Product Managers**:
- Focus on product data (pricing, descriptions, categories)
- Adjust stock when receiving new products
- Quick adjustments while managing catalog
- Natural to have adjustment where they work

**Inventory Managers**:
- Focus on stock levels and movements
- Perform regular stocktakes
- Process receiving and adjustments in bulk
- Need adjustment capability in inventory context

### Performance Considerations
- ProductSelector uses debounced search (300ms) to reduce API calls
- Limited to 50 products initially (pagination can be added later)
- Transaction history already paginated
- No performance impact expected on existing features

### Future Enhancements (Out of Scope)
- Bulk stock adjustments (select multiple products)
- Import stock adjustments from CSV
- Barcode scanner integration for quick selection
- Stock adjustment templates for common scenarios
- Advanced filtering (category, supplier, stock status)

---

## Contact & Support

**Documentation Owner**: Development Team
**Last Updated**: 2026-01-11
**Status**: Ready for Implementation

For questions or issues during implementation, refer to:
- PRD: `joho-foods-erp-prd.md`
- FSD: `joho-foods-erp-fsd.md`
- Project Guidelines: `CLAUDE.md`
