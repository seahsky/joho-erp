import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class OrderDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(orderId: string) {
    await super.goto(`/orders/${orderId}`);
  }

  get orderNumber() {
    return this.page.locator('[class*="order-number"], h1').first();
  }

  get statusBadge() {
    return this.page.locator('[class*="status"], [class*="badge"]').first();
  }

  get orderItems() {
    return this.page.locator('table tbody tr, [class*="order-item"]');
  }

  get totalAmount() {
    return this.page.locator('[class*="total"], [class*="amount"]').last();
  }
}
