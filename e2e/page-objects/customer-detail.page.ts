import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class CustomerDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(customerId: string) {
    await super.goto(`/customers/${customerId}`);
  }

  get businessName() {
    return this.page.locator('h1, [class*="business-name"]').first();
  }

  get contactInfo() {
    return this.page.locator('[class*="contact"]').first();
  }

  get creditStatus() {
    return this.page.locator('[class*="credit"], [class*="badge"]');
  }

  async clickEdit() {
    await this.page.getByRole('button', { name: /edit/i }).first().click();
  }
}
