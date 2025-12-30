# Feature: Delivery Route Recalculation for Ready-Only Orders

## Overview

This document describes the planned implementation for recalculating delivery routes based only on orders that are actually ready for delivery, with support for multiple drivers handling the same delivery area.

---

## Problem Statement

### Current Behavior
1. Route optimization runs when packing session opens
2. Routes include ALL orders with status: `confirmed`, `packing`, `ready_for_delivery`
3. Not all orders are packed on the same day (stock shortages, delays, etc.)
4. Delivery page shows routes that include orders not actually ready

### Issues
1. Delivery routes are inaccurate (include unready orders)
2. Delivery sequences have gaps (1, 3, 7 instead of 1, 2, 3)
3. Multiple drivers in same area can't have independent LIFO sequences
4. Packing UI doesn't group orders by driver for correct vehicle loading

---

## Solution

### Core Changes
1. **Recalculate delivery routes** based ONLY on `ready_for_delivery` orders
2. **Per-driver route optimization** when multiple drivers handle same area
3. **Per-driver packing sequences** for correct LIFO vehicle loading
4. **Packing UI grouping** by driver for correct vehicle loading

### Why LIFO Matters
- First packed order goes deepest in vehicle
- Last packed order is most accessible
- LIFO ensures delivery order matches unloading accessibility
- Each driver needs their own LIFO sequence for their vehicle

---

## Multi-Driver Workflow

```
STEP 1: GLOBAL ROUTE OPTIMIZATION (all ready orders)
        └── Orders 1→2→3→4→5→6→7→8→9→10 (optimized path)

STEP 2: DRIVER ASSIGNMENT (admin assigns before packing)
        ├── Driver A: orders 1, 3, 5, 7, 9
        └── Driver B: orders 2, 4, 6, 8, 10

STEP 3: PER-DRIVER PACKING SEQUENCES (calculated after assignment)
        ├── Driver A: pack 9→7→5→3→1 (LIFO for their deliveries)
        └── Driver B: pack 10→8→6→4→2 (LIFO for their deliveries)

STEP 4: PACKING UI (grouped by driver)
        ├── Pack Driver A's vehicle first (5 orders in LIFO order)
        └── Then pack Driver B's vehicle (5 orders in LIFO order)

STEP 5: PER-DRIVER DELIVERY SEQUENCES (contiguous per driver)
        ├── Driver A: 1→2→3→4→5 (their sequence, not global)
        └── Driver B: 1→2→3→4→5 (their sequence, not global)
```

---

## User Requirements

| Requirement | Description |
|-------------|-------------|
| **Trigger** | Automatic recalculation when delivery page loads |
| **Storage** | Separate record (keep packing route separate from delivery route) |
| **LIFO handling** | Reassign sequences per-driver for correct vehicle loading |
| **Multi-driver** | Multiple drivers can handle same area, each gets their own route |
| **Driver filter** | Delivery page includes driver filter to view individual driver routes |
| **Multi-route map** | Map supports displaying multiple route lines simultaneously (one per driver) |

---

## Implementation Steps

### Step 1: Database Schema Changes

**File:** `packages/database/prisma/schema.prisma`

#### 1.1 Add RouteType Enum
```prisma
enum RouteType {
  packing    // Initial route (all planned orders)
  delivery   // Final route (ready_for_delivery only)
}
```

#### 1.2 Update RouteOptimization Model
```prisma
model RouteOptimization {
  // ... existing fields ...
  routeType           RouteType           @default(packing)
  driverId            String?             // For per-driver delivery routes

  // Updated indexes
  @@index([deliveryDate, routeType])
  @@index([deliveryDate, routeType, driverId])
}
```

#### 1.3 Update Delivery Type (embedded in Order)
```prisma
type Delivery {
  // ... existing fields ...
  driverDeliverySequence    Int?    // Contiguous sequence within driver's route (1,2,3...)
  driverPackingSequence     Int?    // LIFO sequence for this driver's vehicle
}
```

