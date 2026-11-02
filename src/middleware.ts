import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/serve';
import { getSecurityHeaders } from './config/security-headers';

/**
 * Next.js Edge Middleware
 * Executed at Vercel Anycast Edge nodes (e.g., bom1 Mumbai)
 */
export function middleware(request: NextRequest) {
  // 1. Generate unique cryptographic nonce for Content-Security-Policy
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // 2. Clone request headers and inject nonce for Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // 3. Server Action Origin Verification (Mitigates unauthorized invocation / CSRF)
  const isServerAction = request.headers.has('next-action');
  if (isServerAction) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const allowedHosts = ['www.cynbit.in', 'cynbit.in', 'localhost:3000'];

    if (origin) {
      const originHost = new URL(origin).host;
      if (!allowedHosts.includes(originHost)) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden: Invalid Server Action origin' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  // 4. Initialize Next response with updated request headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 5. Inject comprehensive security headers
  const securityHeaders = getSecurityHeaders(nonce);
  for (const { key, value } of securityHeaders) {
    response.headers.set(key, value);
  }

  // 6. Restrict CORS on HTML documents (Fixes SEC-04)
  // Ensure wildcard '*' is never returned on application document routes
  if (response.headers.has('Access-Control-Allow-Origin')) {
    const pathname = request.nextUrl.pathname;
    if (!pathname.startsWith('/api/v1/public/')) {
      response.headers.delete('Access-Control-Allow-Origin');
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
