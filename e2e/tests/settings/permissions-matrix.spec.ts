import { test, expect } from '../../fixtures';
import { SettingsPermissionsPage } from '../../page-objects';

test.describe('Settings - Permissions Matrix', () => {
  test('should load permissions page and display role selector', async ({ adminPage }) => {
    const permissionsPage = new SettingsPermissionsPage(adminPage);
    await permissionsPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/settings\/permissions/);
    await permissionsPage.waitForDataLoad();

    // Role selector buttons should be visible
    await expect(adminPage.getByRole('button', { name: /sales/i })).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('button', { name: /manager/i })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /packer/i })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /driver/i })).toBeVisible();
  });

  test('should select a role and display permission modules', async ({ adminPage }) => {
    const permissionsPage = new SettingsPermissionsPage(adminPage);
    await permissionsPage.goto();
    await permissionsPage.waitForDataLoad();

    // Select the "sales" role
    await permissionsPage.selectRole('sales');

    // Permission modules should appear
    const modules = permissionsPage.permissionModules;
    await expect(modules.first()).toBeVisible({ timeout: 10_000 });

    // Should show at least one module with permissions count
    await expect(adminPage.getByText(/permissions enabled/i).first()).toBeVisible();
  });

  test('should toggle a permission and show save bar', async ({ adminPage }) => {
    const permissionsPage = new SettingsPermissionsPage(adminPage);
    await permissionsPage.goto();
    await permissionsPage.waitForDataLoad();

    // Select a role first
    await permissionsPage.selectRole('sales');
    await expect(permissionsPage.permissionModules.first()).toBeVisible({ timeout: 10_000 });

    // Find and click the first permission checkbox
    const firstCheckbox = adminPage.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();

    // Save bar should appear with unsaved changes
    await expect(permissionsPage.saveBar).toBeVisible({ timeout: 5_000 });
  });

  test('should save permission changes and show success toast', async ({ adminPage }) => {
    const permissionsPage = new SettingsPermissionsPage(adminPage);
    await permissionsPage.goto();
    await permissionsPage.waitForDataLoad();

    await permissionsPage.selectRole('sales');
    await expect(permissionsPage.permissionModules.first()).toBeVisible({ timeout: 10_000 });

    // Toggle a permission
    const firstCheckbox = adminPage.locator('input[type="checkbox"]').first();
    const wasChecked = await firstCheckbox.isChecked();
    await firstCheckbox.click();

    // Save changes
    await permissionsPage.saveChanges();
    await permissionsPage.expectToast(/save|success/i);

    // Restore the original state
    await permissionsPage.selectRole('sales');
    await expect(permissionsPage.permissionModules.first()).toBeVisible({ timeout: 10_000 });
    const sameCheckbox = adminPage.locator('input[type="checkbox"]').first();
    const nowChecked = await sameCheckbox.isChecked();
    if (nowChecked !== wasChecked) {
      await sameCheckbox.click();
      await permissionsPage.saveChanges();
    }
  });

  test('should reset permissions to defaults', async ({ adminPage }) => {
    const permissionsPage = new SettingsPermissionsPage(adminPage);
    await permissionsPage.goto();
    await permissionsPage.waitForDataLoad();

    await permissionsPage.selectRole('sales');
    await expect(permissionsPage.permissionModules.first()).toBeVisible({ timeout: 10_000 });

    // Click reset to defaults
    await permissionsPage.resetToDefaults();

    // Should show a success toast or confirmation
    await permissionsPage.expectToast(/reset|success|default/i);
  });
});
