import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class SettingsDriversPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/settings/drivers');
  }

  /** Driver rows in the assignment matrix */
  get driverRows() {
    return this.page.locator('[class*="grid"]').filter({ hasText: /@/ });
  }

  /** Area column headers */
  get areaColumns() {
    return this.page.locator('[class*="grid"]').first().locator('span, div').filter({ hasText: /Melbourne|Inner|North|South/ });
  }

  /** Assignment summary section at the bottom */
  get summarySection() {
    return this.page.locator('[class*="grid"]').filter({ hasText: /summary/i }).first();
  }

  /** Click a radio button to assign a driver to an area */
  async assignArea(driverName: string, areaName: string) {
    // Find the driver row, then click the area column's radio button
    const row = this.page.locator('[class*="grid"]').filter({ hasText: driverName });
    await row.getByRole('button').filter({ hasText: new RegExp(areaName, 'i') }).or(
      row.locator('button').nth(1) // Fallback to positional
    ).click();
  }

  /** Click the save button */
  async saveChanges() {
    await this.page.getByRole('button', { name: /save/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Check if save button is visible (only shows when changes are pending) */
  get saveButton() {
    return this.page.getByRole('button', { name: /save/i });
  }
}
