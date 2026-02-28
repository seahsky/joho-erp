'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Warehouse } from 'lucide-react';

export interface DeliverySettingsMapHandle {
  flyTo: (opts: { center: [number, number]; zoom: number; duration: number }) => void;
}

interface DeliverySettingsMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default forwardRef<DeliverySettingsMapHandle, DeliverySettingsMapProps>(
  function DeliverySettingsMap({ latitude, longitude, onLocationChange }, ref) {
    const mapRef = useRef<MapRef>(null);

    useImperativeHandle(ref, () => ({
      flyTo: (opts) => mapRef.current?.flyTo(opts),
    }));

    return (
      <Map
        ref={mapRef}
        longitude={longitude}
        latitude={latitude}
        zoom={13}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
        style={{ width: '100%', height: '100%' }}
        onClick={(e) => {
          onLocationChange(e.lngLat.lat, e.lngLat.lng);
        }}
      >
        <NavigationControl position="top-right" />
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <div className="relative animate-bounce">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-background">
              <Warehouse className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        </Marker>
      </Map>
    );
  }
);
