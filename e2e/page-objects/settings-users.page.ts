import { BasePage } from './base.page';
import { type Page, expect } from '@playwright/test';

export class SettingsUsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/settings/users');
  }

  /** The 4 stat cards (total users, active, pending, admins) */
  get statsCards() {
    return this.page.locator('.stat-card, [class*="rounded-lg"]').filter({ hasText: /users|active|pending|admin/i });
  }

  /** User rows in the table */
  get userRows() {
    return this.page.locator('table tbody tr');
  }

  /** Search input for filtering users */
  get searchInput() {
    return this.page.getByPlaceholder(/search/i).first();
  }

  /** Open the invite user dialog */
  async openInviteDialog() {
    await this.page.getByRole('button', { name: /add user/i }).click();
    await expect(this.inviteDialog).toBeVisible({ timeout: 5_000 });
  }

  /** The invite user dialog */
  get inviteDialog() {
    return this.page.locator('[role="dialog"], .fixed.inset-0').filter({ hasText: /invite|add.*user/i }).first();
  }

  /** Fill and submit the invite user form */
  async inviteUser(firstName: string, lastName: string, email: string, role: string) {
    const dialog = this.inviteDialog;

    // Fill name fields
    await dialog.locator('input').nth(0).fill(firstName);
    await dialog.locator('input').nth(1).fill(lastName);
    // Fill email
    await dialog.locator('input[type="email"], input').nth(2).fill(email);
    // Select role
    await dialog.locator('select').selectOption(role);
    // Submit
    await dialog.getByRole('button', { name: /send invite|invite/i }).click();
  }

  /** Open the edit role dialog for a specific user */
  async editRole(userName: string, newRole: string) {
    const row = this.userRows.filter({ hasText: userName });
    await row.getByRole('button', { name: /edit role/i }).click();

    const dialog = this.page.locator('[role="dialog"], .fixed.inset-0').filter({ hasText: /edit.*role/i }).first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.locator('select').selectOption(newRole);
    await dialog.getByRole('button', { name: /update|save/i }).click();
  }

  /** Pending invitation cards */
  get pendingInvitations() {
    return this.page.locator('[class*="border"]').filter({ hasText: /pending/i });
  }

  /** Revoke a pending invitation */
  async revokeInvitation(email: string) {
    const card = this.pendingInvitations.filter({ hasText: email });
    await card.getByRole('button', { name: /revoke/i }).click();
  }
}
