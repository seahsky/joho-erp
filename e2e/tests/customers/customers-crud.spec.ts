import { testWithData, expect } from '../../fixtures';
import { CustomersListPage, CustomerDetailPage } from '../../page-objects';

testWithData.describe('Customers CRUD', () => {
  testWithData('should list customers on the customers page', async ({ adminPage, seededData }) => {
    const customersPage = new CustomersListPage(adminPage);
    await customersPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/customers/);

    // Should show seeded customers
    await expect(adminPage.getByText(seededData.customers[0].businessName)).toBeVisible();
    await expect(adminPage.getByText(seededData.customers[1].businessName)).toBeVisible();
  });

  testWithData('should navigate to customer detail', async ({ adminPage, seededData }) => {
    const customersPage = new CustomersListPage(adminPage);
    await customersPage.goto();

    // Click on the first customer
    await customersPage.clickCustomer(seededData.customers[0].businessName);

    // Should navigate to customer detail page
    await expect(adminPage).toHaveURL(new RegExp(`/customers/${seededData.customers[0].id}`));

    const detailPage = new CustomerDetailPage(adminPage);
    await expect(detailPage.businessName).toContainText(seededData.customers[0].businessName);
  });
});
