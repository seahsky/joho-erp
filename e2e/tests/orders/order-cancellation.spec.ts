import { expect } from '@playwright/test';
import { testWithWorkflowData as test } from '../../fixtures';
import { OrderDetailPage } from '../../page-objects';

test.describe('Order Cancellation', () => {
  test('cancel from awaiting_approval', async ({ adminPage, workflowData }) => {
    const orderPage = new OrderDetailPage(adminPage);
    await orderPage.goto(workflowData.orders.awaitingApproval.id);
    await orderPage.waitForDataLoad();

    // Click Cancel Order
    await orderPage.cancelOrder();

    // Confirm in the dialog
    await orderPage.confirmCancellation();

    // Verify toast
    await orderPage.expectToast(/status updated|cancelled/i);

    // Reload and verify status
    await adminPage.reload();
    await orderPage.waitForDataLoad();
    await expect(orderPage.statusBadge).toContainText(/cancelled/i, { timeout: 10_000 });
  });

  test('cancel from confirmed', async ({ adminPage, workflowData }) => {
    const orderPage = new OrderDetailPage(adminPage);
    await orderPage.goto(workflowData.orders.confirmed.id);
    await orderPage.waitForDataLoad();

    // Click Cancel Order
    await orderPage.cancelOrder();

    // Confirm in the dialog
    await orderPage.confirmCancellation();

    // Verify toast
    await orderPage.expectToast(/status updated|cancelled/i);

    // Reload and verify status
    await adminPage.reload();
    await orderPage.waitForDataLoad();
    await expect(orderPage.statusBadge).toContainText(/cancelled/i, { timeout: 10_000 });
  });

  test('cancel dialog shows confirmation and can be dismissed', async ({ adminPage, workflowData }) => {
    const orderPage = new OrderDetailPage(adminPage);
    await orderPage.goto(workflowData.orders.awaitingApproval.id);
    await orderPage.waitForDataLoad();

    // Click Cancel Order to open dialog
    await orderPage.cancelOrder();

    // Verify dialog is visible
    const dialog = adminPage.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Verify dialog contains confirmation text
    await expect(dialog).toContainText(/cancel/i);

    // Dismiss by clicking "Keep Order"
    await orderPage.dismissCancelDialog();

    // Verify dialog is gone
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });
});
