import { type Page, expect } from '@playwright/test';

/** Wait for a toast notification containing the given text */
export async function waitForToast(page: Page, text: string | RegExp) {
  const toast = page.locator('[data-radix-toast-viewport] [role="status"], [data-sonner-toast]');
  await expect(toast.filter({ hasText: text }).first()).toBeVisible({ timeout: 10_000 });
}

/** Wait for skeleton/loading indicators to disappear */
export async function waitForPageLoad(page: Page) {
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]');
    return skeletons.length === 0;
  }, { timeout: 15_000 }).catch(() => {
    // Timeout is acceptable — some pages may not have loading states
  });
}
