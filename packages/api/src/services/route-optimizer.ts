/**
 * Route Optimizer Service
 * Business logic for calculating delivery routes and packing sequences
 */

import { prisma } from "@joho-erp/database";
import type { AreaTag } from "@joho-erp/database";
import {
  optimizeRoutesByArea,
  calculateArrivalTimes,
} from "./mapbox";

interface RouteOptimizationResult {
  routeOptimizationId: string;
  orderUpdates: Array<{
    orderId: string;
    orderNumber: string;
    packingSequence: number;
    deliverySequence: number;
    estimatedArrival: Date;
    areaTag: AreaTag;
  }>;
  routeSummary: {
    totalOrders: number;
    totalDistance: number;
    totalDuration: number;
    areaBreakdown: Array<{
      areaTag: AreaTag;
      orderCount: number;
      distance: number;
      duration: number;
    }>;
  };
}

/**
 * Optimize delivery route and calculate packing/delivery sequences
 *
 * Strategy:
 * 1. Group orders by area (north, south, east, west)
 * 2. Optimize route within each area using Mapbox
 * 3. Calculate delivery sequence (1, 2, 3...)
 * 4. Calculate packing sequence (reverse of delivery, grouped by area)
 * 5. Store route optimization in database
 * 6. Update orders with sequences
 *
 * @param deliveryDate - Date to optimize deliveries for
 * @param userId - User performing the optimization
 * @returns Route optimization result with sequences
 */
