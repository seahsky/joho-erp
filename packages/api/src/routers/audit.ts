import { z } from 'zod';
import { router, requirePermission } from '../trpc';
import { prisma } from '@joho-erp/database';
import type { AuditAction, Prisma } from '@joho-erp/database';

/**
 * Audit Log API Router
 *
 * Provides endpoints to query and export audit logs for compliance
 * and administrative review purposes.
 */

// Valid entity types for filtering (matches entities used in audit service)
const ENTITY_TYPES = [
  'order',
  'customer',
  'product',
  'customerPricing',
  'orderItem',
  'company',
  'user',
  'permission',
  'category',
  'notification',
  'sms',
  'xero',
  'proofOfDelivery',
] as const;

// Valid audit actions
const AUDIT_ACTIONS = ['create', 'update', 'delete', 'approve', 'reject'] as const;

export const auditRouter = router({
  /**
   * Get paginated list of audit logs with filters
   * Supports filtering by entity, action, user, and date range
   */
  getAll: requirePermission('settings.audit:view')
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        entity: z.enum(ENTITY_TYPES).optional(),
        action: z.enum(AUDIT_ACTIONS).optional(),
        userId: z.string().optional(),
        userRole: z.string().optional(),
        entityId: z.string().optional(),
        dateFrom: z.string().optional(), // ISO date string
        dateTo: z.string().optional(), // ISO date string
        search: z.string().optional(), // Search by entityId or userEmail
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, entity, action, userId, userRole, entityId, dateFrom, dateTo, search } =
        input;

      // Build where clause
      const where: Prisma.AuditLogWhereInput = {};

      if (entity) {
        where.entity = entity;
      }

      if (action) {
        where.action = action as AuditAction;
      }

      if (userId) {
        where.userId = userId;
      }

      if (userRole) {
        where.userRole = userRole;
      }

      if (entityId) {
        where.entityId = entityId;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.timestamp = {};
        if (dateFrom) {
          where.timestamp.gte = new Date(dateFrom);
        }
        if (dateTo) {
          // Add one day to include the entire end date
          const endDate = new Date(dateTo);
          endDate.setDate(endDate.getDate() + 1);
          where.timestamp.lt = endDate;
        }
      }

      // Search filter - searches entityId or userEmail
      if (search) {
        where.OR = [
          { entityId: { contains: search, mode: 'insensitive' } },
          { userEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Query with cursor-based pagination
      const logs = await prisma.auditLog.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's a next page
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          userId: true,
          userEmail: true,
          userRole: true,
          userName: true,
          action: true,
          entity: true,
          entityId: true,
          changes: true,
          metadata: true,
          timestamp: true,
        },
      });

      // Determine if there are more results
      let nextCursor: string | undefined;
      if (logs.length > limit) {
        const nextItem = logs.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: logs,
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  /**
   * Get audit trail for a specific entity
   * Returns all audit logs for the given entity type and ID
   */
  getByEntity: requirePermission('settings.audit:view')
    .input(
      z.object({
        entity: z.string(),
        entityId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const { entity, entityId, limit } = input;

      const logs = await prisma.auditLog.findMany({
        where: {
          entity,
          entityId,
        },
        take: limit,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          userId: true,
          userEmail: true,
          userRole: true,
          userName: true,
          action: true,
          entity: true,
          entityId: true,
          changes: true,
          metadata: true,
          timestamp: true,
        },
      });

      return logs;
    }),

  /**
   * Get summary statistics for audit logs
   * Useful for dashboard display
   */
  getStats: requirePermission('settings.audit:view')
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { dateFrom, dateTo } = input;

      const where: Prisma.AuditLogWhereInput = {};

      if (dateFrom || dateTo) {
        where.timestamp = {};
        if (dateFrom) {
          where.timestamp.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setDate(endDate.getDate() + 1);
          where.timestamp.lt = endDate;
        }
      }

      // Get counts by action
      const [total, byAction, byEntity, recentActivity] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: { _all: true },
          where,
        }),
        prisma.auditLog.groupBy({
          by: ['entity'],
          _count: { _all: true },
          where,
          orderBy: { _count: { entity: 'desc' } },
          take: 10,
        }),
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: {
            id: true,
            action: true,
            entity: true,
            userEmail: true,
            timestamp: true,
          },
        }),
      ]);

      return {
        total,
        byAction: byAction.map((item: { action: string; _count: { _all: number } }) => ({
          action: item.action,
          count: item._count._all,
        })),
        byEntity: byEntity.map((item: { entity: string; _count: { _all: number } }) => ({
          entity: item.entity,
          count: item._count._all,
        })),
        recentActivity,
      };
    }),

  /**
   * Export audit logs to CSV format
   * Returns CSV data as a string
   */
  export: requirePermission('settings.audit:export')
    .input(
      z.object({
        entity: z.enum(ENTITY_TYPES).optional(),
        action: z.enum(AUDIT_ACTIONS).optional(),
        userId: z.string().optional(),
        userRole: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        maxRecords: z.number().min(1).max(10000).default(1000),
      })
    )
    .mutation(async ({ input }) => {
      const { entity, action, userId, userRole, dateFrom, dateTo, maxRecords } = input;

      // Build where clause (same as getAll)
      const where: Prisma.AuditLogWhereInput = {};

      if (entity) {
        where.entity = entity;
      }

      if (action) {
        where.action = action as AuditAction;
      }

      if (userId) {
        where.userId = userId;
      }

      if (userRole) {
        where.userRole = userRole;
      }

      if (dateFrom || dateTo) {
        where.timestamp = {};
        if (dateFrom) {
          where.timestamp.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setDate(endDate.getDate() + 1);
          where.timestamp.lt = endDate;
        }
      }

      // Fetch logs for export
      const logs = await prisma.auditLog.findMany({
        where,
        take: maxRecords,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          userId: true,
          userEmail: true,
          userRole: true,
          userName: true,
          action: true,
          entity: true,
          entityId: true,
          changes: true,
          metadata: true,
          timestamp: true,
        },
      });

      // Generate CSV
      const headers = [
        'ID',
        'Timestamp',
        'User ID',
        'User Name',
        'User Email',
        'User Role',
        'Action',
        'Entity',
        'Entity ID',
        'Changes',
        'Metadata',
      ];

      const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = logs.map((log) => [
        escapeCSV(log.id),
        escapeCSV(log.timestamp.toISOString()),
        escapeCSV(log.userId),
        escapeCSV(log.userName),
        escapeCSV(log.userEmail),
        escapeCSV(log.userRole),
        escapeCSV(log.action),
        escapeCSV(log.entity),
        escapeCSV(log.entityId),
        escapeCSV(log.changes),
        escapeCSV(log.metadata),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      return {
        csv,
        recordCount: logs.length,
        exportedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get list of unique users who have audit log entries
   * Useful for populating filter dropdowns
   */
  getUsers: requirePermission('settings.audit:view').query(async () => {
    const users = await prisma.auditLog.findMany({
      distinct: ['userId', 'userEmail'],
      select: {
        userId: true,
        userEmail: true,
        userName: true,
      },
      where: {
        userEmail: { not: null },
      },
      orderBy: { userEmail: 'asc' },
    });

    // Filter to unique users by userId
    const uniqueUsers = Array.from(
      new Map(users.map((u) => [u.userId, u])).values()
    );

    return uniqueUsers;
  }),
});
