import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class PackingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/packing');
  }

  async selectDate(date: string) {
    const datePicker = this.page.locator('[class*="date-picker"], input[type="date"]').first();
    await datePicker.fill(date);
  }

  async filterCategory(category: string) {
    await this.page.getByRole('combobox').or(this.page.locator('[data-testid="category-filter"]')).first().click();
    await this.page.getByRole('option', { name: new RegExp(category, 'i') }).click();
  }

  get packingOrders() {
    return this.page.locator('[class*="packing-order"], [class*="order-card"], table tbody tr');
  }

  get productSummary() {
    return this.page.locator('[class*="product-summary"], [class*="summary"]');
  }
}
