const withNextIntl = require('next-intl/plugin')('./i18n/request.ts');

// Extract hostname from R2_PUBLIC_URL for Next.js Image optimization
const getR2Hostname = () => {
  const r2Url = process.env.R2_PUBLIC_URL;
  if (r2Url) {
    try {
      return new URL(r2Url).hostname;
    } catch {
      return null;
    }
  }
  return null;
};

const r2Hostname = getR2Hostname();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@joho-erp/api', '@joho-erp/database', '@joho-erp/shared'],
  // Enable standalone output for Docker deployments
  // This creates a minimal production server with all dependencies bundled
  output: 'standalone',
  // Configure remote image patterns for R2 storage
  images: {
    remotePatterns: [
      // Dynamic R2 hostname from environment variable
      ...(r2Hostname ? [{
        protocol: 'https',
        hostname: r2Hostname,
      }] : []),
      // Common Cloudflare R2 patterns as fallback
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@joho-erp/ui', '@joho-erp/shared', 'lucide-react'],
  },
  // Webpack configuration for react-pdf compatibility
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
