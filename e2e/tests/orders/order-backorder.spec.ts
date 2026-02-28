import { testWithData, expect } from '../../fixtures';
import { OrdersListPage } from '../../page-objects';

testWithData.describe('Order Backorder', () => {
  testWithData('should display orders page for backorder management', async ({ adminPage }) => {
    const ordersPage = new OrdersListPage(adminPage);
    await ordersPage.goto();

    // Orders page should load successfully
    await expect(adminPage).toHaveURL(/\/en\/orders/);
    await expect(ordersPage.orderRows.first()).toBeVisible();
  });
});
