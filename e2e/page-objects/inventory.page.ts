import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class InventoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/inventory');
  }

  get stockLevelRows() {
    return this.page.locator('table tbody tr, [class*="inventory-row"]');
  }

  async viewBatches(productName: string) {
    const row = this.page.locator('table tbody tr, [class*="inventory-row"]').filter({ hasText: productName });
    await row.getByRole('button', { name: /batch|view|detail/i }).or(row).first().click();
  }
}
