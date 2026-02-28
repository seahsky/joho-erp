import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class SettingsPermissionsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/settings/permissions');
  }

  /** Role selector buttons */
  get roleSelector() {
    return this.page.getByRole('button').filter({ hasText: /sales|manager|packer|driver/i });
  }

  /** Select a role from the role selector */
  async selectRole(role: 'sales' | 'manager' | 'packer' | 'driver') {
    await this.page.getByRole('button', { name: new RegExp(`^${role}$`, 'i') }).click();
    await this.waitForDataLoad();
  }

  /** Permission module cards */
  get permissionModules() {
    return this.page.locator('.bg-card, [class*="rounded-lg"]').filter({ hasText: /permissions enabled/i });
  }

  /** Toggle a permission checkbox by its code */
  async togglePermission(code: string) {
    const checkbox = this.page.locator(`input[id="${code}"], label[for="${code}"]`).first();
    await checkbox.click();
  }

  /** The floating save bar at the bottom */
  get saveBar() {
    return this.page.locator('.fixed.bottom-0, [class*="fixed"][class*="bottom"]').filter({ hasText: /unsaved|save/i });
  }

  /** Click save in the save bar */
  async saveChanges() {
    await this.page.getByRole('button', { name: /^save$/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Click discard in the save bar */
  async discardChanges() {
    await this.page.getByRole('button', { name: /discard/i }).click();
  }

  /** Click the reset to defaults button */
  async resetToDefaults() {
    await this.page.getByRole('button', { name: /reset/i }).click();
  }

  /** Get the access level badge text for a module */
  moduleAccessBadge(moduleName: string) {
    const module = this.permissionModules.filter({ hasText: new RegExp(moduleName, 'i') });
    return module.locator('[class*="badge"], span').filter({ hasText: /full access|partial access|no access/i }).first();
  }
}
