const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jimmy-beef/api', '@jimmy-beef/database', '@jimmy-beef/shared'],
  // Enable standalone output for Docker deployments
  // This creates a minimal production server with all dependencies bundled
  output: 'standalone',
  // CRITICAL for monorepos: Trace dependencies from workspace root
  // This ensures all workspace packages are included in standalone build
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

module.exports = withNextIntl(nextConfig);
