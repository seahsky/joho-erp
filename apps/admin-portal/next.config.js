const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@joho-erp/api', '@joho-erp/database', '@joho-erp/shared'],
  // Enable standalone output for Docker deployments
  // This creates a minimal production server with all dependencies bundled
  output: 'standalone',
  images: {
    remotePatterns: [
      // Clerk user profile images
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      // Google OAuth profile images (in case Clerk returns original URL)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Increase body size limit for image uploads (max 2MB images + form overhead)
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
    optimizePackageImports: ['@joho-erp/ui', '@joho-erp/shared', 'lucide-react', 'recharts'],
  },
  // Externalize optional MongoDB dependencies used by Agenda
  webpack: (config, { isServer }) => {
    if (isServer) {
      // These are optional peer dependencies of mongodb driver
      config.externals = config.externals || [];
      config.externals.push({
        'snappy': 'commonjs snappy',
        'snappy/package.json': 'commonjs snappy/package.json',
        'aws4': 'commonjs aws4',
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
        '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
        'kerberos': 'commonjs kerberos',
        '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
      });
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
