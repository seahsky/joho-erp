/**
 * User Invitation Endpoint Tests
 *
 * Tests for the invitation workflow including:
 * - Creating invitations
 * - Preventing duplicate invitations
 * - Fetching pending invitations
 * - Revoking invitations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock Clerk client
const mockClerkClient = {
  users: {
    getUserList: vi.fn(),
    getUser: vi.fn(),
    updateUserMetadata: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
  },
  invitations: {
    createInvitation: vi.fn(),
    getInvitationList: vi.fn(),
    revokeInvitation: vi.fn(),
  },
};

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() => Promise.resolve(mockClerkClient)),
}));

// Mock permission service
vi.mock('../../services/permission-service', () => ({
  hasPermission: vi.fn(() => Promise.resolve(true)),
  getRolePermissions: vi.fn(() => Promise.resolve([])),
}));

// Import after mocks are set up
import { userRouter } from '../user';
import { router } from '../../trpc';

// Create a test caller with full context
const createTestCaller = (ctx: {
  userId: string;
  sessionId: string;
  userRole: 'admin' | 'sales' | 'manager' | 'packer' | 'driver' | 'customer';
  userName?: string | null;
}) => {
  const testRouter = router({
    user: userRouter,
  });

  // Create mock Request and Headers for test context
  const mockRequest = new Request('http://localhost:3000');
  const mockHeaders = new Headers();

  return testRouter.createCaller({
    ...ctx,
    userName: ctx.userName ?? 'Test User',
    req: mockRequest,
    resHeaders: mockHeaders,
  });
};

describe('User Invitation Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('invite mutation', () => {
    const validInput = {
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'sales' as const,
    };

    it('should create invitation for new email', async () => {
      // Setup: No existing users or invitations
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [] });
      mockClerkClient.invitations.getInvitationList.mockResolvedValue({ data: [] });
      mockClerkClient.invitations.createInvitation.mockResolvedValue({
        id: 'inv_123',
        emailAddress: validInput.email,
        status: 'pending',
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      const result = await caller.user.invite(validInput);

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe('inv_123');
      expect(result.email).toBe(validInput.email);
      expect(result.role).toBe(validInput.role);
      expect(mockClerkClient.invitations.createInvitation).toHaveBeenCalledWith({
        emailAddress: validInput.email,
        publicMetadata: {
          role: validInput.role,
          invitedFirstName: validInput.firstName,
          invitedLastName: validInput.lastName,
        },
        redirectUrl: undefined,
      });
    });

    it('should reject invitation for existing user', async () => {
      // Setup: User already exists
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [{ id: 'user_existing', emailAddresses: [{ emailAddress: validInput.email }] }],
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(caller.user.invite(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.user.invite(validInput)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'A user with this email already exists',
      });
    });

    it('should reject invitation for existing pending invitation', async () => {
      // Setup: No existing user, but pending invitation exists
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [] });
      mockClerkClient.invitations.getInvitationList.mockResolvedValue({
        data: [
          {
            id: 'inv_existing',
            emailAddress: validInput.email,
            status: 'pending',
          },
        ],
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(caller.user.invite(validInput)).rejects.toThrow(TRPCError);
      await expect(caller.user.invite(validInput)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'A pending invitation already exists for this email address',
      });
    });

    it('should handle case-insensitive email comparison for duplicates', async () => {
      // Setup: Pending invitation with different case
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [] });
      mockClerkClient.invitations.getInvitationList.mockResolvedValue({
        data: [
          {
            id: 'inv_existing',
            emailAddress: 'NEWUSER@EXAMPLE.COM', // Different case
            status: 'pending',
          },
        ],
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(caller.user.invite(validInput)).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'A pending invitation already exists for this email address',
      });
    });

    it('should validate email format', async () => {
      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(
        caller.user.invite({ ...validInput, email: 'invalid-email' })
      ).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(
        caller.user.invite({ ...validInput, firstName: '' })
      ).rejects.toThrow();

      await expect(
        caller.user.invite({ ...validInput, lastName: '' })
      ).rejects.toThrow();
    });

    it('should only accept valid internal roles', async () => {
      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(
        // @ts-expect-error Testing invalid role
        caller.user.invite({ ...validInput, role: 'customer' })
      ).rejects.toThrow();

      await expect(
        // @ts-expect-error Testing invalid role
        caller.user.invite({ ...validInput, role: 'invalid' })
      ).rejects.toThrow();
    });
  });

  describe('getPendingInvitations query', () => {
    it('should return pending invitations', async () => {
      const mockInvitations = [
        {
          id: 'inv_1',
          emailAddress: 'user1@example.com',
          status: 'pending',
          publicMetadata: { role: 'sales' },
          createdAt: 1700000000000,
        },
        {
          id: 'inv_2',
          emailAddress: 'user2@example.com',
          status: 'pending',
          publicMetadata: { role: 'manager' },
          createdAt: 1700000001000,
        },
      ];

      mockClerkClient.invitations.getInvitationList.mockResolvedValue({
        data: mockInvitations,
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      const result = await caller.user.getPendingInvitations();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'inv_1',
        email: 'user1@example.com',
        status: 'pending',
        role: 'sales',
        createdAt: expect.any(Date),
      });
      expect(result[1]).toEqual({
        id: 'inv_2',
        email: 'user2@example.com',
        status: 'pending',
        role: 'manager',
        createdAt: expect.any(Date),
      });
    });

    it('should return empty array when no pending invitations', async () => {
      mockClerkClient.invitations.getInvitationList.mockResolvedValue({
        data: [],
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      const result = await caller.user.getPendingInvitations();

      expect(result).toEqual([]);
    });

    it('should handle missing role metadata gracefully', async () => {
      mockClerkClient.invitations.getInvitationList.mockResolvedValue({
        data: [
          {
            id: 'inv_1',
            emailAddress: 'user@example.com',
            status: 'pending',
            publicMetadata: {}, // No role
            createdAt: 1700000000000,
          },
        ],
      });

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      const result = await caller.user.getPendingInvitations();

      expect(result[0].role).toBe('unknown');
    });
  });

  describe('revokeInvitation mutation', () => {
    it('should revoke existing invitation', async () => {
      mockClerkClient.invitations.revokeInvitation.mockResolvedValue({});

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      const result = await caller.user.revokeInvitation({ invitationId: 'inv_123' });

      expect(result.success).toBe(true);
      expect(mockClerkClient.invitations.revokeInvitation).toHaveBeenCalledWith('inv_123');
    });

    it('should validate invitationId is not empty', async () => {
      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(
        caller.user.revokeInvitation({ invitationId: '' })
      ).rejects.toThrow();
    });

    it('should handle Clerk API errors gracefully', async () => {
      mockClerkClient.invitations.revokeInvitation.mockRejectedValue(
        new Error('Invitation not found')
      );

      const caller = createTestCaller({
        userId: 'user_admin',
        sessionId: 'session_123',
        userRole: 'admin',
      });

      await expect(
        caller.user.revokeInvitation({ invitationId: 'inv_nonexistent' })
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to revoke invitation',
      });
    });
  });
});
