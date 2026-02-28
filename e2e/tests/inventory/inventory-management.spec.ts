import { test, expect } from '../../fixtures';
import { InventoryPage } from '../../page-objects';

test.describe('Inventory Management', () => {
  test('should load inventory page', async ({ adminPage }) => {
    const inventoryPage = new InventoryPage(adminPage);
    await inventoryPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/inventory/);
  });
});
