'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface Delivery {
  id: string;
  orderId: string;
  customer: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  areaTag: string;
  estimatedTime: string;
  deliverySequence?: number | null;
}

interface RouteData {
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  totalDistance: number;
  totalDuration: number;
}

interface DeliveryMapProps {
  deliveries: Delivery[];
  selectedDelivery: string | null;
  routeData?: RouteData | null;
}

export default function DeliveryMap({ deliveries, selectedDelivery, routeData }: DeliveryMapProps) {
  const [popupInfo, setPopupInfo] = useState<Delivery | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  // Sydney CBD coordinates as default center
  const [viewState, setViewState] = useState({
    longitude: 151.2093,
    latitude: -33.8688,
    zoom: 12,
  });

  useEffect(() => {
    if (selectedDelivery && mapRef.current) {
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
  }, [selectedDelivery, deliveries]);

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

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {/* Route Line */}
        {routeData && routeData.geometry && (
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
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#FF6B35',
                'line-width': 4,
                'line-opacity': 0.8,
              }}
            />
            <Layer
              id="route-line-glow"
              type="line"
              paint={{
                'line-color': '#FF6B35',
                'line-width': 8,
                'line-opacity': 0.2,
                'line-blur': 4,
              }}
            />
          </Source>
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
                  Area: {popupInfo.areaTag.toUpperCase()}
                  {popupInfo.deliverySequence && ` • Seq: #${popupInfo.deliverySequence}`}
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
              <p className="text-xs text-gray-500 mt-1">ETA: {popupInfo.estimatedTime}</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
