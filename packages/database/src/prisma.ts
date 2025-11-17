import { PrismaClient } from './generated/prisma';

interface PrismaCache {
  client: PrismaClient | null;
}

declare global {
  var prisma: PrismaCache | undefined;
}

let cached: PrismaCache = global.prisma || { client: null };

if (!global.prisma) {
  global.prisma = cached;
}

export function getPrismaClient(): PrismaClient {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable');
  }

  console.log(process.env.MONGODB_URI)
  if (cached.client) {
    return cached.client;
  }

  // Create new Prisma Client instance
  cached.client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  console.log('Prisma Client initialized successfully');

  return cached.client;
}

// Export singleton instance
export const prisma = getPrismaClient();

// Cleanup function for graceful shutdown
export async function disconnectPrisma() {
  if (cached.client) {
    await cached.client.$disconnect();
    cached.client = null;
    console.log('Prisma Client disconnected');
  }
}

export default prisma;
