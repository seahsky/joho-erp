import { z } from 'zod';
import { router, requirePermission, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';
import type { UserRole } from '../context';
import { INTERNAL_ROLES, type InternalRole } from '../types/invitation';

/**
 * User representation returned from the API
 */
interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: 'active' | 'invited' | 'banned';
  lastSignInAt: Date | null;
  createdAt: Date;
  imageUrl: string | null;
}

/**
 * Convert Clerk user to our UserResponse format
 */
function mapClerkUserToResponse(user: {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string | null;
  lastName: string | null;
  publicMetadata: Record<string, unknown>;
  banned: boolean;
  lastSignInAt: number | null;
  createdAt: number;
  imageUrl: string;
}): UserResponse {
  const metadata = user.publicMetadata as { role?: UserRole };
  const role = metadata.role || 'customer';

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || '',
    firstName: user.firstName,
    lastName: user.lastName,
    role,
    status: user.banned ? 'banned' : 'active',
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
    createdAt: new Date(user.createdAt),
    imageUrl: user.imageUrl || null,
  };
}

export const userRouter = router({
  /**
   * Get all internal users (non-customer roles)
   * Only returns users with admin, sales, manager, packer, or driver roles
   */
  getAll: requirePermission('settings.users:view').query(async () => {
    try {
      const client = await clerkClient();

      // Get all users - Clerk returns paginated results
      // We'll fetch in batches to get all users
      const allUsers: UserResponse[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const usersResponse = await client.users.getUserList({
          limit,
          offset,
        });

        if (!usersResponse.data || usersResponse.data.length === 0) {
          break;
        }

        // Filter to only internal users (non-customer roles)
        const mappedUsers = usersResponse.data
          .map(mapClerkUserToResponse)
          .filter((user) => INTERNAL_ROLES.includes(user.role as InternalRole));

        allUsers.push(...mappedUsers);

        // Check if we've fetched all users
        if (usersResponse.data.length < limit) {
          break;
        }

        offset += limit;
      }

      return allUsers;
    } catch (error) {
      console.error('Error fetching users from Clerk:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users',
      });
    }
  }),

  /**
   * Get user by ID
   */
  getById: requirePermission('settings.users:view')
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
      })
    )
    .query(async ({ input }) => {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(input.userId);

        return mapClerkUserToResponse(user);
      } catch (error) {
        console.error('Error fetching user from Clerk:', error);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
    }),

  /**
   * Update user role
   * Can only update to internal roles (admin, sales, manager, packer, driver)
   */
  updateRole: requirePermission('settings.users:edit')
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
        role: z.enum(['admin', 'sales', 'manager', 'packer', 'driver']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Prevent users from changing their own admin role
      if (input.userId === ctx.userId && input.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot remove your own admin role',
        });
      }

      try {
        const client = await clerkClient();

        // Update user's public metadata with new role
        const updatedUser = await client.users.updateUserMetadata(input.userId, {
          publicMetadata: {
            role: input.role,
          },
        });

        return mapClerkUserToResponse(updatedUser);
      } catch (error) {
        console.error('Error updating user role in Clerk:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user role',
        });
      }
    }),

  /**
   * Deactivate (ban) or reactivate a user
   */
  deactivate: requirePermission('settings.users:delete')
    .input(
      z.object({
        userId: z.string().min(1, 'User ID is required'),
        deactivate: z.boolean().default(true), // true = ban, false = unban
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Prevent users from deactivating themselves
      if (input.userId === ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot deactivate your own account',
        });
      }

      try {
        const client = await clerkClient();

        let updatedUser;
        if (input.deactivate) {
          // Ban the user
          updatedUser = await client.users.banUser(input.userId);
        } else {
          // Unban the user
          updatedUser = await client.users.unbanUser(input.userId);
        }

        return mapClerkUserToResponse(updatedUser);
      } catch (error) {
        console.error('Error updating user status in Clerk:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: input.deactivate
            ? 'Failed to deactivate user'
            : 'Failed to reactivate user',
        });
      }
    }),

  /**
   * Invite a new internal user
   * Creates an invitation in Clerk with the specified role
   */
  invite: requirePermission('settings.users:create')
    .input(
      z.object({
        email: z.string().email('Valid email is required'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        role: z.enum(['admin', 'sales', 'manager', 'packer', 'driver']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const client = await clerkClient();

        // Check if user with this email already exists
        const existingUsers = await client.users.getUserList({
          emailAddress: [input.email],
        });

        if (existingUsers.data && existingUsers.data.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A user with this email already exists',
          });
        }

        // Check if there's already a pending invitation for this email
        const existingInvitations = await client.invitations.getInvitationList({
          status: 'pending',
        });
        const pendingInvitation = existingInvitations.data.find(
          (inv) => inv.emailAddress.toLowerCase() === input.email.toLowerCase()
        );

        if (pendingInvitation) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A pending invitation already exists for this email address',
          });
        }

        // Create an invitation
        // Note: Clerk's invitation flow will send an email to the user
        const invitation = await client.invitations.createInvitation({
          emailAddress: input.email,
          publicMetadata: {
            role: input.role,
            invitedFirstName: input.firstName,
            invitedLastName: input.lastName,
          },
          redirectUrl: process.env.NEXT_PUBLIC_ADMIN_URL
            ? `${process.env.NEXT_PUBLIC_ADMIN_URL}/sign-up`
            : undefined,
        });

        return {
          success: true,
          invitationId: invitation.id,
          email: input.email,
          role: input.role,
          status: invitation.status,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Error creating invitation in Clerk:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send invitation',
        });
      }
    }),

  /**
   * Get pending invitations
   */
  getPendingInvitations: requirePermission('settings.users:view').query(async () => {
    try {
      const client = await clerkClient();

      const invitations = await client.invitations.getInvitationList({
        status: 'pending',
      });

      return invitations.data.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        status: inv.status,
        role: (inv.publicMetadata as { role?: string })?.role || 'unknown',
        createdAt: new Date(inv.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching invitations from Clerk:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch pending invitations',
      });
    }
  }),

  /**
   * Revoke a pending invitation
   */
  revokeInvitation: requirePermission('settings.users:delete')
    .input(
      z.object({
        invitationId: z.string().min(1, 'Invitation ID is required'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const client = await clerkClient();

        await client.invitations.revokeInvitation(input.invitationId);

        return { success: true };
      } catch (error) {
        console.error('Error revoking invitation in Clerk:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke invitation',
        });
      }
    }),

  /**
   * Get current user's profile
   * Available to all authenticated users
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(ctx.userId);

      return mapClerkUserToResponse(user);
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch profile',
      });
    }
  }),
});