export async function optimizeDeliveryRoute(
  deliveryDate: Date,
  userId: string
): Promise<RouteOptimizationResult> {
  // 1. Fetch company delivery settings (warehouse location)
  const company = await prisma.company.findFirst({
    select: {
      deliverySettings: true,
    },
  });

  if (!company?.deliverySettings) {
    throw new Error(
      "Delivery settings not configured. Please configure warehouse location in settings."
    );
  }

  const { warehouseAddress } = company.deliverySettings;

  // Get Mapbox token from environment variable
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxAccessToken) {
    throw new Error(
      "Mapbox access token not configured in environment variables. Please set NEXT_PUBLIC_MAPBOX_TOKEN."
    );
  }

  if (!warehouseAddress?.latitude || !warehouseAddress?.longitude) {
    throw new Error(
      "Warehouse location not configured. Please add coordinates in delivery settings."
    );
  }

  // 2. Fetch orders for the delivery date
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      requestedDeliveryDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["confirmed", "packing", "ready_for_delivery"],
      },
    },
    select: {
      id: true,
      orderNumber: true,
      deliveryAddress: true,
    },
  });

  if (orders.length === 0) {
    throw new Error("No orders found for the specified delivery date");
  }

  // 3. Validate all orders have coordinates
  const ordersWithoutCoordinates = orders.filter(
    (order) =>
      !order.deliveryAddress.latitude || !order.deliveryAddress.longitude
  );

  if (ordersWithoutCoordinates.length > 0) {
    const orderNumbers = ordersWithoutCoordinates
      .map((o) => o.orderNumber)
      .join(", ");
    throw new Error(
      `Orders missing coordinates: ${orderNumbers}. Please add address coordinates before optimizing.`
    );
  }

  // 4. Group orders by area
  const ordersByArea = new Map<
    string,
    Array<{
      id: string;
      orderNumber: string;
      longitude: number;
      latitude: number;
    }>
  >();

  for (const order of orders) {
    const areaTag = order.deliveryAddress.areaTag;
    if (!ordersByArea.has(areaTag)) {
      ordersByArea.set(areaTag, []);
    }
    ordersByArea.get(areaTag)!.push({
      id: order.id,
      orderNumber: order.orderNumber,
      longitude: order.deliveryAddress.longitude!,
      latitude: order.deliveryAddress.latitude!,
    });
  }

  // 5. Optimize routes by area using Mapbox
  const warehouseCoord = {
    longitude: warehouseAddress.longitude,
    latitude: warehouseAddress.latitude,
  };

  const areaRoutes = await optimizeRoutesByArea(
    ordersByArea,
    warehouseCoord,
    mapboxAccessToken
  );

  // 6. Calculate sequences
  const orderUpdates: RouteOptimizationResult["orderUpdates"] = [];
  let globalDeliverySequence = 1;
  const areaBreakdown: RouteOptimizationResult["routeSummary"]["areaBreakdown"] =
    [];

  // Order of areas for packing (matches typical route order)
  const areaOrder: AreaTag[] = ["north", "east", "south", "west"];

  // Process areas in order
  for (const areaTag of areaOrder) {
    const areaRoute = areaRoutes.get(areaTag);
    if (!areaRoute) continue;

    const areaOrders = ordersByArea.get(areaTag)!;
    const { coordinateIds, totalDistance, totalDuration, segments } = areaRoute;

    // Calculate arrival times (start at 9:00 AM, 5 min per stop)
    const routeStartTime = new Date(deliveryDate);
    routeStartTime.setHours(9, 0, 0, 0);
    const arrivalTimes = calculateArrivalTimes(routeStartTime, segments, 300);

    // Delivery sequence: in order of optimized route (1, 2, 3...)
    // Packing sequence: reverse within area for LIFO loading
    const areaOrderCount = coordinateIds.length;

    coordinateIds.forEach((orderId, index) => {
      const order = areaOrders.find((o) => o.id === orderId)!;
      const deliverySequence = globalDeliverySequence++;

      // Packing sequence: pack last delivery first within area
      // But maintain area grouping (all north packed before south, etc.)
      const packingSequence = areaOrderCount - index;

      orderUpdates.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliverySequence,
        packingSequence,
        estimatedArrival: arrivalTimes[index],
        areaTag,
      });
    });

    areaBreakdown.push({
      areaTag,
      orderCount: areaOrderCount,
      distance: totalDistance,
      duration: totalDuration,
    });
  }

  // 7. Adjust packing sequence to be global and grouped by area
  // Re-calculate packing sequence so areas are packed in reverse order
  let globalPackingSequence = 1;
  const areaOrderReversed = [...areaOrder].reverse(); // Pack south last (delivered first)

  for (const areaTag of areaOrderReversed) {
    const areaOrderUpdates = orderUpdates.filter((u) => u.areaTag === areaTag);

    // Sort by delivery sequence ascending, then reverse for packing
    areaOrderUpdates.sort((a, b) => b.deliverySequence - a.deliverySequence);

    areaOrderUpdates.forEach((update) => {
      update.packingSequence = globalPackingSequence++;
    });
  }

  // 8. Calculate total route stats
  const totalDistance = areaBreakdown.reduce(
    (sum, area) => sum + area.distance,
    0
  );
  const totalDuration = areaBreakdown.reduce(
    (sum, area) => sum + area.duration,
    0
  );

  // 9. Combine all route geometries and waypoints
  const allWaypoints: Array<{
    orderId: string;
    orderNumber: string;
    sequence: number;
    address: string;
    latitude: number;
    longitude: number;
    estimatedArrival: Date;
    distanceFromPrevious?: number;
    durationFromPrevious?: number;
  }> = [];

  for (const [areaTag, areaRoute] of areaRoutes.entries()) {
    const areaOrders = ordersByArea.get(areaTag)!;
    const { coordinateIds, segments } = areaRoute;

    coordinateIds.forEach((orderId, index) => {
      const order = areaOrders.find((o) => o.id === orderId)!;
      const fullOrder = orders.find((o) => o.id === orderId)!;
      const update = orderUpdates.find((u) => u.orderId === orderId)!;

      allWaypoints.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        sequence: update.deliverySequence,
        address: `${fullOrder.deliveryAddress.street}, ${fullOrder.deliveryAddress.suburb}`,
        latitude: order.latitude,
        longitude: order.longitude,
        estimatedArrival: update.estimatedArrival,
        distanceFromPrevious: segments[index]?.distance,
        durationFromPrevious: segments[index]?.duration,
      });
    });
  }

  // Sort waypoints by delivery sequence
  allWaypoints.sort((a, b) => a.sequence - b.sequence);

  // 10. Create combined route geometry (for display purposes)
  // In reality, we'd stitch together the area routes, but for simplicity
  // we'll store the first area's geometry (or could store all separately)
  const firstRoute = Array.from(areaRoutes.values())[0];
  const routeGeometry = firstRoute?.routeGeometry || "{}";

  // 11. Store route optimization in database
  const routeOptimization = await prisma.routeOptimization.create({
    data: {
      deliveryDate: startOfDay,
      areaTag: null, // Multi-area route
      orderCount: orders.length,
      totalDistance: totalDistance / 1000, // Convert meters to km
      totalDuration,
      routeGeometry,
      waypoints: allWaypoints.map((wp) => ({
        orderId: wp.orderId,
        orderNumber: wp.orderNumber,
        sequence: wp.sequence,
        address: wp.address,
        latitude: wp.latitude,
        longitude: wp.longitude,
        estimatedArrival: wp.estimatedArrival,
        distanceFromPrevious: wp.distanceFromPrevious,
        durationFromPrevious: wp.durationFromPrevious,
      })),
      optimizedAt: new Date(),
      optimizedBy: userId,
      mapboxRouteData: JSON.parse(JSON.stringify({
        areaRoutes: Array.from(areaRoutes.entries()).map(([area, route]) => ({
          area,
          totalDistance: route.totalDistance,
          totalDuration: route.totalDuration,
          orderCount: route.coordinateIds.length,
        })),
      })),
    },
  });

  // 12. Update orders with sequences
  await Promise.all(
    orderUpdates.map((update) =>
      prisma.order.update({
        where: { id: update.orderId },
        data: {
          packing: {
            packingSequence: update.packingSequence,
            packedItems: [],
          },
          delivery: {
            deliverySequence: update.deliverySequence,
            routeId: routeOptimization.id,
            estimatedArrival: update.estimatedArrival,
          },
        },
      })
    )
  );

  return {
    routeOptimizationId: routeOptimization.id,
    orderUpdates,
    routeSummary: {
      totalOrders: orders.length,
      totalDistance,
      totalDuration,
      areaBreakdown,
    },
  };
}

/**
 * Get existing route optimization for a delivery date
 */
export async function getRouteOptimization(deliveryDate: Date) {
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.routeOptimization.findFirst({
    where: {
      deliveryDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: {
      optimizedAt: "desc",
    },
  });
}

/**
 * Check if route needs re-optimization
 * (e.g., if orders were added/removed after last optimization)
 */
export async function checkIfRouteNeedsReoptimization(
  deliveryDate: Date
): Promise<boolean> {
  const route = await getRouteOptimization(deliveryDate);
  if (!route) return true;

  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const currentOrderCount = await prisma.order.count({
    where: {
      requestedDeliveryDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["confirmed", "packing", "ready_for_delivery"],
      },
    },
  });

  // If order count changed, re-optimization needed
  return currentOrderCount !== route.orderCount;
}
