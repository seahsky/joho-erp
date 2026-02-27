import { appRouter } from '../root';
import type { UserRole } from '../context';

interface TestCallerOptions {
  userId?: string;
  sessionId?: string;
  userRole?: UserRole;
  userName?: string;
}

/**
 * Creates a tRPC caller with injectable auth context.
 * Bypasses HTTP -- calls router procedures directly using the real Prisma client.
 */
export function createTestCaller(options: TestCallerOptions = {}) {
  const {
    userId = 'test-user-id',
    sessionId = 'test-session-id',
    userRole = 'admin',
    userName = 'Test User',
  } = options;

  const mockRequest = new Request('http://localhost:3000');
  const mockHeaders = new Headers();

  return appRouter.createCaller({
    userId,
    sessionId,
    userRole,
    userName,
    req: mockRequest,
    resHeaders: mockHeaders,
  });
}

/** Pre-configured admin caller */
export function adminCaller() {
  return createTestCaller({ userRole: 'admin', userId: 'admin-user-id', userName: 'Admin User' });
}

/** Pre-configured sales caller */
export function salesCaller() {
  return createTestCaller({ userRole: 'sales', userId: 'sales-user-id', userName: 'Sales User' });
}

/** Pre-configured customer caller */
export function customerCaller(userId = 'customer-user-id') {
  return createTestCaller({ userRole: 'customer', userId, userName: 'Customer User' });
}

/** Pre-configured packer caller */
export function packerCaller() {
  return createTestCaller({ userRole: 'packer', userId: 'packer-user-id', userName: 'Packer User' });
}

/** Pre-configured driver caller */
export function driverCaller(userId = 'driver-user-id') {
  return createTestCaller({ userRole: 'driver', userId, userName: 'Driver User' });
}

/** Pre-configured manager caller */
export function managerCaller() {
  return createTestCaller({ userRole: 'manager', userId: 'manager-user-id', userName: 'Manager User' });
}
