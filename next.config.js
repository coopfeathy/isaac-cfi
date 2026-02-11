/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['googleapis'],
  // Empty turbopack config to silence warning - app works fine with default Turbopack
  turbopack: {},
  webpack: (config) => {
    // Ignore optional dependencies that cause warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      'supports-color': false,
    };
    return config;
  },
}

module.exports = nextConfig

