import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class DriverDeliveriesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/driver');
  }

  /** The 4 stat cards (total, ready, in progress, completed) */
  get statsCards() {
    return this.page.locator('.stat-card');
  }

  /** Individual delivery cards */
  get deliveryCards() {
    return this.page.locator('.bg-card.border.rounded-lg, .p-4.border.rounded-lg').filter({ hasText: /ORD-|#/ });
  }

  /** Search input for orders/customers */
  get searchInput() {
    return this.page.getByPlaceholder(/search/i).first();
  }

  /** Click a status filter button */
  async statusFilter(status: 'All' | 'Ready' | 'In Progress') {
    await this.page.getByRole('button', { name: new RegExp(`^${status}$`, 'i') }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Find a delivery card by order number or customer name */
  deliveryCard(identifier: string) {
    return this.deliveryCards.filter({ hasText: identifier });
  }

  /** Click "Start Delivery" on a specific delivery card */
  async startDelivery(identifier: string) {
    const card = this.deliveryCard(identifier);
    await card.locator('button').filter({ hasText: /start delivery/i }).click();
  }

  /** Click "Complete Delivery" on a specific delivery card */
  async completeDelivery(identifier: string) {
    const card = this.deliveryCard(identifier);
    await card.locator('button').filter({ hasText: /complete delivery/i }).click();
  }

  /** Click the refresh button */
  async refresh() {
    await this.page.getByRole('button', { name: /refresh/i }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
