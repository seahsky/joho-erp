import { BasePage } from './base.page';
import { type Page } from '@playwright/test';

export class OrderCreatePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/orders/create');
  }

  /** Select a customer from the dropdown by visible text (business name) */
  async selectCustomer(businessName: string) {
    const select = this.page.locator('select#customer');
    // Wait for options to load (more than just the placeholder)
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement | null;
        return el && el.options.length > 1;
      },
      'select#customer',
      { timeout: 15_000 }
    );
    // Find the option whose text contains the business name and select by value
    const optionValue = await select.locator('option').filter({ hasText: businessName }).first().getAttribute('value');
    if (optionValue) await select.selectOption(optionValue);
  }

  /** Select a product from the dropdown by SKU */
  async selectProduct(sku: string) {
    const select = this.page.locator('select#product');
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement | null;
        return el && el.options.length > 1;
      },
      'select#product',
      { timeout: 15_000 }
    );
    // Find the option whose text contains the SKU and select by value
    const optionValue = await select.locator('option').filter({ hasText: sku }).first().getAttribute('value');
    if (optionValue) await select.selectOption(optionValue);
  }

  /** Set the quantity for the current product */
  async setQuantity(qty: number) {
    const input = this.page.locator('input#quantity');
    await input.fill(String(qty));
  }

  /** Click the Add Item button */
  async addItem() {
    await this.page.locator('button[type="button"]').filter({ hasText: /add to order/i }).click();
  }

  /** Set the delivery date (YYYY-MM-DD format) */
  async setDeliveryDate(dateStr: string) {
    const input = this.page.locator('input#deliveryDate');
    await input.fill(dateStr);
  }

  /** Submit the order creation form */
  async submitOrder() {
    await this.page.locator('button[type="submit"]').filter({ hasText: /create order/i }).click();
  }

  /** Get the list of added order items */
  get orderItems() {
    return this.page.locator('.bg-muted.rounded-md').filter({ has: this.page.locator('.font-medium') });
  }

  /** Add a product to the order in one step */
  async addProductToOrder(sku: string, quantity: number) {
    await this.selectProduct(sku);
    await this.setQuantity(quantity);
    await this.addItem();
  }
}
