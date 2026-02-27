import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['./src/test-utils/setup.ts'],
    testTimeout: 30000,
    env: {
      MONGODB_URI: 'mongodb://localhost:27017/joho-erp-test',
      CLERK_SECRET_KEY: 'test_clerk_secret_key',
      RESEND_API_KEY: 'test_resend_api_key',
      XERO_CLIENT_ID: 'test_xero_client_id',
      XERO_CLIENT_SECRET: 'test_xero_client_secret',
      TWILIO_ACCOUNT_SID: 'test_twilio_account_sid',
      TWILIO_AUTH_TOKEN: 'test_twilio_auth_token',
      TWILIO_PHONE_NUMBER: '+15555555555',
      R2_ACCOUNT_ID: 'test_r2_account_id',
      R2_ACCESS_KEY_ID: 'test_r2_access_key_id',
      R2_SECRET_ACCESS_KEY: 'test_r2_secret_access_key',
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://test-r2-public.example.com',
      MAPBOX_ACCESS_TOKEN: 'test_mapbox_access_token',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.integration.test.ts', 'src/types/**'],
    },
  },
});
