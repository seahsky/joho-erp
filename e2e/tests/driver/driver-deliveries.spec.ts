import { testWithSettingsData, expect } from '../../fixtures';
import { DriverDeliveriesPage } from '../../page-objects';

testWithSettingsData.describe('Driver Deliveries', () => {
  testWithSettingsData('should load driver page and display stat cards', async ({ adminPage }) => {
    const driverPage = new DriverDeliveriesPage(adminPage);
    await driverPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/driver/);

    // Should display stat cards
    const statCards = driverPage.statsCards;
    await expect(statCards).toHaveCount(4);
  });

  testWithSettingsData('should filter deliveries by status', async ({ adminPage }) => {
    const driverPage = new DriverDeliveriesPage(adminPage);
    await driverPage.goto();

    // Click "Ready" filter
    await driverPage.statusFilter('Ready');

    // Click "In Progress" filter
    await driverPage.statusFilter('In Progress');

    // Click "All" to reset
    await driverPage.statusFilter('All');
  });

  testWithSettingsData('should display delivery card with order details', async ({ adminPage, settingsData }) => {
    const driverPage = new DriverDeliveriesPage(adminPage);
    await driverPage.goto();

    // The seeded order should appear in delivery cards
    const orderNumber = settingsData.deliveryOrder.orderNumber;
    const card = driverPage.deliveryCard(orderNumber);

    // Card should show order number
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Card should show customer name
    await expect(card).toContainText(settingsData.customer.businessName);
  });

  testWithSettingsData('should search deliveries', async ({ adminPage }) => {
    const driverPage = new DriverDeliveriesPage(adminPage);
    await driverPage.goto();

    // Type in search input
    await driverPage.searchInput.fill('nonexistent-order-12345');
    await adminPage.waitForTimeout(500);

    // Clear search
    await driverPage.searchInput.clear();
  });
});
