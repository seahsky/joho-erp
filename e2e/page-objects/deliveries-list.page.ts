import { BasePage } from './base.page';
import { type Page, expect } from '@playwright/test';

export class DeliveriesListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/deliveries');
  }

  /** Set the delivery date filter */
  async selectDate(dateStr: string) {
    const datePicker = this.page.locator('input[type="date"]').first();
    await datePicker.fill(dateStr);
    // Wait for data to reload after date change
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDriver(driver: string) {
    await this.page.getByRole('combobox').or(this.page.locator('[data-testid="driver-filter"]')).first().click();
    await this.page.getByRole('option', { name: new RegExp(driver, 'i') }).click();
  }

  get deliveryRows() {
    return this.page.locator('table tbody tr, [class*="delivery-card"], [class*="delivery-row"]');
  }

  // --- Workflow methods ---

  /** Get all delivery cards (the clickable card elements in the delivery list) */
  get deliveryCards() {
    return this.page.locator('.p-4.border.rounded-lg');
  }

  /** Find a delivery card by customer name or order number */
  deliveryCard(identifier: string) {
    return this.deliveryCards.filter({ hasText: identifier });
  }

  /** Click the "Mark as Delivered" button on a specific delivery card */
  async markAsDelivered(identifier: string) {
    const card = this.deliveryCard(identifier);
    await card.locator('button').filter({ hasText: /mark as delivered/i }).click();
  }

  /** Confirm delivery in the MarkDeliveredDialog, optionally adding notes */
  async confirmDelivered(notes?: string) {
    // Wait for the dialog to appear
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Optionally fill notes
    if (notes) {
      await dialog.locator('textarea#notes').fill(notes);
    }

    // Click the confirm button (the non-outline button in the footer)
    await dialog.locator('button').filter({ hasText: /complet|confirm/i }).last().click();
  }

  /** Dismiss the delivered dialog */
  async cancelDeliveredDialog() {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.locator('button').filter({ hasText: /cancel/i }).click();
  }
}
