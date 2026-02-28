import { disconnectPrisma } from '@joho-erp/database';

export default async function globalTeardown() {
  console.log('[E2E Teardown] Disconnecting Prisma...');
  await disconnectPrisma();
  console.log('[E2E Teardown] Done.');
}