---

### Step 2: Service Layer Changes

**File:** `packages/api/src/services/route-optimizer.ts`

#### 2.1 New Function: `optimizeDeliveryOnlyRoute()`

```typescript
/**
 * Recalculates route for ONLY ready_for_delivery orders.
 *
 * @param deliveryDate - The delivery date to optimize
 * @param userId - The user triggering the optimization
 * @param driverId - Optional: optimize for specific driver only
 * @returns RouteOptimizationResult with updated sequences
 */
export async function optimizeDeliveryOnlyRoute(
  deliveryDate: Date,
  userId: string,
  driverId?: string
): Promise<RouteOptimizationResult>
```

**Key differences from `optimizeDeliveryRoute()`:**
- Queries only `status: "ready_for_delivery"` orders
- Stores with `routeType: "delivery"`
- If `driverId` provided: optimize only that driver's assigned orders
- Handles empty result gracefully (no ready orders)
- Does NOT send email notification

#### 2.2 New Function: `calculatePerDriverSequences()`

```typescript
/**
 * Calculates per-driver delivery and packing sequences.
 *
 * @param orders - Orders with driver assignments and global delivery sequences
 * @returns Updated orders with per-driver sequences
 */
export async function calculatePerDriverSequences(
  orders: OrderWithDelivery[]
): Promise<PerDriverSequenceResult>
```

**Algorithm:**
1. Group orders by `driverId`
2. For each driver:
   - Sort their orders by global `deliverySequence`
   - Assign contiguous `driverDeliverySequence` (1, 2, 3...)
   - Calculate `driverPackingSequence` (reverse = LIFO)
3. Update orders in database with new sequences

#### 2.3 New Function: `getDeliveryRouteOptimization()`

```typescript
/**
 * Fetches the delivery-type route for a date.
 *
 * @param deliveryDate - The delivery date
 * @param driverId - Optional: get route for specific driver
 * @returns RouteOptimization or null
 */
export async function getDeliveryRouteOptimization(
  deliveryDate: Date,
  driverId?: string
): Promise<RouteOptimization | null>
```

#### 2.4 New Function: `checkIfDeliveryRouteNeedsRecalculation()`

```typescript
/**
 * Checks if delivery route needs recalculation.
 *
 * @param deliveryDate - The delivery date to check
 * @returns true if recalculation needed
 */
export async function checkIfDeliveryRouteNeedsRecalculation(
  deliveryDate: Date
): Promise<boolean>
```

**Returns `true` when:**
- No delivery route exists for date
- Ready order count changed since last calculation
- Driver assignments changed since last calculation

---

### Step 3: Delivery Router Updates

**File:** `packages/api/src/routers/delivery.ts`

#### 3.1 Update `getOptimizedRoute` Query

Add automatic recalculation logic:

```typescript
getOptimizedRoute: requirePermission('deliveries:view')
  .input(z.object({
    deliveryDate: z.string().datetime(),
    forceRecalculate: z.boolean().optional(),
  }))
  .query(async ({ input, ctx }) => {
    // 1. Check if delivery route needs recalculation
    const needsRecalculation = input.forceRecalculate ||
      await checkIfDeliveryRouteNeedsRecalculation(deliveryDate);

    // 2. If needed, recalculate
    if (needsRecalculation) {
      await optimizeDeliveryOnlyRoute(deliveryDate, ctx.userId || 'system');
    }

    // 3. Fetch and return delivery route
    // ...
  });
```

#### 3.2 Update `getDriverDeliveries` Query

Use per-driver sequences:

```typescript
// Before: orderBy: { delivery: { deliverySequence: 'asc' } }
// After:  orderBy: { delivery: { driverDeliverySequence: 'asc' } }
```

#### 3.3 New Mutation: `recalculatePerDriverSequences`

