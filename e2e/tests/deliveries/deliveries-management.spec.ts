import { test, expect } from '../../fixtures';
import { DeliveriesListPage } from '../../page-objects';

test.describe('Deliveries Management', () => {
  test('should load deliveries page', async ({ adminPage }) => {
    const deliveriesPage = new DeliveriesListPage(adminPage);
    await deliveriesPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/deliveries/);
  });
});
