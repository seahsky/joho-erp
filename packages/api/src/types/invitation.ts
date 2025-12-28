/**
 * Invitation Type Definitions
 * Types for the user invitation module
 */

/**
 * Valid internal roles for staff users
 * Excludes 'customer' as that's for external users
 */
export const INTERNAL_ROLES = ['admin', 'sales', 'manager', 'packer', 'driver'] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

/**
 * Input for creating a new invitation
 */
export interface InvitationInput {
  email: string;
  firstName: string;
  lastName: string;
  role: InternalRole;
}

/**
 * Response from creating an invitation
 */
export interface InvitationResponse {
  success: boolean;
  invitationId: string;
  email: string;
  role: InternalRole;
  status: string;
}

/**
 * Pending invitation representation
 */
export interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  role: InternalRole | 'unknown';
  createdAt: Date;
}

/**
 * Response from revoking an invitation
 */
export interface RevokeInvitationResponse {
  success: boolean;
}
