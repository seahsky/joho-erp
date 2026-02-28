import { expect } from '@playwright/test';
import { testWithWorkflowData as test } from '../../fixtures';
import { DeliveriesListPage } from '../../page-objects';
import { tomorrowISO } from '../../helpers/date-utils';

test.describe('Delivery Workflow', () => {
  test('display ready for delivery orders', async ({ adminPage, workflowData }) => {
    const deliveriesPage = new DeliveriesListPage(adminPage);
    await deliveriesPage.goto();
    await deliveriesPage.waitForDataLoad();

    // Set date filter to tomorrow (when our test orders are scheduled)
    await deliveriesPage.selectDate(tomorrowISO());
    await deliveriesPage.waitForDataLoad();

    // Verify the ready_for_delivery order appears
    const customerName = workflowData.customer.businessName;
    const card = deliveriesPage.deliveryCard(customerName);
    await expect(card.first()).toBeVisible({ timeout: 15_000 });

    // Verify it shows ready_for_delivery status
    await expect(card.first()).toContainText(/ready/i);
  });

  test('mark delivered with notes', async ({ adminPage, workflowData }) => {
    const deliveriesPage = new DeliveriesListPage(adminPage);
    await deliveriesPage.goto();
    await deliveriesPage.waitForDataLoad();

    // Set date filter
    await deliveriesPage.selectDate(tomorrowISO());
    await deliveriesPage.waitForDataLoad();

    const customerName = workflowData.customer.businessName;

    // Click Mark as Delivered on the order
    await deliveriesPage.markAsDelivered(customerName);

    // Confirm with notes
    await deliveriesPage.confirmDelivered('Delivered to reception desk - E2E test');

    // Verify success toast
    await deliveriesPage.expectToast(/delivered/i);
  });
});
