# Delivery Same-Day Constraint & Date Filtering Implementation Plan

## Overview
Modify delivery logic to ensure deliveries only happen on the same day as packing, and add date filtering to the delivery page (matching packing page UX).

## Core Design Decisions

### 1. Filter by Packing Date (`packing.packedAt`)
**Decision**: Delivery page filters by when orders were PACKED, not requested delivery date.

**Rationale**:
- Orders become deliverable when packed (workflow logic)
- Natural enforcement: unpacked orders don't appear
- Clear audit trail: "what was packed when"
- Aligns with business process: pack → deliver same day

### 2. Soft Enforcement with Admin Override
**Decision**: Show warning (not blocking), allow admin override with checkbox.

**Why**:
- Handles edge cases: 11:59 PM packing, timezone issues
- Real-world flexibility for legitimate exceptions
- Clear communication without blocking operations
- Maintains audit trail

## Implementation Details

### Backend Changes (`packages/api/src/routers/delivery.ts`)

#### Change 1: Update Date Filtering (Lines 57-61)
```typescript
// BEFORE: Filters by requestedDeliveryDate
if (filters.dateFrom || filters.dateTo) {
  where.requestedDeliveryDate = {};
  if (filters.dateFrom) where.requestedDeliveryDate.gte = filters.dateFrom;
  if (filters.dateTo) where.requestedDeliveryDate.lte = filters.dateTo;
}

// AFTER: Filters by packing.packedAt
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

#### Change 2: Add Validation Helper (Before router export)
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

#### Change 3: Add Validation to markDelivered (Lines 164-220)
- Add to input schema: `adminOverride: z.boolean().optional()`
- After fetching order, add:
```typescript
const packedToday = isPackedToday(currentOrder.packing?.packedAt);

if (!packedToday && !input.adminOverride) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'This order was not packed today. Deliveries should occur on the same day as packing.',
  });
}
```

#### Change 4: Add packedAt to Response (Lines 128-152)
```typescript
const deliveries = orders.map((order) => ({
  // ... existing fields ...
  packedAt: order.packing?.packedAt ?? null, // ADD
}));
```

#### Change 5: Update getStats Query (Lines 223-250)
```typescript
// Change readyForDelivery count to filter by packedAt
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

### Frontend Date Selector (`apps/admin-portal/app/[locale]/(app)/deliveries/page.tsx`)

#### Change 1: Add Date State (After line 35)
```typescript
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const [deliveryDate, setDeliveryDate] = useState<Date>(today);
```

#### Change 2: Add Date Helper Functions (After line 162)
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

#### Change 3: Update Queries (Lines 60-71)
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

#### Change 4: Add Date Selector UI (After line 192, before FilterBar)
```tsx
{/* Date Selector Card */}
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

#### Change 5: Add Packing Date Badge (Lines 244-249, in delivery card)
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

### Warning Dialog Enhancement (`apps/admin-portal/app/[locale]/(app)/deliveries/components/MarkDeliveredDialog.tsx`)

#### Change 1: Update Props
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

#### Change 2: Add Validation Logic
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

#### Change 3: Add Warning UI (Before notes textarea)
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

#### Change 4: Update onConfirm Calls
```typescript
// In dialog
onConfirm(notes, adminOverride);

// In parent page.tsx
await markDeliveredMutation.mutateAsync({
  orderId: deliveryToDeliver!.id,
  notes: notes || undefined,
  adminOverride: adminOverride, // ADD
});
```

### Internationalization Changes

Add to all 3 files:
- `apps/admin-portal/messages/en.json`
- `apps/admin-portal/messages/zh-CN.json`
- `apps/admin-portal/messages/zh-TW.json`

#### English (en.json)
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

#### Chinese Simplified (zh-CN.json)
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

#### Chinese Traditional (zh-TW.json)
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

## Edge Cases & Solutions

### 1. Timezone Issues (11:59 PM Packing)
- **Solution**: Use UTC dates with zero time
- **Implementation**: `isPackedToday()` normalizes to UTC
- **Result**: Consistent same-day checking regardless of timezone

### 2. Unpacked Orders
- **Behavior**: Don't show in delivery list
- **Reason**: Filtered by `packing.packedAt` existence
- **UI**: Empty state "No orders packed on this date"

### 3. Order Packed Yesterday
- **Behavior**: Show warning in MarkDeliveredDialog
- **Action**: Require admin override checkbox
- **Result**: Prevents accidental mis-delivery while allowing legitimate exceptions

### 4. Invalid Date Entry
- **Protection**: HTML5 date input validation
- **Fallback**: React state defaults to today
- **Result**: No crashes, graceful handling

### 5. Route Optimization vs Delivery List
- **Route**: Uses `requestedDeliveryDate` (planning phase)
- **Delivery List**: Uses `packing.packedAt` (execution phase)
- **UI**: Clear text "Showing orders packed on {date}"
- **Result**: No confusion between planning and execution

## Testing Checklist

### Pre-Commit Verification
- [ ] Run `pnpm build` - must succeed
- [ ] Run `pnpm type-check` - must pass
- [ ] Test date selector updates list
- [ ] Test packing date badge displays
- [ ] Test warning shows for old orders
- [ ] Test admin override works
- [ ] Test all 3 languages (EN, zh-CN, zh-TW)
- [ ] Test mobile responsive date picker
- [ ] Test empty state message
- [ ] Test timezone edge case (11:59 PM)
- [ ] Verify route updates with date

### End-to-End Testing Scenarios
1. **Happy Path**: Pack order today → Select today on delivery → Order appears → Mark delivered (no warning)
2. **Date Filter**: Change date → List updates → Only orders packed on that date shown
3. **Admin Override**: Select yesterday → Old order shows → Warning appears → Check override → Mark delivered
4. **Empty State**: Select future date → "No orders packed" message displays

## Success Criteria

### Technical
- ✅ All TypeScript types valid
- ✅ All builds succeed
- ✅ No console errors or warnings
- ✅ All three languages working

### User Experience
- ✅ Clear which orders are deliverable
- ✅ Date selector intuitive (matches packing page)
- ✅ Warning messages helpful
- ✅ Admin override smooth with clear confirmation

### Business Logic
- ✅ Enforces same-day delivery workflow
- ✅ Allows legitimate exceptions
- ✅ Maintains audit trail
- ✅ Prevents accidental misuse

## Migration & Deployment

### No Schema Changes
- All fields already exist in Prisma schema
- No data migration required
- Backward compatible

### Deployment Strategy
1. Deploy backend first (add validation, update queries)
2. Deploy frontend (add UI, date selector)
3. Monitor for edge cases
4. Iterate based on feedback

### Rollback Plan
- Simple: revert commits
- Frontend and backend can rollback independently
- No data cleanup needed

## Critical Files Summary

### Backend (1 file)
1. `packages/api/src/routers/delivery.ts` - Query filtering, validation, response

### Frontend (2 files)
2. `apps/admin-portal/app/[locale]/(app)/deliveries/page.tsx` - Date selector UI
3. `apps/admin-portal/app/[locale]/(app)/deliveries/components/MarkDeliveredDialog.tsx` - Warning dialog

### Internationalization (3 files)
4. `apps/admin-portal/messages/en.json`
5. `apps/admin-portal/messages/zh-CN.json`
6. `apps/admin-portal/messages/zh-TW.json`

## Notes

- Pattern matches packing page implementation (consistent UX)
- UTC date handling prevents timezone bugs
- Soft enforcement allows operational flexibility
- Clear audit trail maintained throughout
- No breaking changes to existing functionality
