'use client';

import { Warehouse } from 'lucide-react';
import { MARKER_SIZES, MARKER_COLORS } from './marker-styles';

interface WarehouseMarkerProps {
  isActive?: boolean;
}

export function WarehouseMarker({ isActive = true }: WarehouseMarkerProps) {
  return (
    <div className="cursor-pointer transform hover:scale-110 transition-all duration-200">
      <div className="relative">
        {/* Pulsing glow ring for active state */}
        {isActive && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: MARKER_COLORS.warehouse,
              opacity: 0.4,
              width: `${MARKER_SIZES.warehouse}px`,
              height: `${MARKER_SIZES.warehouse}px`,
            }}
          />
        )}

        {/* Main marker circle */}
        <div
          className="relative rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-white backdrop-blur-sm"
          style={{
            backgroundColor: MARKER_COLORS.warehouse,
            width: `${MARKER_SIZES.warehouse}px`,
            height: `${MARKER_SIZES.warehouse}px`,
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5), 0 8px 10px -6px rgba(59, 130, 246, 0.4)',
          }}
        >
          <Warehouse
            className="relative z-10"
            size={24}
            strokeWidth={2.5}
          />
        </div>

        {/* Arrow pointer */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            bottom: '-6px',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `8px solid ${MARKER_COLORS.warehouse}`,
          }}
        />
      </div>
    </div>
  );
}
