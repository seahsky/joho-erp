import { test, expect } from '../fixtures';
import { DashboardPage } from '../page-objects';

test.describe('Dashboard', () => {
  test('should load dashboard with stat bar and order status cards', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    // Dashboard page should load
    await expect(adminPage).toHaveURL(/\/en\/dashboard/);

    // Stat bar should be visible
    await expect(dashboard.statBar).toBeVisible();

    // Order status section should be visible
    await expect(dashboard.orderStatusCards.first()).toBeVisible();
  });

  test('should display recent orders section', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    await expect(dashboard.recentOrders).toBeVisible();
  });
});
