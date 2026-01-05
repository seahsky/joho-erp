/**
 * Mapbox Integration Service
 * Handles route optimization using Mapbox Optimization API
 */

interface MapboxWaypoint {
  location: [number, number]; // [lng, lat]
  waypoint_index: number;
}

interface MapboxTrip {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  legs: Array<{
    distance: number;
    duration: number;
    steps: unknown[];
  }>;
}

interface MapboxOptimizationResponse {
  code: string;
  waypoints: MapboxWaypoint[];
  trips: MapboxTrip[];
}

interface OptimizedRouteResult {
  optimizedOrder: number[]; // indices of coordinates in optimized order
  totalDistance: number; // meters
  totalDuration: number; // seconds
  routeGeometry: string; // GeoJSON LineString
  segments: Array<{
    fromIndex: number;
    toIndex: number;
    distance: number; // meters
    duration: number; // seconds
  }>;
  rawResponse: MapboxOptimizationResponse;
}

/**
 * Optimize a route using Mapbox Optimization API
 *
 * @param coordinates - Array of [lng, lat] coordinates to optimize
 * @param accessToken - Mapbox access token
 * @param options - Additional optimization options
 * @returns Optimized route with waypoint order and geometry
 */
export async function optimizeRoute(
  coordinates: Array<{ longitude: number; latitude: number }>,
  accessToken: string,
  options?: {
    roundtrip?: boolean; // Return to start (default: false)
    source?: "first" | "any"; // Which coordinate is the start (default: "first")
    destination?: "last" | "any"; // Which coordinate is the end (default: "last")
  }
): Promise<OptimizedRouteResult> {
  if (!accessToken) {
    throw new Error("Mapbox access token is required");
  }

  if (coordinates.length < 2) {
    throw new Error("At least 2 coordinates are required for route optimization");
  }

  if (coordinates.length > 12) {
    throw new Error("Mapbox Optimization API supports maximum 12 waypoints");
  }

  // Convert coordinates to Mapbox format: "lng,lat;lng,lat;..."
  const coordinatesString = coordinates
    .map((coord) => `${coord.longitude},${coord.latitude}`)
    .join(";");

  // Build API URL
  const baseUrl = "https://api.mapbox.com/optimized-trips/v1/mapbox/driving";
  const url = new URL(`${baseUrl}/${coordinatesString}`);

  // Add query parameters
  url.searchParams.append("access_token", accessToken);
  url.searchParams.append("geometries", "geojson");
  url.searchParams.append("overview", "full");

  // Set source (first waypoint is always the warehouse)
  url.searchParams.append("source", options?.source || "first");

  // Set destination (we don't return to depot by default)
  url.searchParams.append("destination", options?.destination || "last");

  // Roundtrip (false by default - don't return to warehouse)
  url.searchParams.append("roundtrip", String(options?.roundtrip ?? false));

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Mapbox API error (${response.status}): ${errorText}`
      );
    }

    const data: MapboxOptimizationResponse = await response.json();

    if (data.code !== "Ok") {
      throw new Error(`Mapbox optimization failed: ${data.code}`);
    }

    if (!data.trips || data.trips.length === 0) {
      throw new Error("No trips returned from Mapbox API");
    }

    const trip = data.trips[0];

    // Extract optimized waypoint order
    const optimizedOrder = data.waypoints.map((wp) => wp.waypoint_index);

    // Build segments from trip legs
    const segments = trip.legs.map((leg, index) => ({
      fromIndex: optimizedOrder[index],
      toIndex: optimizedOrder[index + 1],
      distance: leg.distance,
      duration: leg.duration,
    }));

    // Convert geometry to GeoJSON string
    const routeGeometry = JSON.stringify({
      type: "LineString",
      coordinates: trip.geometry.coordinates,
    });

    return {
      optimizedOrder,
      totalDistance: trip.distance,
      totalDuration: trip.duration,
      routeGeometry,
      segments,
      rawResponse: data,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Route optimization failed: ${error.message}`);
    }
    throw new Error("Route optimization failed with unknown error");
  }
}

/**
 * Batch optimize routes by area
 * Splits coordinates by area and optimizes each separately
 *
 * @param coordinatesByArea - Map of area tag to coordinates
 * @param accessToken - Mapbox access token
 * @returns Map of area tag to optimized route result
 */
export async function optimizeRoutesByArea(
  coordinatesByArea: Map<
    string,
    Array<{ id: string; longitude: number; latitude: number }>
  >,
  warehouseCoordinate: { longitude: number; latitude: number },
  accessToken: string
): Promise<
  Map<
    string,
    OptimizedRouteResult & { coordinateIds: string[] }
  >
> {
  const results = new Map();

  for (const [areaName, coords] of coordinatesByArea.entries()) {
    if (coords.length === 0) continue;

    // Prepend warehouse as the starting point
    const coordinatesWithWarehouse = [
      warehouseCoordinate,
      ...coords.map((c) => ({ longitude: c.longitude, latitude: c.latitude })),
    ];

    const result = await optimizeRoute(coordinatesWithWarehouse, accessToken, {
      source: "first", // Warehouse is always first
      destination: "last", // Only valid option when roundtrip=false
      roundtrip: false, // Don't return to warehouse
    });

    // Map optimized indices back to coordinate IDs (skip warehouse at index 0)
    const coordinateIds = result.optimizedOrder
      .slice(1) // Remove warehouse from sequence
      .map((index) => coords[index - 1].id); // Adjust for warehouse offset

    results.set(areaName, {
      ...result,
      coordinateIds,
    });
  }

  return results;
}

/**
 * Calculate estimated arrival times based on route optimization
 *
 * @param startTime - When the route starts (e.g., 9:00 AM)
 * @param segments - Route segments with durations
 * @param stopDuration - Time spent at each stop in seconds (default: 5 minutes)
 * @returns Array of estimated arrival times
 */
export function calculateArrivalTimes(
  startTime: Date,
  segments: Array<{ duration: number }>,
  stopDuration: number = 300 // 5 minutes default
): Date[] {
  const arrivalTimes: Date[] = [];
  let currentTime = new Date(startTime);

  for (const segment of segments) {
    // Add travel time to reach this stop
    currentTime = new Date(currentTime.getTime() + segment.duration * 1000);
    arrivalTimes.push(new Date(currentTime));

    // Add stop duration before next segment
    currentTime = new Date(currentTime.getTime() + stopDuration * 1000);
  }

  return arrivalTimes;
}

/**
 * Format distance in human-readable format
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
