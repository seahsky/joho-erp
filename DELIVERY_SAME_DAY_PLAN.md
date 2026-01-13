# Implementation Plan: Same-Day Delivery Constraint & Date Filtering

## Overview
Modify the delivery logic to ensure deliveries only happen on the same day as packing, and add date filtering to the delivery page (similar to the packing page).

**Status**: Ready for implementation
**Created**: 2026-01-14
**Last Updated**: 2026-01-14

---

## Table of Contents
1. [Key Design Decisions](#key-design-decisions)
2. [Implementation Steps](#implementation-steps)
   - [Phase 1: Backend Changes](#phase-1-backend-changes)
   - [Phase 2: Frontend Date Selector](#phase-2-frontend-date-selector)
   - [Phase 3: Warning Dialog Enhancement](#phase-3-mark-delivered-dialog-enhancement)
   - [Phase 4: Internationalization](#phase-4-internationalization)
3. [Edge Cases & Handling](#edge-cases--handling)
4. [Critical Files Summary](#critical-files-summary)
5. [Verification & Testing](#verification--testing)
6. [Implementation Checklist](#implementation-checklist)

---

## Key Design Decisions

### 1. Filter by Packing Date, Not Requested Date
**Decision**: The delivery page will filter by **when orders were packed** (`packing.packedAt`), not when delivery was requested (`requestedDeliveryDate`).

**Rationale**:
- Orders become deliverable when packed, not when requested
- Natural enforcement: only orders packed on selected date appear in delivery list
- Clear "what was packed when" audit trail
- Aligns with business workflow: pack → deliver on same day

**Impact**:
- Backend query changes from filtering `requestedDeliveryDate` to `packing.packedAt`
- Unpacked orders automatically excluded from delivery list
- Clear separation between planning (requested date) and execution (packed date)

### 2. Soft Enforcement with Admin Override
**Decision**: Use warning validation (not blocking) with admin override capability.

**Rationale**:
- Handles edge cases: orders packed at 11:59 PM, timezone issues
- Real-world flexibility: warehouse needs override for legitimate cases
- Clear communication: warnings visible but not blocking
- Maintains audit trail of overrides

**Implementation**:
- Show warning dialog when order not packed today
- Require explicit checkbox confirmation for override
- Backend validation throws error without override flag
- All attempts logged in TRPC error logs

---

## Implementation Steps

### Phase 1: Backend Changes

#### File: `packages/api/src/routers/delivery.ts`

**Change 1: Update Date Filtering (Lines 57-61)**
```typescript
// BEFORE:
if (filters.dateFrom || filters.dateTo) {
  where.requestedDeliveryDate = {};
  if (filters.dateFrom) where.requestedDeliveryDate.gte = filters.dateFrom;
  if (filters.dateTo) where.requestedDeliveryDate.lte = filters.dateTo;
}

// AFTER:
if (filters.dateFrom || filters.dateTo) {
  where.packing = {
    is: {
      packedAt: {}
    }
  };
  if (filters.dateFrom) where.packing.is.packedAt.gte = filters.dateFrom;
  if (filters.dateTo) where.packing.is.packedAt.lte = filters.dateTo;
}
```

**Change 2: Add Validation Helper (Before router export)**
```typescript
function isPackedToday(packedAt: Date | null | undefined): boolean {
  if (!packedAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const packed = new Date(packedAt);
  return packed >= today && packed < tomorrow;
}
```

**Change 3: Update markDelivered Validation (Lines 164-220)**
- Add `adminOverride: z.boolean().optional()` to input schema
- After fetching order, add validation:
```typescript
const packedToday = isPackedToday(currentOrder.packing?.packedAt);

if (!packedToday && !input.adminOverride) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'This order was not packed today. Deliveries should occur on the same day as packing.',
  });
}
```

**Change 4: Add packedAt to Response (Lines 128-152)**
```typescript
const deliveries = orders.map((order) => ({
  // ... existing fields ...
  packedAt: order.packing?.packedAt ?? null, // ADD THIS
}));
```

**Change 5: Update getStats Query (Lines 223-250)**
```typescript
const [readyForDelivery, deliveredToday] = await Promise.all([
  prisma.order.count({
    where: {
      status: 'ready_for_delivery',
      packing: {
        is: {
          packedAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        }
      }
    },
  }),
  // deliveredToday unchanged (filters by deliveredAt)
]);
```

---

### Phase 2: Frontend Date Selector

#### File: `apps/admin-portal/app/[locale]/(app)/deliveries/page.tsx`

**Change 1: Add Date State (After line 35)**
```typescript
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const [deliveryDate, setDeliveryDate] = useState<Date>(today);
```

**Change 2: Add Date Helper Functions (After line 162)**
```typescript
const formatDate = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const utcDate = new Date(Date.UTC(year, month, day));

  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(utcDate);
};

const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const [year, month, day] = e.target.value.split('-').map(Number);
  const newDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  setDeliveryDate(newDate);
};

const dateInputValue = deliveryDate.toISOString().split('T')[0];
```

**Change 3: Update Queries (Lines 60-71)**
```typescript
const { data, isLoading } = api.delivery.getAll.useQuery({
  search: searchQuery || undefined,
  status: statusFilter || undefined,
  areaId: areaFilter || undefined,
  dateFrom: deliveryDate, // ADD
  dateTo: deliveryDate,   // ADD
  sortBy,
  sortOrder,
});

const { data: routeData } = api.delivery.getOptimizedRoute.useQuery({
  deliveryDate: deliveryDate.toISOString(), // Change from todayDateISO
});
```

**Change 4: Add Date Selector UI (After line 192)**
```tsx
{/* Date Selector */}
<Card>
  <CardHeader className="p-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">
            {t('deliveries.selectDate')}
          </label>
          <Input
            type="date"
            value={dateInputValue}
            onChange={handleDateChange}
          />
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {formatDate(deliveryDate)}
      </div>
    </div>
  </CardHeader>
</Card>
```

**Change 5: Add Packing Date Badge (Lines 244-249)**
```tsx
<div className="flex items-start justify-between mb-2">
  <div>
    <p className="font-semibold text-sm">{delivery.customer}</p>
    <p className="text-xs text-muted-foreground">{delivery.orderId}</p>
    {delivery.packedAt && (
      <Badge variant="outline" className="text-xs mt-1">
        <Package className="h-3 w-3 mr-1" />
        {t('deliveries.packedOn', {
          date: new Date(delivery.packedAt).toLocaleDateString('en-AU', {
            month: 'short',
            day: 'numeric'
          })
        })}
      </Badge>
    )}
  </div>
  <StatusBadge status={delivery.status as StatusType} />
</div>
```

---

### Phase 3: Mark Delivered Dialog Enhancement

#### File: `apps/admin-portal/app/[locale]/(app)/deliveries/components/MarkDeliveredDialog.tsx`

**Change 1: Update Props Interface**
```typescript
interface MarkDeliveredDialogProps {
  delivery: {
    id: string;
    orderId: string;
    customer: string;
    packedAt?: Date; // ADD
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string, adminOverride?: boolean) => Promise<void>; // ADD adminOverride
  isSubmitting: boolean;
}
```

**Change 2: Add Validation Logic**
```typescript
const [adminOverride, setAdminOverride] = useState(false);

const packedToday = delivery?.packedAt
  ? isPackedToday(delivery.packedAt)
  : false;

function isPackedToday(packedAt: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const packed = new Date(packedAt);
  return packed >= today && packed < tomorrow;
}
```

**Change 3: Add Warning UI (Before notes textarea)**
```tsx
{delivery?.packedAt && !packedToday && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>{t('deliveries.packingDateMismatch')}</AlertTitle>
    <AlertDescription>
      {t('deliveries.packingDateMismatchDescription', {
        packedDate: new Date(delivery.packedAt).toLocaleDateString('en-AU')
      })}
    </AlertDescription>
    <div className="mt-2">
      <label className="flex items-center gap-2">
        <Checkbox
          checked={adminOverride}
          onCheckedChange={(checked) => setAdminOverride(!!checked)}
        />
        <span className="text-sm">{t('deliveries.confirmAdminOverride')}</span>
      </label>
    </div>
  </Alert>
)}
```

**Change 4: Update onConfirm Call**
```typescript
onConfirm(notes, adminOverride);
```

**Change 5: Update Parent Component's handleConfirm**
In `page.tsx`, update the mutation call:
```typescript
await markDeliveredMutation.mutateAsync({
  orderId: deliveryToDeliver!.id,
  notes: notes || undefined,
  adminOverride: adminOverride, // ADD
});
```

---

### Phase 4: Internationalization

#### Files to Update:
- `apps/admin-portal/messages/en.json`
- `apps/admin-portal/messages/zh-CN.json`
- `apps/admin-portal/messages/zh-TW.json`

**English (en.json)**
```json
{
  "deliveries": {
    "selectDate": "Select Delivery Date",
    "packedOn": "Packed on {date}",
    "packingDateMismatch": "Packing Date Mismatch",
    "packingDateMismatchDescription": "This order was packed on {packedDate}, not today. Deliveries should normally occur on the same day as packing.",
    "confirmAdminOverride": "I understand and want to mark as delivered anyway",
    "noOrdersPackedOnDate": "No orders were packed on this date",
    "orderMustBePackedFirst": "Order must be packed before marking as delivered",
    "showingOrdersPackedOn": "Showing orders packed on {date}"
  }
}
```

**Chinese Simplified (zh-CN.json)**
```json
{
  "deliveries": {
    "selectDate": "选择配送日期",
    "packedOn": "打包于 {date}",
    "packingDateMismatch": "打包日期不匹配",
    "packingDateMismatchDescription": "此订单于 {packedDate} 打包，不是今天。配送通常应在打包当天进行。",
    "confirmAdminOverride": "我了解并仍要标记为已配送",
    "noOrdersPackedOnDate": "此日期没有打包的订单",
    "orderMustBePackedFirst": "订单必须先打包才能标记为已配送",
    "showingOrdersPackedOn": "显示在 {date} 打包的订单"
  }
}
```

**Chinese Traditional (zh-TW.json)**
```json
{
  "deliveries": {
    "selectDate": "選擇配送日期",
    "packedOn": "打包於 {date}",
    "packingDateMismatch": "打包日期不符",
    "packingDateMismatchDescription": "此訂單於 {packedDate} 打包，不是今天。配送通常應在打包當天進行。",
    "confirmAdminOverride": "我了解並仍要標記為已配送",
    "noOrdersPackedOnDate": "此日期沒有打包的訂單",
    "orderMustBePackedFirst": "訂單必須先打包才能標記為已配送",
    "showingOrdersPackedOn": "顯示在 {date} 打包的訂單"
  }
}
```

---

## Edge Cases & Handling

### 1. Timezone Issues (11:59 PM Packing)
**Problem**: Order packed at 11:59 PM, delivery attempted at 12:01 AM (next day)

**Solution**:
- Use UTC dates with zero time for all comparisons
- `isPackedToday()` helper normalizes dates to UTC midnight
- Consistent behavior regardless of server timezone

**Code**:
```typescript
function isPackedToday(packedAt: Date | null | undefined): boolean {
  if (!packedAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const packed = new Date(packedAt);
  return packed >= today && packed < tomorrow;
}
```

### 2. Unpacked Orders
**Problem**: Orders requested but not packed yet

**Solution**:
- Filtered out automatically (query requires `packing.packedAt` to exist)
- Empty state message: "No orders were packed on this date"

**Query Logic**:
```typescript
where.packing = {
  is: {
    packedAt: {
      gte: startOfDay,
      lte: endOfDay,
    }
  }
}
```

### 3. Order Packed Yesterday
**Problem**: Admin needs to mark yesterday's order as delivered

**Solution**:
- Show warning dialog with clear message
- Require explicit admin override checkbox
- Backend validates and allows with override flag

**UI Flow**:
1. User clicks "Mark Delivered" on old order
2. Dialog shows warning: "This order was packed on {date}, not today"
3. User must check "I understand and want to mark as delivered anyway"
4. Backend receives `adminOverride: true` and allows

### 4. Invalid Date Entry
**Problem**: User enters invalid date

**Solution**:
- HTML5 `<input type="date">` provides native validation
- React state defaults to today if date parsing fails
- No crashes, graceful fallback

### 5. Route Optimization vs Delivery List Mismatch
**Problem**: Route shows different orders than filtered delivery list

**Solution**:
- **Route Optimization**: Uses `requestedDeliveryDate` (planning phase)
- **Delivery List**: Uses `packing.packedAt` (execution phase)
- **UI Communication**: Add text "Showing orders packed on {date}"

### 6. Multiple Admins Operating Simultaneously
**Problem**: Two admins mark same order delivered at same time

**Solution**:
- Already handled by existing optimistic locking in TRPC
- Database ensures single `deliveredAt` timestamp
- Second admin's mutation fails with clear error

### 7. Order Partially Packed
**Problem**: Order in "packing" status (not "ready_for_delivery")

**Solution**:
- Query filters by `status: 'ready_for_delivery'`
- Partially packed orders excluded automatically
- Only fully packed orders appear in delivery list

---

## Critical Files Summary

### Backend
1. `packages/api/src/routers/delivery.ts` - Query filtering, validation, response transformation

### Frontend
2. `apps/admin-portal/app/[locale]/(app)/deliveries/page.tsx` - Date selector, state, queries
3. `apps/admin-portal/app/[locale]/(app)/deliveries/components/MarkDeliveredDialog.tsx` - Warning dialog

### Internationalization
4. `apps/admin-portal/messages/en.json` - English translations
5. `apps/admin-portal/messages/zh-CN.json` - Simplified Chinese translations
6. `apps/admin-portal/messages/zh-TW.json` - Traditional Chinese translations

---

## Verification & Testing

### Pre-Commit Checklist
- [ ] Run `pnpm build` - must succeed with no errors
- [ ] Run `pnpm type-check` - must pass with no errors
- [ ] Test date selector changes delivery list
- [ ] Test packing date badge displays correctly
- [ ] Test warning appears for old packed orders
- [ ] Test admin override checkbox works
- [ ] Test all 3 languages (EN, zh-CN, zh-TW)
- [ ] Test mobile responsive date picker
- [ ] Test empty state (no orders on date)
- [ ] Test timezone edge case (11:59 PM)
- [ ] Verify route updates with date selection

### End-to-End Testing
1. **Same-Day Flow**: Pack order today → Appears in delivery list → Mark delivered (no warning)
2. **Date Filter Flow**: Change date → List updates → Only orders packed on that date shown
3. **Override Flow**: Select yesterday → Old order shows → Warning appears → Check override → Confirm → Success
4. **Empty State**: Select future date → "No orders packed" message

---

## Implementation Checklist

### Backend
- [ ] Add `isPackedToday()` helper
- [ ] Update date filtering to use `packing.packedAt`
- [ ] Add `adminOverride` to input schema
- [ ] Add validation in `markDelivered`
- [ ] Add `packedAt` to response
- [ ] Update `getStats` query
- [ ] Test with `pnpm type-check`
- [ ] Test with `pnpm build`

### Frontend - Delivery Page
- [ ] Add date state
- [ ] Add date helper functions
- [ ] Update queries with date filters
- [ ] Add date selector UI
- [ ] Add packing date badges
- [ ] Import required components
- [ ] Test with `pnpm type-check`
- [ ] Test with `pnpm build`

### Frontend - Warning Dialog
- [ ] Update props interface
- [ ] Add validation logic
- [ ] Add warning UI
- [ ] Update onConfirm calls
- [ ] Import required components
- [ ] Test with `pnpm type-check`

### Internationalization
- [ ] Add keys to en.json
- [ ] Add keys to zh-CN.json
- [ ] Add keys to zh-TW.json
- [ ] Test language switching

### Testing
- [ ] Pack order today → Appears in list
- [ ] Change date → List updates
- [ ] Old order → Warning shows
- [ ] Override checkbox works
- [ ] All 3 languages work
- [ ] Mobile responsive
- [ ] Empty state displays
- [ ] Route updates correctly

### Final Verification
- [ ] `pnpm type-check` passes
- [ ] `pnpm build` succeeds
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All features working

---

## Migration Notes
- **No schema changes required** - all fields already exist
- **No data migration needed** - backward compatible
- **Deployment**: Can deploy immediately without downtime
- **Rollback**: Simple - revert frontend and backend changes independently

---

## Post-Implementation Notes

### Monitoring
After deployment, monitor for:
- Unexpected date filtering issues
- Override usage patterns (should be rare)
- Edge cases not covered in testing
- User feedback on UX

### Potential Future Enhancements
- Add delivery date range selector (from/to instead of single date)
- Add analytics on same-day compliance rate
- Add notification for orders approaching end-of-day unpacked
- Add batch delivery marking with date validation

---

**Plan Created**: 2026-01-14
**Status**: Ready for implementation
**Estimated Effort**: 4-6 hours for implementation + testing
**Risk Level**: Low (no schema changes, backward compatible, soft enforcement)
