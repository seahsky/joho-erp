'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer, type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Warehouse } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Driver color palette for multi-route visualization
const DRIVER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
] as const;

interface Delivery {
  id: string;
  orderId: string;
  customer: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  areaName: string | null; // Can be null if area unassigned
  estimatedTime: string;
  deliverySequence?: number | null;
  driverId?: string | null;
  driverName?: string | null;
  driverDeliverySequence?: number | null;
}

interface RouteData {
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  totalDistance: number;
  totalDuration: number;
  driverId?: string | null;
  driverName?: string | null;
}

interface WarehouseLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface DeliveryMapProps {
  deliveries: Delivery[];
  selectedDelivery: string | null;
  routeData?: RouteData | null;
  multiRouteData?: RouteData[];
  selectedDriverId?: string | null;
  warehouseLocation?: WarehouseLocation | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export default function DeliveryMap({
  deliveries,
  selectedDelivery,
  routeData,
  multiRouteData,
  selectedDriverId,
  warehouseLocation,
  emptyStateTitle,
  emptyStateDescription,
}: DeliveryMapProps) {
  const t = useTranslations('deliveries');
  const [popupInfo, setPopupInfo] = useState<Delivery | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasDeliveries = deliveries.length > 0;
  const hasWarehouse = !!warehouseLocation;

  // Sydney CBD coordinates as default center
  const [viewState, setViewState] = useState({
    longitude: 151.2093,
    latitude: -33.8688,
    zoom: 12,
  });

  useEffect(() => {
    if (selectedDelivery && mapRef.current && isMapReady && hasDeliveries) {
      const delivery = deliveries.find((d) => d.id === selectedDelivery);
      if (delivery && delivery.latitude && delivery.longitude) {
        mapRef.current.flyTo({
          center: [delivery.longitude, delivery.latitude],
          zoom: 14,
          duration: 1000,
        });
        setPopupInfo(delivery);
      }
    }
  }, [selectedDelivery, isMapReady, hasDeliveries, deliveries]);

  // Center on warehouse when no deliveries but warehouse exists
  useEffect(() => {
    if (!hasDeliveries && hasWarehouse && warehouseLocation && mapRef.current && isMapReady) {
      mapRef.current.flyTo({
        center: [warehouseLocation.longitude, warehouseLocation.latitude],
        zoom: 12,
        duration: 1000,
      });
    }
  }, [hasDeliveries, hasWarehouse, warehouseLocation, isMapReady]);

  // Empty state when no deliveries AND no warehouse configured
  if (!hasDeliveries && !hasWarehouse) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden bg-muted/50 flex flex-col items-center justify-center border border-dashed border-muted-foreground/20">
        <MapPin className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-lg font-medium">
          {emptyStateTitle ?? t('noDeliveriesAvailable')}
        </p>
        <p className="text-muted-foreground/60 text-sm mt-1">
          {emptyStateDescription ?? t('deliveriesWillAppear')}
        </p>
      </div>
    );
  }

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'ready_for_delivery':
        return 'text-yellow-600';
      case 'delivered':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Use a public Mapbox token for demo purposes
  // In production, this should be in environment variables
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazBjbGtwZ3IwMDAwM25xbXk5Y2swbGE3In0.example';

  // Build interactive layer IDs for route line hover detection
  const interactiveLayerIds = useMemo(() => {
    if (!multiRouteData || multiRouteData.length === 0) {
      // Include fallback single route layer if it exists
      return routeData?.geometry ? ['route-line'] : [];
    }
    return multiRouteData.map((route, index) => {
      const routeKey = route.driverId || `route-${index}`;
      return `route-line-${routeKey}`;
    });
  }, [multiRouteData, routeData]);

  // Handle mouse enter on route lines
  const handleRouteMouseEnter = (e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.layer?.id) {
      const layerId = feature.layer.id;
      // Extract route key from layer ID (e.g., "route-line-driver123" -> "driver123")
      const routeId = layerId.replace('route-line-', '');
      setHoveredRouteId(routeId);
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      }
    }
  };

  // Handle mouse leave from route lines
  const handleRouteMouseLeave = () => {
    setHoveredRouteId(null);
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
    }
  };

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onLoad={() => setIsMapReady(true)}
        onMouseEnter={handleRouteMouseEnter}
        onMouseLeave={handleRouteMouseLeave}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {/* Multi-Route Lines - render each driver's route with distinct colors */}
        {multiRouteData && multiRouteData.length > 0 ? (
          multiRouteData.map((route, index) => {
            const isSelected = selectedDriverId === null || selectedDriverId === route.driverId;
            const color = DRIVER_COLORS[index % DRIVER_COLORS.length];
            const routeKey = route.driverId || `route-${index}`;
            const isHovered = hoveredRouteId === routeKey;

            return (
              <Source
                key={routeKey}
                id={`route-${routeKey}`}
                type="geojson"
                data={{
                  type: 'Feature' as const,
                  properties: {},
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  geometry: route.geometry as any,
                }}
              >
                {/* Glow layer - rendered first (below main line) when hovered or selected */}
                {(isSelected || isHovered) && (
                  <Layer
                    id={`route-line-glow-${routeKey}`}
                    type="line"
                    paint={{
                      'line-color': color,
                      'line-width': isHovered ? 12 : 8,
                      'line-opacity': isHovered ? 0.3 : 0.2,
                      'line-blur': isHovered ? 6 : 4,
                    }}
                  />
                )}
                {/* Main route line */}
                <Layer
                  id={`route-line-${routeKey}`}
                  type="line"
                  paint={{
                    'line-color': color,
                    'line-width': isHovered ? 6 : (isSelected ? 4 : 2),
                    'line-opacity': isHovered ? 1.0 : (isSelected ? 0.8 : 0.3),
                  }}
                />
              </Source>
            );
          })
        ) : routeData && routeData.geometry ? (
          /* Fallback: Single route for backward compatibility */
          (() => {
            const isSingleRouteHovered = hoveredRouteId === '';
            return (
              <Source
                id="route"
                type="geojson"
                data={{
                  type: 'Feature' as const,
                  properties: {},
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  geometry: routeData.geometry as any,
                }}
              >
                {/* Glow layer */}
                <Layer
                  id="route-line-glow"
                  type="line"
                  paint={{
                    'line-color': '#FF6B35',
                    'line-width': isSingleRouteHovered ? 12 : 8,
                    'line-opacity': isSingleRouteHovered ? 0.3 : 0.2,
                    'line-blur': isSingleRouteHovered ? 6 : 4,
                  }}
                />
                {/* Main route line */}
                <Layer
                  id="route-line"
                  type="line"
                  paint={{
                    'line-color': '#FF6B35',
                    'line-width': isSingleRouteHovered ? 6 : 4,
                    'line-opacity': isSingleRouteHovered ? 1.0 : 0.8,
                  }}
                />
              </Source>
            );
          })()
        ) : null}

        {/* Warehouse Origin Marker */}
        {warehouseLocation && (
          <Marker
            longitude={warehouseLocation.longitude}
            latitude={warehouseLocation.latitude}
            anchor="center"
          >
            <div className="cursor-pointer transform hover:scale-110 transition-transform">
              <div className="relative">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600 text-white shadow-lg border-2 border-white">
                  <Warehouse className="h-6 w-6" />
                </div>
                {/* Arrow pointer */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
              </div>
            </div>
          </Marker>
        )}

        {/* Delivery Markers with Sequence Numbers */}
        {deliveries
          .filter((delivery) => delivery.latitude && delivery.longitude)
          .map((delivery) => (
            <Marker
              key={delivery.id}
              longitude={delivery.longitude!}
              latitude={delivery.latitude!}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(delivery);
              }}
            >
              <div className="cursor-pointer transform hover:scale-110 transition-transform">
                {delivery.deliverySequence ? (
                  // Numbered marker for sequenced deliveries
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-white ${
                      delivery.status === 'delivered' ? 'bg-green-600' :
                      'bg-orange-500'
                    }`}>
                      {delivery.deliverySequence}
                    </div>
                    {/* Arrow pointer */}
                    <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                      delivery.status === 'delivered' ? 'border-t-green-600' :
                      'border-t-orange-500'
                    }`}></div>
                  </div>
                ) : (
                  // Default pin marker for non-sequenced deliveries
                  <MapPin className={`h-8 w-8 ${getMarkerColor(delivery.status)} drop-shadow-lg`} fill="currentColor" />
                )}
              </div>
            </Marker>
          ))}

        {popupInfo && popupInfo.latitude && popupInfo.longitude && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{popupInfo.customer}</h3>
              <p className="text-xs text-gray-600 mb-2">{popupInfo.orderId}</p>
              <p className="text-xs text-gray-500 mb-2">{popupInfo.address}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {popupInfo.areaName && t('map.popup.area', { areaName: popupInfo.areaName.toUpperCase() })}
                  {popupInfo.deliverySequence && ` • ${t('map.popup.sequence', { sequence: popupInfo.deliverySequence })}`}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    popupInfo.status === 'ready_for_delivery'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {popupInfo.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('map.popup.eta', { time: popupInfo.estimatedTime })}</p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Route Legend - shows when multiple routes exist */}
      {multiRouteData && multiRouteData.length > 1 && (
        <div className="absolute top-4 left-4 bg-white/95 rounded-lg shadow-md p-3 z-10 max-w-[200px]">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">
            {t('map.legend.title')}
          </h4>
          <div className="space-y-1.5">
            {multiRouteData.map((route, index) => {
              const color = DRIVER_COLORS[index % DRIVER_COLORS.length];
              const isSelected = selectedDriverId === null || selectedDriverId === route.driverId;

              return (
                <div
                  key={route.driverId || index}
                  className={`flex items-center gap-2 text-xs ${
                    isSelected ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <div
                    className="w-4 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">
                    {route.driverName || t('map.legend.unassigned')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
