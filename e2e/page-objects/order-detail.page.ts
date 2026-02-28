import { BasePage } from './base.page';
import { type Page, expect } from '@playwright/test';

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

  // --- Workflow methods ---

  /** The status update select dropdown (inside the Actions card) */
  private get statusSelect() {
    return this.page.locator('select').filter({ has: this.page.locator('option') }).last();
  }

  /** The update status button (adjacent to the select) */
  private get updateStatusButton() {
    // The button with RefreshCw icon next to the select, inside a flex gap-2 div
    return this.statusSelect.locator('..').locator('button').first();
  }

  /** Select a new status from the dropdown and click update */
  async updateStatus(statusLabel: string) {
    const select = this.statusSelect;
    await select.selectOption({ label: statusLabel });
    await this.updateStatusButton.click();
  }

  /** Get all available status options from the dropdown */
  async getStatusDropdownOptions(): Promise<string[]> {
    const options = this.statusSelect.locator('option');
    const count = await options.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text) labels.push(text.trim());
    }
    return labels;
  }

  /** Click the Cancel Order button (destructive, full-width) */
  async cancelOrder() {
    await this.page.locator('button').filter({ hasText: /cancel order/i }).click();
  }

  /** Confirm cancellation in the AlertDialog */
  async confirmCancellation() {
    // The AlertDialogAction with destructive styling
    const dialog = this.page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.locator('button').filter({ hasText: /confirm|yes.*cancel/i }).click();
  }

  /** Dismiss the cancel dialog by clicking "Keep Order" */
  async dismissCancelDialog() {
    const dialog = this.page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.locator('button').filter({ hasText: /keep order/i }).click();
  }
}
