// Marker style constants and utilities

export const MARKER_SIZES = {
  warehouse: 48,
  deliveryActive: 36,
  deliveryCompleted: 28,
  deliveryPending: 32,
} as const;

export const MARKER_COLORS = {
  warehouse: '#3B82F6', // blue-600
  pending: '#EAB308', // yellow-500
  active: '#F97316', // orange-500
  completed: '#16A34A', // green-600
  priority: '#EF4444', // red-500
} as const;

export type DeliveryStatus = 'ready_for_delivery' | 'delivered' | 'pending';

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ready_for_delivery':
      return MARKER_COLORS.active;
    case 'delivered':
      return MARKER_COLORS.completed;
    default:
      return MARKER_COLORS.pending;
  }
};

export const getStatusSize = (status: string): number => {
  switch (status) {
    case 'delivered':
      return MARKER_SIZES.deliveryCompleted;
    case 'ready_for_delivery':
      return MARKER_SIZES.deliveryActive;
    default:
      return MARKER_SIZES.deliveryPending;
  }
};

export const pulseAnimation = `
  @keyframes pulse-marker {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }
`;
