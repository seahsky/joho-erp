'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface Delivery {
  id: string;
  orderId: string;
  customer: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  driver: string;
  estimatedTime: string;
}

interface DeliveryMapProps {
  deliveries: Delivery[];
  selectedDelivery: string | null;
}

export default function DeliveryMap({ deliveries, selectedDelivery }: DeliveryMapProps) {
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
      if (delivery) {
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
      case 'out_for_delivery':
        return 'text-blue-600';
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

        {deliveries.map((delivery) => (
          <Marker
            key={delivery.id}
            longitude={delivery.longitude}
            latitude={delivery.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo(delivery);
            }}
          >
            <div className="cursor-pointer">
              <MapPin className={`h-8 w-8 ${getMarkerColor(delivery.status)} drop-shadow-lg`} fill="currentColor" />
            </div>
          </Marker>
        ))}

        {popupInfo && (
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
                <span className="text-gray-600">Driver: {popupInfo.driver}</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    popupInfo.status === 'out_for_delivery'
                      ? 'bg-blue-100 text-blue-800'
                      : popupInfo.status === 'ready_for_delivery'
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
