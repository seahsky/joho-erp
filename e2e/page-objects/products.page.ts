import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class ProductsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/products');
  }

  async clickAddProduct() {
    await this.page.getByRole('button', { name: /add|create|new/i }).click();
  }

  async clickProduct(productName: string) {
    await this.page.getByText(productName).click();
    await this.page.waitForLoadState('networkidle');
  }

  get productRows() {
    return this.page.locator('table tbody tr, [class*="product-card"], [class*="product-row"]');
  }

  get searchInput() {
    return this.page.getByPlaceholder(/search/i).first();
  }
}
