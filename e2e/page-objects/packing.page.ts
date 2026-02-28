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
    const datePicker = this.page.locator('input[type="date"]').first();
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

  // --- Workflow methods ---

  /** Find a packing order card by order number */
  orderCard(orderNumber: string) {
    // Cards are div.bg-card.border.rounded-lg containing the order number in a h3
    return this.page.locator('.bg-card.border.rounded-lg').filter({ hasText: orderNumber });
  }

  /** Toggle the packed checkbox for a specific item (by SKU) within an order card */
  async toggleItemPacked(orderNumber: string, sku: string) {
    const card = this.orderCard(orderNumber);
    // Find the item row containing the SKU, then click its checkbox button (Square/CheckSquare)
    const itemRow = card.locator('div').filter({ hasText: sku }).locator('button').first();
    await itemRow.click();
  }

  /** Adjust item quantity up or down within an order card */
  async adjustQuantity(orderNumber: string, sku: string, direction: 'increase' | 'decrease') {
    const card = this.orderCard(orderNumber);
    const itemSection = card.locator('div').filter({ hasText: sku });
    // The +/- buttons have h-7 w-7 p-0 classes; minus is first, plus is second
    const btnIndex = direction === 'decrease' ? 0 : 1;
    await itemSection.locator('button.h-7.w-7').nth(btnIndex).click();
  }

  /** Click "Mark as Ready" for a specific order card */
  async markOrderReady(orderNumber: string) {
    const card = this.orderCard(orderNumber);
    await card.locator('button').filter({ hasText: /mark as ready/i }).click();
  }

  /** Get the progress text (e.g., "2 / 3") for a specific order card */
  async getProgressText(orderNumber: string): Promise<string> {
    const card = this.orderCard(orderNumber);
    // Progress is in the header area as "{packedCount} / {items.length}"
    const progressEl = card.locator('.tabular-nums').filter({ hasText: /\d+\s*\/\s*\d+/ }).first();
    return (await progressEl.textContent()) ?? '';
  }

  /** Check if Mark as Ready button is enabled for an order */
  async isMarkReadyEnabled(orderNumber: string): Promise<boolean> {
    const card = this.orderCard(orderNumber);
    const btn = card.locator('button').filter({ hasText: /mark as ready/i });
    return !(await btn.isDisabled());
  }
}
