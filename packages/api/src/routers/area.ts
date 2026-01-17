import { z } from 'zod';
import { router, protectedProcedure, publicProcedure, isAdmin } from '../trpc';
import { prisma } from '@joho-erp/database';
import { TRPCError } from '@trpc/server';

// Area schema for validation
const areaNameSchema = z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Must be lowercase letters, numbers, and hyphens only');
const colorVariantSchema = z.enum(['info', 'success', 'warning', 'default', 'secondary', 'gray']);

export const areaRouter = router({
  // List all areas (public - used for dropdowns)
  list: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ input }) => {
      const where = input?.includeInactive ? {} : { isActive: true };
      return prisma.area.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
      });
    }),

  // List areas with usage counts (admin only)
  listWithCounts: isAdmin.query(async () => {
    return prisma.area.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            suburbMappings: { where: { isActive: true } },
            driverAssignments: { where: { isActive: true } },
          },
        },
      },
    });
  }),

  // Get single area by ID or name
  get: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (!input.id && !input.name) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must provide id or name' });
      }

      const area = input.id
        ? await prisma.area.findUnique({ where: { id: input.id } })
        : await prisma.area.findUnique({ where: { name: input.name } });

      if (!area) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Area not found' });
      }

      return area;
    }),

  // Create new area (admin only)
  create: isAdmin
    .input(z.object({
      name: areaNameSchema,
      displayName: z.string().min(1).max(100),
      colorVariant: colorVariantSchema,
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check for duplicate name
      const existing = await prisma.area.findUnique({ where: { name: input.name } });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An area with this name already exists',
        });
      }

      // Get next sort order if not provided
      const aggregateResult = await prisma.area.aggregate({ _max: { sortOrder: true } }) as { _max: { sortOrder: number | null } };
      const sortOrder = input.sortOrder ?? (aggregateResult._max.sortOrder ?? 0) + 1;

      return prisma.area.create({
        data: {
          name: input.name,
          displayName: input.displayName,
          colorVariant: input.colorVariant,
          sortOrder,
        },
      });
    }),

  // Update area (admin only)
  update: isAdmin
    .input(z.object({
      id: z.string(),
      displayName: z.string().min(1).max(100).optional(),
      colorVariant: colorVariantSchema.optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Check if area exists
      const existing = await prisma.area.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Area not found' });
      }

      return prisma.area.update({
        where: { id },
        data,
      });
    }),

  // Reorder areas (admin only)
  reorder: isAdmin
    .input(z.object({
      areaIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const updates = input.areaIds.map((id, index) =>
        prisma.area.update({
          where: { id },
          data: { sortOrder: index },
        })
      );
      await prisma.$transaction(updates);
      return { success: true };
    }),

  // Delete area (soft delete - admin only)
  delete: isAdmin
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Check for dependencies
      const [suburbCount, driverCount] = await Promise.all([
        prisma.suburbAreaMapping.count({ where: { areaId: input.id, isActive: true } }),
        prisma.driverAreaAssignment.count({ where: { areaId: input.id, isActive: true } }),
      ]);

      if (suburbCount > 0 || driverCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete area: ${suburbCount} suburb mappings and ${driverCount} driver assignments exist. Deactivate these first.`,
        });
      }

      return prisma.area.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // Lookup area by suburb (for auto-assignment)
  lookupBySuburb: publicProcedure
    .input(z.object({
      suburb: z.string(),
      state: z.string().optional(),
      postcode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const mapping = await prisma.suburbAreaMapping.findFirst({
        where: {
          suburb: { equals: input.suburb, mode: 'insensitive' },
          ...(input.state ? { state: input.state } : {}),
          ...(input.postcode ? { postcode: input.postcode } : {}),
          isActive: true,
        },
        include: { area: true },
      });

      return mapping?.area ?? null;
    }),
});
