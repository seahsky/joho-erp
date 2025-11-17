// Prisma Client - Modern database layer using Prisma ORM
export { prisma, getPrismaClient, disconnectPrisma } from './prisma';
export type { PrismaClient } from './generated/prisma';

// Export all Prisma-generated types
export * from './generated/prisma';
