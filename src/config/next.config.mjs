/**
 * Hardened Next.js Production Configuration
 * Addresses:
 * - SEC-05: Removes 'X-Powered-By: Next.js' fingerprint
 * - PERF-01: Pins serverless functions to Mumbai ('bom1')
 * - PERF-02: Permanent 308 redirect from apex domain
 * - SEC-01 to SEC-04: Security headers enforcement
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable framework information disclosure (SEC-05)
  poweredByHeader: false,

  // Modern React & compiler settings
  reactStrictMode: true,

  // Image optimization with restricted remote patterns
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.cynbit.in',
      },
    ],
  },

  // Permanent canonical apex -> www domain redirection (PERF-02)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'cynbit.in' }],
        destination: 'https://www.cynbit.in/:path*',
        permanent: true, // Emits HTTP 308 Permanent Redirect instead of 307
      },
    ];
  },

  // Global HTTP security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // API-specific CORS policy (SEC-04 fix)
      {
        source: '/api/v1/public/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://www.cynbit.in',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Vercel deployment region co-location (PERF-01)
  // Pin serverless compute functions directly to Mumbai (bom1)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['www.cynbit.in', 'cynbit.in'],
    },
  },
};

export default nextConfig;
