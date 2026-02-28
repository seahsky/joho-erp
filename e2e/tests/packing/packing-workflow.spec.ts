import { test, expect } from '../../fixtures';
import { PackingPage } from '../../page-objects';

test.describe('Packing Workflow', () => {
  test('should load packing page', async ({ adminPage }) => {
    const packingPage = new PackingPage(adminPage);
    await packingPage.goto();

    await expect(adminPage).toHaveURL(/\/en\/packing/);
  });
});
