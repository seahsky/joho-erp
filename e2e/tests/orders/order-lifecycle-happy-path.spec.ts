import { expect } from '@playwright/test';
import { testWithWorkflowData as test } from '../../fixtures';
import { OrderCreatePage, OrdersListPage, OrderDetailPage, PackingPage, DeliveriesListPage } from '../../page-objects';
import { tomorrowISO } from '../../helpers/date-utils';

test.describe.serial('Order Lifecycle Happy Path', () => {
  test('create order via admin UI', async ({ adminPage, workflowData }) => {
    const createPage = new OrderCreatePage(adminPage);
    await createPage.goto();
    await createPage.waitForDataLoad();

    // Select the seeded customer
    await createPage.selectCustomer(workflowData.customer.businessName);

    // Wait for product section to appear after customer selection
    await adminPage.waitForLoadState('networkidle');

    // Add first product
    await createPage.addProductToOrder(workflowData.products[0].product.sku, 3);

    // Set delivery date to tomorrow
    await createPage.setDeliveryDate(tomorrowISO());

    // Submit
    await createPage.submitOrder();

    // Verify success toast
    await createPage.expectToast(/order created/i);

    // Navigate to orders list and verify order appears
    const ordersPage = new OrdersListPage(adminPage);
    await ordersPage.goto();
    await ordersPage.waitForDataLoad();

    // The most recent order should contain our customer name
    const rows = ordersPage.orderRows;
    const customerRow = rows.filter({ hasText: workflowData.customer.businessName }).first();
    await expect(customerRow).toBeVisible({ timeout: 10_000 });
  });

  test('confirm the order', async ({ adminPage, workflowData }) => {
    // Use the seeded awaiting_approval order since serial tests may not reliably share state
    const orderPage = new OrderDetailPage(adminPage);
    await orderPage.goto(workflowData.orders.awaitingApproval.id);
    await orderPage.waitForDataLoad();

    // Update status to Confirmed
    await orderPage.updateStatus('Confirmed');

    // Verify toast
    await orderPage.expectToast(/status updated/i);

    // Reload and verify the status badge changed
    await adminPage.reload();
    await orderPage.waitForDataLoad();
    const badge = orderPage.statusBadge;
    await expect(badge).toContainText(/confirmed/i, { timeout: 10_000 });
  });

  test('pack all items and mark ready', async ({ adminPage, workflowData }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();
    await packingPage.waitForDataLoad();

    // Set date to tomorrow (delivery date of our orders)
    await packingPage.selectDate(tomorrowISO());
    await adminPage.waitForLoadState('networkidle');
    await packingPage.waitForDataLoad();

    const orderNumber = workflowData.orders.confirmed.orderNumber;

    // Wait for the order card to appear
    const card = packingPage.orderCard(orderNumber);
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Toggle all items as packed
    const items = workflowData.orders.confirmed.items as Array<{ sku: string }>;
    for (const item of items) {
      await packingPage.toggleItemPacked(orderNumber, item.sku);
    }

    // Click Mark as Ready
    await packingPage.markOrderReady(orderNumber);

    // Verify success toast
    await packingPage.expectToast(/order ready/i);
  });

  test('mark delivered from deliveries page', async ({ adminPage, workflowData }) => {
    const deliveriesPage = new DeliveriesListPage(adminPage);
    await deliveriesPage.goto();
    await deliveriesPage.waitForDataLoad();

    // Use the seeded ready_for_delivery order
    const customerName = workflowData.customer.businessName;

    // Find the delivery card for our ready_for_delivery order
    const card = deliveriesPage.deliveryCard(customerName);

    // If card is not visible, try setting the date filter
    if (!(await card.isVisible().catch(() => false))) {
      await deliveriesPage.selectDate(tomorrowISO());
      await deliveriesPage.waitForDataLoad();
    }

    // Click Mark as Delivered
    await deliveriesPage.markAsDelivered(customerName);

    // Confirm in dialog with a note
    await deliveriesPage.confirmDelivered('E2E test delivery completed');

    // Verify success toast
    await deliveriesPage.expectToast(/delivered/i);
  });
});
