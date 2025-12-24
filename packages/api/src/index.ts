export { appRouter, type AppRouter } from './root';
export { createContext, type Context, type UserRole } from './context';
export { router, publicProcedure, protectedProcedure } from './trpc';

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
