import { expect } from '@playwright/test';
import { testWithWorkflowData as test } from '../../fixtures';
import { OrderDetailPage } from '../../page-objects';

test.describe('Order Status Transitions', () => {
  test('transition awaiting_approval to confirmed', async ({ adminPage, workflowData }) => {
    const orderPage = new OrderDetailPage(adminPage);
    await orderPage.goto(workflowData.orders.awaitingApproval.id);
    await orderPage.waitForDataLoad();

    // Select Confirmed from dropdown and click update
    await orderPage.updateStatus('Confirmed');

    // Verify success toast
    await orderPage.expectToast(/status updated/i);

    // Reload and verify badge
    await adminPage.reload();
    await orderPage.waitForDataLoad();
    await expect(orderPage.statusBadge).toContainText(/confirmed/i, { timeout: 10_000 });
  });

  test('show only valid forward transitions', async ({ adminPage, workflowData }) => {
    const orderPage = new OrderDetailPage(adminPage);
    await orderPage.goto(workflowData.orders.confirmed.id);
    await orderPage.waitForDataLoad();

    // Get available status options
    const options = await orderPage.getStatusDropdownOptions();

    // Confirmed should not allow going back to awaiting_approval
    // It should allow forward transitions like packing, ready_for_delivery, etc.
    const optionTexts = options.map((o) => o.toLowerCase());

    // Should NOT contain the current status
    expect(optionTexts).not.toContain('confirmed');

    // Should allow forward transitions
    expect(optionTexts.some((o) => o.includes('packing') || o.includes('ready') || o.includes('deliver'))).toBe(true);
  });
});
