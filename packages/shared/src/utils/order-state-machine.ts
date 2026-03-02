/**
 * Order State Machine
 *
 * Defines valid status transitions and role-based permissions for order workflow.
 * Used to prevent invalid state transitions and enforce business rules.
 */

import type { OrderStatus, UserRole } from '../types';

/**
 * Transition result with validation details
 */
export interface TransitionValidation {
  valid: boolean;
  error?: string;
  errorKey?: string; // i18n key for error message
}

/**
 * Valid transitions map: current status -> allowed next statuses
 *
 * Workflow:
 * - awaiting_approval: Can be approved (→ confirmed) or rejected (→ cancelled)
 * - confirmed: Can start packing (→ packing) or be cancelled
 * - packing: Can be marked ready (→ ready_for_delivery) or cancelled
 * - ready_for_delivery: Can start delivery (→ out_for_delivery) or be cancelled
 * - out_for_delivery: Can be delivered (→ delivered), returned (→ ready_for_delivery), or cancelled
 * - delivered: Can be cancelled (for full credit notes/refunds)
 * - cancelled: Terminal state (no transitions allowed)
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_approval: ['confirmed', 'cancelled'],
  confirmed: ['packing', 'cancelled'],
  packing: ['ready_for_delivery', 'cancelled', 'confirmed'], // Can revert to confirmed if issues
  ready_for_delivery: ['out_for_delivery', 'cancelled', 'packing'], // Can revert to packing if issues
  out_for_delivery: ['delivered', 'ready_for_delivery', 'cancelled'], // Can return to warehouse
  delivered: ['cancelled'], // Can cancel for full credit notes/refunds
  cancelled: [], // Terminal state
};

/**
 * Role permissions: which roles can perform which transitions
 *
 * Key: "fromStatus->toStatus"
 * Value: Array of roles allowed to perform this transition
 */
const ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  // Backorder approval/rejection (admin/manager only)
  'awaiting_approval->confirmed': ['admin', 'manager'],
  'awaiting_approval->cancelled': ['admin', 'manager'],

  // Start packing (admin, manager, packer)
  'confirmed->packing': ['admin', 'manager', 'packer'],
  'confirmed->cancelled': ['admin', 'manager', 'sales'],

  // Packing transitions
  'packing->ready_for_delivery': ['admin', 'manager', 'packer'],
  'packing->cancelled': ['admin', 'manager'],
  'packing->confirmed': ['admin', 'manager'], // Revert

  // Ready for delivery transitions
  'ready_for_delivery->out_for_delivery': ['admin', 'manager', 'driver'],
  'ready_for_delivery->cancelled': ['admin', 'manager'],
  'ready_for_delivery->packing': ['admin', 'manager'], // Revert

  // Delivery transitions
  'out_for_delivery->delivered': ['admin', 'manager', 'driver'],
  'out_for_delivery->ready_for_delivery': ['admin', 'manager', 'driver'], // Return to warehouse
  'out_for_delivery->cancelled': ['admin', 'manager'],

  // Cancel delivered order (admin/manager only - for full credit notes/refunds)
  'delivered->cancelled': ['admin', 'manager'],
};

/**
 * Check if a status is a terminal state (no further transitions allowed)
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'cancelled';
}

/**
 * Get all valid transitions from a given status
 */
export function getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Get valid transitions for a specific role from a given status
 */
export function getValidTransitionsForRole(
  currentStatus: OrderStatus,
  userRole: UserRole
): OrderStatus[] {
  const allTransitions = VALID_TRANSITIONS[currentStatus] || [];

  return allTransitions.filter(nextStatus => {
    const transitionKey = `${currentStatus}->${nextStatus}`;
    const allowedRoles = ROLE_PERMISSIONS[transitionKey];
    return allowedRoles?.includes(userRole) ?? false;
  });
}

/**
 * Check if a user can perform a specific status transition
 */
export function canTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  userRole: UserRole
): boolean {
  // Check if transition is valid
  const validTransitions = VALID_TRANSITIONS[currentStatus];
  if (!validTransitions?.includes(targetStatus)) {
    return false;
  }

  // Check if role has permission
  const transitionKey = `${currentStatus}->${targetStatus}`;
  const allowedRoles = ROLE_PERMISSIONS[transitionKey];

  return allowedRoles?.includes(userRole) ?? false;
}

/**
 * Validate a status transition and return detailed result
 *
 * @param currentStatus - Current order status
 * @param targetStatus - Desired new status
 * @param userRole - Role of user performing the transition
 * @returns TransitionValidation with valid flag and error details if invalid
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  userRole: UserRole
): TransitionValidation {
  // Same status is not a transition
  if (currentStatus === targetStatus) {
    return {
      valid: false,
      error: `Order is already in status: ${targetStatus}`,
      errorKey: 'orderErrors.sameStatus',
    };
  }

  // Check if current status allows any transitions
  if (isTerminalStatus(currentStatus)) {
    return {
      valid: false,
      error: `Cannot transition from terminal status: ${currentStatus}`,
      errorKey: 'orderErrors.terminalStatus',
    };
  }

  // Check if transition is valid
  const validTransitions = VALID_TRANSITIONS[currentStatus];
  if (!validTransitions?.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid transition from ${currentStatus} to ${targetStatus}. Valid transitions: ${validTransitions.join(', ')}`,
      errorKey: 'orderErrors.invalidTransition',
    };
  }

  // Check role permissions
  const transitionKey = `${currentStatus}->${targetStatus}`;
  const allowedRoles = ROLE_PERMISSIONS[transitionKey];

  if (!allowedRoles?.includes(userRole)) {
    return {
      valid: false,
      error: `Role '${userRole}' is not authorized to transition from ${currentStatus} to ${targetStatus}`,
      errorKey: 'orderErrors.transitionNotAuthorized',
    };
  }

  return { valid: true };
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    awaiting_approval: 'Awaiting Approval',
    confirmed: 'Confirmed',
    packing: 'Packing',
    ready_for_delivery: 'Ready for Delivery',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Check if status requires stock consumption tracking
 * Stock is consumed when order moves to ready_for_delivery
 */
export function requiresStockConsumption(status: OrderStatus): boolean {
  return status === 'ready_for_delivery';
}

/**
 * Check if cancellation should restore stock
 * Stock should be restored if order was confirmed or later but not yet delivered
 */
export function shouldRestoreStockOnCancel(
  currentStatus: OrderStatus,
  stockConsumed: boolean
): boolean {
  // Delivered orders: goods are with the customer, stock must NOT be restored
  if (currentStatus === 'delivered') {
    return false;
  }

  // Only restore stock if it was actually consumed
  if (!stockConsumed) {
    return false;
  }

  // Stock can be restored from any non-terminal state where it was consumed
  return ['ready_for_delivery', 'out_for_delivery'].includes(currentStatus);
}

/**
 * Check if order can be modified (items changed)
 * Orders can only be modified before packing starts
 */
export function canModifyOrderItems(status: OrderStatus): boolean {
  return ['awaiting_approval', 'confirmed'].includes(status);
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: OrderStatus, userRole: UserRole): boolean {
  if (isTerminalStatus(status)) {
    return false;
  }

  const transitionKey = `${status}->cancelled`;
  const allowedRoles = ROLE_PERMISSIONS[transitionKey];

  return allowedRoles?.includes(userRole) ?? false;
}
