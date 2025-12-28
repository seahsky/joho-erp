export { appRouter, type AppRouter } from './root';
export { createContext, type Context, type UserRole } from './context';
export { router, publicProcedure, protectedProcedure } from './trpc';

// Export invitation types for frontend use
export {
  INTERNAL_ROLES,
  type InternalRole,
  type InvitationInput,
  type InvitationResponse,
  type PendingInvitation,
  type RevokeInvitationResponse,
} from './types/invitation';

// Export services for use in API routes
export {
  processTimedOutSessions,
  startPackingSession,
  updateSessionActivity,
  updateSessionActivityByPacker,
  endPackingSession,
  getActiveSession,
  getAllActiveSessions,
} from './services/packing-session';

export {
  sendPackingTimeoutAlertEmail,
  sendLowStockAlertEmail,
  sendXeroSyncErrorEmail,
  sendNewOrderNotificationEmail,
} from './services/email';

export {
  uploadToR2,
  isR2Configured,
  IMAGE_UPLOAD_CONFIG,
  type AllowedMimeType,
} from './services/r2';
