import { test, expect } from '../../fixtures';
import { PricingPage } from '../../page-objects';

test.describe('Pricing Rules', () => {
  test('should load pricing page', async ({ adminPage }) => {
    const pricingPage = new PricingPage(adminPage);
    await pricingPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/pricing/);
  });
});
