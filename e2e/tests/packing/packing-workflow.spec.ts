import { test, expect } from '../../fixtures';
import { testWithWorkflowData as testWorkflow } from '../../fixtures';
import { PackingPage } from '../../page-objects';
import { tomorrowISO } from '../../helpers/date-utils';

test.describe('Packing Workflow', () => {
  test('should load packing page', async ({ adminPage }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/packing/);
  });
});

testWorkflow.describe('Packing Workflow - Order Interactions', () => {
  testWorkflow('mark items as packed and verify progress updates', async ({ adminPage, workflowData }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();
    await packingPage.waitForDataLoad();

    // Set date to tomorrow
    await packingPage.selectDate(tomorrowISO());
    await adminPage.waitForLoadState('networkidle');
    await packingPage.waitForDataLoad();

    const orderNumber = workflowData.orders.confirmed.orderNumber;
    const card = packingPage.orderCard(orderNumber);
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Get initial progress
    const initialProgress = await packingPage.getProgressText(orderNumber);
    expect(initialProgress).toContain('0');

    // Toggle first item
    const items = workflowData.orders.confirmed.items as Array<{ sku: string }>;
    await packingPage.toggleItemPacked(orderNumber, items[0].sku);

    // Wait for optimistic update
    await adminPage.waitForTimeout(500);

    // Verify progress changed
    const updatedProgress = await packingPage.getProgressText(orderNumber);
    expect(updatedProgress).toContain('1');
  });

  testWorkflow('adjust quantity down', async ({ adminPage, workflowData }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();
    await packingPage.waitForDataLoad();

    await packingPage.selectDate(tomorrowISO());
    await adminPage.waitForLoadState('networkidle');
    await packingPage.waitForDataLoad();

    const orderNumber = workflowData.orders.confirmed.orderNumber;
    const card = packingPage.orderCard(orderNumber);
    await expect(card).toBeVisible({ timeout: 15_000 });

    const items = workflowData.orders.confirmed.items as Array<{ sku: string; quantity: number }>;
    const firstItem = items[0];

    // Click the minus button
    await packingPage.adjustQuantity(orderNumber, firstItem.sku, 'decrease');

    // Wait for update
    await adminPage.waitForTimeout(1000);

    // Verify toast notification
    await packingPage.expectToast(/quantity updated/i);
  });

  testWorkflow('cannot mark ready with unpacked items', async ({ adminPage, workflowData }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();
    await packingPage.waitForDataLoad();

    await packingPage.selectDate(tomorrowISO());
    await adminPage.waitForLoadState('networkidle');
    await packingPage.waitForDataLoad();

    const orderNumber = workflowData.orders.confirmed.orderNumber;
    const card = packingPage.orderCard(orderNumber);
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Attempt to mark as ready without packing all items
    await packingPage.markOrderReady(orderNumber);

    // Should show error toast about checking all items
    await packingPage.expectToast(/check all items|must check/i);
  });

  testWorkflow('mark ready after all items packed', async ({ adminPage, workflowData }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();
    await packingPage.waitForDataLoad();

    await packingPage.selectDate(tomorrowISO());
    await adminPage.waitForLoadState('networkidle');
    await packingPage.waitForDataLoad();

    const orderNumber = workflowData.orders.confirmed.orderNumber;
    const card = packingPage.orderCard(orderNumber);
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Pack all items
    const items = workflowData.orders.confirmed.items as Array<{ sku: string }>;
    for (const item of items) {
      await packingPage.toggleItemPacked(orderNumber, item.sku);
      await adminPage.waitForTimeout(300);
    }

    // Now mark as ready
    await packingPage.markOrderReady(orderNumber);

    // Verify success toast
    await packingPage.expectToast(/order ready/i);
  });
});
