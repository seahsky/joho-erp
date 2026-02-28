import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load E2E test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const baseURL = 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: {
      'x-e2e-user-id': 'e2e-admin-user',
      'x-e2e-user-role': 'admin',
      'x-e2e-user-name': 'E2E Admin',
      'x-e2e-session-id': 'e2e-session',
    },
  },
  globalSetup: './setup/global-setup.ts',
  globalTeardown: './setup/global-teardown.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter admin-portal dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_TESTING: 'true',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/joho-erp-e2e',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_e2e_dummy_key',
      CLERK_SECRET_KEY: 'sk_test_e2e_dummy_key',
      RESEND_API_KEY: 'test_resend_key',
      XERO_CLIENT_ID: 'test_xero_client_id',
      XERO_CLIENT_SECRET: 'test_xero_client_secret',
      TWILIO_ACCOUNT_SID: 'test_twilio_sid',
      TWILIO_AUTH_TOKEN: 'test_twilio_token',
      TWILIO_PHONE_NUMBER: '+10000000000',
      R2_ACCOUNT_ID: 'test_r2_account',
      R2_ACCESS_KEY_ID: 'test_r2_key',
      R2_SECRET_ACCESS_KEY: 'test_r2_secret',
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://test-r2.example.com',
      MAPBOX_ACCESS_TOKEN: 'test_mapbox_token',
    },
  },
});
