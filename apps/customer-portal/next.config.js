const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jimmy-beef/api', '@jimmy-beef/database', '@jimmy-beef/shared'],
};

module.exports = withNextIntl(nextConfig);
