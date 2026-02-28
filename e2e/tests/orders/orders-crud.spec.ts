import { testWithData, expect } from '../../fixtures';
import { OrdersListPage, OrderDetailPage } from '../../page-objects';

testWithData.describe('Orders CRUD', () => {
  testWithData('should list orders on the orders page', async ({ adminPage, seededData }) => {
    const ordersPage = new OrdersListPage(adminPage);
    await ordersPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/orders/);

    // Should show seeded orders
    await expect(adminPage.getByText(seededData.orders[0].orderNumber)).toBeVisible();
    await expect(adminPage.getByText(seededData.orders[1].orderNumber)).toBeVisible();
  });

  testWithData('should navigate to order detail', async ({ adminPage, seededData }) => {
    const ordersPage = new OrdersListPage(adminPage);
    await ordersPage.goto();

    // Click on the first order
    await ordersPage.clickOrder(seededData.orders[0].orderNumber);

    // Should navigate to order detail page
    await expect(adminPage).toHaveURL(new RegExp(`/orders/${seededData.orders[0].id}`));

    // Order detail should show the order number
    const detailPage = new OrderDetailPage(adminPage);
    await expect(detailPage.orderNumber).toContainText(seededData.orders[0].orderNumber);
  });
});
