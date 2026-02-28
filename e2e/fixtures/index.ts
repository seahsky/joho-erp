// Use base fixture for tests that don't need seeded data
export { test, expect } from './base.fixture';

// Use data fixture for tests that need pre-seeded products, customers, orders
export { test as testWithData } from './data.fixture';