```typescript
recalculatePerDriverSequences: requirePermission('deliveries:manage')
  .input(z.object({
    deliveryDate: z.string().datetime(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Called when driver assignments change
    // Recalculates per-driver sequences for all assigned orders
  });
```

---

### Step 4: Packing Router Updates

**File:** `packages/api/src/routers/packing.ts`

#### 4.1 Update `getOptimizedSession` Query

After route optimization, calculate per-driver sequences:

```typescript
// After existing optimization logic:
await calculatePerDriverSequences(orders);

// Update response to group orders by driver
return {
  orders: groupedByDriver(orders),
  // ...
};
```

#### 4.2 Update Order Sorting

```typescript
// Primary sort: by driverId (group all Driver A orders together)
// Secondary sort: by driverPackingSequence (LIFO within driver)
orderBy: [
  { delivery: { driverId: 'asc' } },
  { delivery: { driverPackingSequence: 'asc' } },
]
```

---

### Step 5: Frontend Updates - Packing Page

**File:** `apps/admin-portal/app/[locale]/(app)/packing/components/OrderListView.tsx`

#### 5.1 Group Orders by Driver

Add driver headers/separators:

```tsx
{Object.entries(ordersByDriver).map(([driverId, driverOrders]) => (
  <div key={driverId}>
    <DriverHeader
      driverName={driverOrders[0]?.driverName || t('unassignedOrders')}
      orderCount={driverOrders.length}
    />
    {driverOrders.map(order => (
      <PackingOrderCard key={order.id} order={order} />
    ))}
  </div>
))}
```

#### 5.2 Update Packing Sequence Display

```tsx
// Before: order.packingSequence
// After:  order.driverPackingSequence || order.packingSequence
```

---

### Step 6: i18n Updates

**Files:**
- `apps/admin-portal/messages/en.json`
- `apps/admin-portal/messages/zh-CN.json`
- `apps/admin-portal/messages/zh-TW.json`

**New Keys:**

```json
{
  "packing": {
    "driverGroup": "Driver: {name}",
    "unassignedOrders": "Unassigned Orders",
    "packingSequence": "Pack #{sequence}"
  },
  "delivery": {
    "perDriverSequence": "Your delivery: #{sequence}",
    "driverFilter": "Filter by Driver",
    "allDrivers": "All Drivers",
    "routeLegend": "Route Legend"
  }
}
```

---

### Step 7: Frontend Updates - Delivery Page

**Files:**
- `apps/admin-portal/app/[locale]/(app)/deliveries/components/DeliveryMap.tsx`
- `apps/admin-portal/app/[locale]/(app)/deliveries/components/DriverFilter.tsx` (new)

#### 7.1 Add Driver Filter Component

Create a dropdown filter in the delivery page header:

```tsx
// DriverFilter.tsx
interface DriverFilterProps {
  drivers: { id: string; name: string }[];
  selectedDriverId: string | null; // null = "All Drivers"
  onDriverChange: (driverId: string | null) => void;
}

export function DriverFilter({ drivers, selectedDriverId, onDriverChange }: DriverFilterProps) {
  return (
    <Select value={selectedDriverId ?? 'all'} onValueChange={(v) => onDriverChange(v === 'all' ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder={t('delivery.driverFilter')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('delivery.allDrivers')}</SelectItem>
        {drivers.map((driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Features:**
- Shows all drivers with assigned orders for the selected date
- "All Drivers" option to show all routes simultaneously
- Filters both the order list and the map display

#### 7.2 Update Map Component for Multiple Route Lines

Update `DeliveryMap.tsx` to support multiple route polylines:

```tsx
// Color palette for different drivers
const DRIVER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

interface RouteLineProps {
  driverId: string;
  driverName: string;
  coordinates: [number, number][];
  color: string;
  visible: boolean;
}

