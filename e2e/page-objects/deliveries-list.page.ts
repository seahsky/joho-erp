import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class DeliveriesListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/deliveries');
  }

  async filterByDriver(driver: string) {
    await this.page.getByRole('combobox').or(this.page.locator('[data-testid="driver-filter"]')).first().click();
    await this.page.getByRole('option', { name: new RegExp(driver, 'i') }).click();
  }

  get deliveryRows() {
    return this.page.locator('table tbody tr, [class*="delivery-card"], [class*="delivery-row"]');
  }
}
