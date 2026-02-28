import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class SuppliersListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/suppliers');
  }

  async clickSupplier(businessName: string) {
    await this.page.getByText(businessName).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreateSupplier() {
    await this.page.getByRole('button', { name: /add|create|new/i }).click();
  }

  get supplierRows() {
    return this.page.locator('table tbody tr, [class*="supplier-card"], [class*="supplier-row"]');
  }

  get searchInput() {
    return this.page.getByPlaceholder(/search/i).first();
  }
}
