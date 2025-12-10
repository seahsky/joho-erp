const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@joho-erp/api', '@joho-erp/database', '@joho-erp/shared'],
  // Enable standalone output for Docker deployments
  // This creates a minimal production server with all dependencies bundled
  output: 'standalone'
};

module.exports = withNextIntl(nextConfig);
