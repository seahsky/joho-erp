import { test, expect } from '../../fixtures';
import { SettingsDriversPage } from '../../page-objects';

test.describe('Settings - Driver Area Assignment', () => {
  test('should load driver area assignment page', async ({ adminPage }) => {
    const driversPage = new SettingsDriversPage(adminPage);
    await driversPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/settings\/drivers/);
  });

  test('should display seeded delivery areas', async ({ adminPage }) => {
    const driversPage = new SettingsDriversPage(adminPage);
    await driversPage.goto();
    await driversPage.waitForDataLoad();

    // The global setup seeds 3 areas: Melbourne CBD, Inner North, Inner South
    await expect(adminPage.getByText('Melbourne CBD')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Inner North')).toBeVisible();
    await expect(adminPage.getByText('Inner South')).toBeVisible();
  });
});
