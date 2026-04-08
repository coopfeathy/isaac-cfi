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
  // SEO and Performance Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=()'
          },
        ],
      },
      // Enable compression
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      // Cache static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
    ]
  },
  // Redirects for old URLs if needed
  async redirects() {
    return [
      // /manage retirement — Phase 2 (ADMIN-01, D-04 through D-08)
      { source: '/manage/users', destination: '/admin/students', permanent: true },
      { source: '/manage/users/:path*', destination: '/admin/students', permanent: true },
      { source: '/manage/aircraft', destination: '/admin/aircraft', permanent: true },
      { source: '/manage/aircraft/:path*', destination: '/admin/aircraft', permanent: true },
      { source: '/manage/schedule', destination: '/admin', permanent: true },
      { source: '/manage/schedule/:path*', destination: '/admin', permanent: true },
      { source: '/manage/instructors', destination: '/admin', permanent: true },
      { source: '/manage/instructors/:path*', destination: '/admin', permanent: true },
      { source: '/manage/administrators', destination: '/admin', permanent: true },
      { source: '/manage/administrators/:path*', destination: '/admin', permanent: true },
      { source: '/manage/adjustments', destination: '/admin', permanent: true },
      { source: '/manage/adjustments/:path*', destination: '/admin', permanent: true },
      { source: '/manage/forms', destination: '/admin', permanent: true },
      { source: '/manage/forms/:path*', destination: '/admin', permanent: true },
      { source: '/manage/groups', destination: '/admin', permanent: true },
      { source: '/manage/groups/:path*', destination: '/admin', permanent: true },
      { source: '/manage/items', destination: '/admin', permanent: true },
      { source: '/manage/items/:path*', destination: '/admin', permanent: true },
      // Catch-all for any other /manage paths
      { source: '/manage', destination: '/admin', permanent: true },
      { source: '/manage/:path*', destination: '/admin', permanent: true },
    ]
  },
  // Image optimization
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig

