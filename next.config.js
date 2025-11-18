/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['googleapis'],
  },
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

