import { type Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  /** Navigate to a locale-prefixed path */
  async goto(path: string) {
    const url = path.startsWith('/en') ? path : `/en${path}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  /** Wait for React Query loading states to resolve */
  async waitForDataLoad() {
    // Wait for any skeleton/loading indicators to disappear
    await this.page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 15_000 }).catch(() => {
      // Timeout is acceptable — some pages may not have loading states
    });
  }

  /** Assert a toast notification appears with the given text */
  async expectToast(text: string | RegExp) {
    const toast = this.page.locator('[data-radix-toast-viewport] [role="status"], [data-sonner-toast]');
    await expect(toast.filter({ hasText: text }).first()).toBeVisible({ timeout: 10_000 });
  }

  /** Navigate via the sidebar */
  async navigateTo(section: string) {
    const link = this.page.locator(`nav a, aside a`).filter({ hasText: section }).first();
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Get the page title/heading */
  get heading() {
    return this.page.locator('h1').first();
  }
}
