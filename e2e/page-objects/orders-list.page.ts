import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class OrdersListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/orders');
  }

  async filterByStatus(status: string) {
    await this.page.getByRole('combobox').or(this.page.locator('[data-testid="status-filter"]')).first().click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
  }

  async clickOrder(orderNumber: string) {
    await this.page.getByText(orderNumber).click();
    await this.page.waitForLoadState('networkidle');
  }

  get orderRows() {
    return this.page.locator('table tbody tr, [class*="order-card"], [class*="order-row"]');
  }
}
