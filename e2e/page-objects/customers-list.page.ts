import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class CustomersListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/customers');
  }

  async clickCustomer(businessName: string) {
    await this.page.getByText(businessName).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreateCustomer() {
    await this.page.getByRole('button', { name: /create|add|new/i }).click();
  }

  get customerRows() {
    return this.page.locator('table tbody tr, [class*="customer-card"], [class*="customer-row"]');
  }

  get searchInput() {
    return this.page.getByPlaceholder(/search/i).first();
  }
}
