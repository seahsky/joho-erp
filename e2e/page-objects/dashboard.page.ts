import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/dashboard');
  }

  get statBar() {
    return this.page.locator('.dashboard-stat-bar');
  }

  get orderStatusCards() {
    return this.page.locator('.order-status-card');
  }

  get recentOrders() {
    return this.page.locator('.recent-orders-list');
  }

  get attentionStrip() {
    return this.page.locator('.attention-strip');
  }
}
