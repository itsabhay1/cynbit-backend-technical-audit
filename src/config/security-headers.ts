/**
 * Production Security Headers Configuration
 * Enforces OWASP Secure Headers Project standards.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export function getSecurityHeaders(nonce?: string): SecurityHeader[] {
  // Define strict Content-Security-Policy with nonce support
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' https://www.googletagmanager.com https://sdk.cashfree.com ${
      nonce ? `'nonce-${nonce}'` : ''
    }`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.google-analytics.com https://api.cashfree.com https://sandbox.cashfree.com",
    "frame-src 'self' https://sdk.cashfree.com",
    "frame-ancestors 'none'", // Mitigates Clickjacking (SEC-01)
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];

  return [
    {
      key: 'Content-Security-Policy',
      value: cspDirectives.join('; ').replace(/\s{2,}/g, ' ').trim()
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY' // Mitigates Clickjacking (SEC-01)
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff' // Mitigates MIME-sniffing (SEC-03)
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://sdk.cashfree.com")'
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    }
  ];
}
