// Use base fixture for tests that don't need seeded data
export { test, expect } from './base.fixture';

// Use data fixture for tests that need pre-seeded products, customers, orders
export { test as testWithData } from './data.fixture';

// Use workflow fixture for tests that need products with inventory batches and orders at various stages
export { test as testWithWorkflowData } from './workflow.fixture';

// Use settings fixture for tests that need a ready-for-delivery order (driver page)
export { test as testWithSettingsData } from './settings.fixture';
