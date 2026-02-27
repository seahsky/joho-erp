import { vi } from 'vitest';

export const mockClerkClient = {
  users: {
    getUserList: vi.fn().mockResolvedValue({ data: [] }),
    getUser: vi.fn(),
    updateUserMetadata: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
  },
  invitations: {
    createInvitation: vi.fn(),
    getInvitationList: vi.fn().mockResolvedValue({ data: [] }),
    revokeInvitation: vi.fn(),
  },
};
