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
            // Defense-in-depth: explicitly deny browser features the site
            // doesn't use, so a future supply-chain compromise (third-party
            // script / widget) can't silently access them. `geolocation=(self)`
            // is allowed so first-party code can use it (e.g. nearest-airport
            // helpers); everything else is fully denied.
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'ambient-light-sensor=()',
              'autoplay=(self)',
              'battery=()',
              'browsing-topics=()',
              'camera=()',
              'cross-origin-isolated=()',
              'display-capture=()',
              'document-domain=()',
              'encrypted-media=()',
              'execution-while-not-rendered=()',
              'execution-while-out-of-viewport=()',
              'fullscreen=(self)',
              'geolocation=(self)',
              'gyroscope=()',
              'hid=()',
              'idle-detection=()',
              'interest-cohort=()',
              'keyboard-map=()',
              'magnetometer=()',
              'microphone=()',
              'midi=()',
              'navigation-override=()',
              'payment=()',
              'picture-in-picture=()',
              'publickey-credentials-get=()',
              'screen-wake-lock=()',
              'serial=()',
              'sync-xhr=()',
              'usb=()',
              'web-share=(self)',
              'xr-spatial-tracking=()'
            ].join(', ')
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
      // Add any URL redirects here for SEO preservation
    ]
  },
  // Image optimization
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig

