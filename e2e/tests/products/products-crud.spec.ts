import { testWithData, expect } from '../../fixtures';
import { ProductsPage } from '../../page-objects';

testWithData.describe('Products CRUD', () => {
  testWithData('should list products on the products page', async ({ adminPage, seededData }) => {
    const productsPage = new ProductsPage(adminPage);
    await productsPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/products/);

    // Should show seeded products
    await expect(adminPage.getByText(seededData.products[0].name)).toBeVisible();
    await expect(adminPage.getByText(seededData.products[1].name)).toBeVisible();
  });

  testWithData('should display product prices in AUD format', async ({ adminPage, seededData }) => {
    const productsPage = new ProductsPage(adminPage);
    await productsPage.goto();

    // Product prices should be formatted as AUD (e.g., $25.00)
    await expect(adminPage.getByText('$25.00')).toBeVisible();
    await expect(adminPage.getByText('$18.00')).toBeVisible();
  });
});
