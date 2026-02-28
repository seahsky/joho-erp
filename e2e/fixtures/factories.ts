// Re-export factories from the API test-utils package for use in E2E tests.
// These create real database records using the same patterns as integration tests.
export {
  createTestProduct,
  createTestProductWithBatches,
} from '../../packages/api/src/test-utils/factories/product';
export { createTestCustomer } from '../../packages/api/src/test-utils/factories/customer';
export { createTestOrder } from '../../packages/api/src/test-utils/factories/order';
export { createTestCompany } from '../../packages/api/src/test-utils/factories/company';
export { createTestSupplier } from '../../packages/api/src/test-utils/factories/supplier';
export { createTestCustomerPricing } from '../../packages/api/src/test-utils/factories/customer-pricing';
