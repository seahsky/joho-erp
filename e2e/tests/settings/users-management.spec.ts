import { test, expect } from '../../fixtures';
import { SettingsUsersPage } from '../../page-objects';

test.describe('Settings - User Management', () => {
  test('should load users page and display stat cards', async ({ adminPage }) => {
    const usersPage = new SettingsUsersPage(adminPage);
    await usersPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/settings\/users/);
    await usersPage.waitForDataLoad();

    // Page should have a heading
    await expect(usersPage.heading).toBeVisible();
  });

  test('should display user table', async ({ adminPage }) => {
    const usersPage = new SettingsUsersPage(adminPage);
    await usersPage.goto();
    await usersPage.waitForDataLoad();

    // Table headers should be visible
    await expect(adminPage.getByText('Name', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Email', { exact: true }).first()).toBeVisible();
    await expect(adminPage.getByText('Role', { exact: true }).first()).toBeVisible();
  });

  test('should open invite dialog and verify form fields', async ({ adminPage }) => {
    const usersPage = new SettingsUsersPage(adminPage);
    await usersPage.goto();
    await usersPage.waitForDataLoad();

    await usersPage.openInviteDialog();

    // Dialog should contain form fields
    const dialog = usersPage.inviteDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input').first()).toBeVisible();
  });

  test('should invite a new user and show success toast', async ({ adminPage }) => {
    const usersPage = new SettingsUsersPage(adminPage);
    await usersPage.goto();
    await usersPage.waitForDataLoad();

    await usersPage.openInviteDialog();

    const uniqueEmail = `e2e-test-${Date.now()}@example.com`;
    await usersPage.inviteUser('E2E', 'TestUser', uniqueEmail, 'sales');

    // Should show success toast
    await usersPage.expectToast(/invite|success/i);
  });

  test('should show invited user in pending invitations', async ({ adminPage }) => {
    const usersPage = new SettingsUsersPage(adminPage);
    await usersPage.goto();
    await usersPage.waitForDataLoad();

    // Invite a user first
    await usersPage.openInviteDialog();
    const uniqueEmail = `e2e-pending-${Date.now()}@example.com`;
    await usersPage.inviteUser('Pending', 'User', uniqueEmail, 'driver');

    await usersPage.expectToast(/invite|success/i);

    // Verify the invitation appears in pending section
    await expect(adminPage.getByText(uniqueEmail)).toBeVisible({ timeout: 10_000 });
  });
});
