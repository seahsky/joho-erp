const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jimmy-beef/api', '@jimmy-beef/database', '@jimmy-beef/shared'],
  // Enable standalone output for Docker deployments
  // This creates a minimal production server with all dependencies bundled
  output: 'standalone'
};

module.exports = withNextIntl(nextConfig);
