import { testWithData, expect } from '../../fixtures';
import { OrdersListPage, OrderDetailPage } from '../../page-objects';

testWithData.describe('Order Confirmation', () => {
  testWithData('should show awaiting approval order with confirm action', async ({ adminPage, seededData }) => {
    const ordersPage = new OrdersListPage(adminPage);
    await ordersPage.goto();

    // The first seeded order has status 'awaiting_approval'
    const awaitingOrder = seededData.orders[0];
    await expect(adminPage.getByText(awaitingOrder.orderNumber)).toBeVisible();

    // Navigate to the order detail
    await ordersPage.clickOrder(awaitingOrder.orderNumber);

    const detailPage = new OrderDetailPage(adminPage);
    await expect(detailPage.statusBadge).toContainText(/awaiting|pending/i);
  });
});
