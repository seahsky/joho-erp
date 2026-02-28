import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class PricingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/pricing');
  }

  async clickAddPricingRule() {
    await this.page.getByRole('button', { name: /add|create|new/i }).click();
  }

  get pricingRows() {
    return this.page.locator('table tbody tr, [class*="pricing-row"]');
  }
}