// Render multiple route lines
{routeLines.map((route, index) => (
  <Source
    key={route.driverId}
    id={`route-${route.driverId}`}
    type="geojson"
    data={{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: route.coordinates },
    }}
  >
    <Layer
      id={`route-line-${route.driverId}`}
      type="line"
      paint={{
        'line-color': route.color,
        'line-width': 4,
        'line-opacity': route.visible ? 0.8 : 0.2,
      }}
    />
  </Source>
))}

// Route legend component
<RouteLegend drivers={driversWithColors} />
```

**Features:**
- Each driver's route rendered with a distinct color from the palette
- Legend showing driver name and corresponding route color
- Optional: Toggle visibility of individual driver routes
- When a driver is filtered, only their route is highlighted (others dimmed)

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `packages/database/prisma/schema.prisma` | Add `RouteType` enum, `routeType`/`driverId` fields, per-driver sequence fields |
| `packages/api/src/services/route-optimizer.ts` | Add 4 new functions: `optimizeDeliveryOnlyRoute()`, `calculatePerDriverSequences()`, `getDeliveryRouteOptimization()`, `checkIfDeliveryRouteNeedsRecalculation()` |
| `packages/api/src/routers/delivery.ts` | Update `getOptimizedRoute`, `getDriverDeliveries`, add `recalculatePerDriverSequences` |
| `packages/api/src/routers/packing.ts` | Update `getOptimizedSession` with per-driver grouping and sorting |
| `apps/admin-portal/.../packing/components/OrderListView.tsx` | Group orders by driver with headers |
| `apps/admin-portal/.../deliveries/components/DeliveryMap.tsx` | Add multi-route line support with driver color coding |
| `apps/admin-portal/.../deliveries/components/DriverFilter.tsx` | New component for driver selection filter |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No ready orders | Return empty route gracefully, no error |
| No driver assigned | Orders grouped under "Unassigned", use global packing sequence |
| Driver assigned after packing started | Recalculate per-driver sequences on next load |
| Driver removed from order | Order moves to "Unassigned" group |
| Multiple drivers, same area | Each driver's orders packed/delivered in their own sequence |
| Single driver | Behaves same as current system (no grouping needed) |
| Order changes status after route calculated | Auto-recalculates on next page load |

---

## Testing Checklist

- [ ] Route recalculates automatically when delivery page loads
- [ ] Only `ready_for_delivery` orders included in delivery route
- [ ] Per-driver delivery sequences are contiguous (1,2,3...)
- [ ] Per-driver packing sequences are LIFO (last delivery packed first)
- [ ] Packing UI groups orders by driver
- [ ] Unassigned orders handled correctly
- [ ] Driver app shows correct per-driver sequence
- [ ] Driver assignment triggers sequence recalculation
- [ ] Empty ready orders handled gracefully
- [ ] Single driver case works correctly
- [ ] Driver filter shows all assigned drivers for date
- [ ] Selecting driver filters map and order list to that driver
- [ ] "All Drivers" option shows all routes simultaneously
- [ ] Map displays multiple route lines with distinct colors
- [ ] Route line colors match driver legend
- [ ] Build passes (`pnpm build`)
- [ ] Type check passes (`pnpm type-check`)

---

## Performance Considerations

### Mapbox API
- Routes are cached until order count or driver assignments change
- Smart recalculation check: count comparison first (cheap), then ID comparison if needed
- Consider rate limiting to prevent excessive API calls

### Database Queries
- New indexes on `[deliveryDate, routeType]` and `[deliveryDate, routeType, driverId]` for efficient lookups
- Lazy recalculation: only when delivery page is accessed and changes detected

---

## Future Enhancements

1. **Auto-balance drivers**: Automatically distribute orders between drivers by count or area
2. **Driver capacity constraints**: Limit orders per driver based on vehicle capacity
3. **Per-driver route optimization**: Optimize each driver's route separately (more Mapbox API calls)
4. **Real-time driver tracking**: Update sequences based on actual driver progress
