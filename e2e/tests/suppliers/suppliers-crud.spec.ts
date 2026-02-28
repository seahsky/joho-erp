import { testWithData, expect } from '../../fixtures';
import { SuppliersListPage } from '../../page-objects';

testWithData.describe('Suppliers CRUD', () => {
  testWithData('should list suppliers on the suppliers page', async ({ adminPage, seededData }) => {
    const suppliersPage = new SuppliersListPage(adminPage);
    await suppliersPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/suppliers/);

    // Should show seeded supplier
    await expect(adminPage.getByText(seededData.suppliers[0].businessName)).toBeVisible();
  });
});
