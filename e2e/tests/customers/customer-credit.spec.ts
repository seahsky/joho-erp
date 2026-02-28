import { testWithData, expect } from '../../fixtures';
import { CustomerDetailPage } from '../../page-objects';

testWithData.describe('Customer Credit', () => {
  testWithData('should display customer credit information', async ({ adminPage, seededData }) => {
    const detailPage = new CustomerDetailPage(adminPage);
    await detailPage.goto(seededData.customers[0].id);

    // Customer detail page should load
    await expect(detailPage.businessName).toContainText(seededData.customers[0].businessName);

    // Credit status should be visible
    await expect(detailPage.creditStatus.first()).toBeVisible();
  });
});
