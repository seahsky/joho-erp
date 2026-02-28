import { test as base, type Page } from '@playwright/test';
import { getPrismaClient } from '@joho-erp/database';
import type { PrismaClient } from '@joho-erp/database';

export type TestFixtures = {
  adminPage: Page;
  prisma: PrismaClient;
};

export const test = base.extend<TestFixtures>({
  adminPage: async ({ page }, use) => {
    // Extra HTTP headers with admin auth are set in playwright.config.ts
    // Navigate to dashboard to verify the app loads
    await page.goto('/en/dashboard');
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  prisma: async ({}, use) => {
    const prisma = getPrismaClient();
    await use(prisma);
  },
});

export { expect } from '@playwright/test';
