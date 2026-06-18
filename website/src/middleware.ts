import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Generates a per-request CSP nonce and injects it into the response.
 *
 * Why: The static next.config.ts headers had to use `script-src 'unsafe-inline'`
 * to cover the theme-init script in layout.tsx. That meant any XSS injection
 * that reached a `<script>` tag would execute. A per-request nonce lets us
 * replace `'unsafe-inline'` with a one-time cryptographic token — only scripts
 * carrying that nonce are allowed to run.
 *
 * How it flows:
 *   1. This middleware generates a nonce, stores it in the `x-nonce` request
 *      header, and sets the nonce-based CSP on the response.
 *   2. layout.tsx reads `x-nonce` via Next.js `headers()` and stamps the theme
 *      init `<script>` with it.
 *   3. page.tsx (landing) does the same for the JSON-LD `<script>`.
 *
 * CSP notes:
 *   - `style-src 'unsafe-inline'` is kept because Framer Motion applies inline
 *     styles dynamically at runtime; inline-style injection is far less dangerous
 *     than inline-script injection.
 *   - `'strict-dynamic'` is intentionally omitted for now — none of our trusted
 *     scripts create additional `<script>` elements at runtime.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    "default-src 'self'",
    // Framer Motion uses inline styles; keep unsafe-inline for style-src for now.
    "style-src 'self' 'unsafe-inline'",
    // Nonce replaces unsafe-inline for scripts. Only the stamped inline scripts
    // (theme init, JSON-LD) and same-origin .js files are permitted.
    `script-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    // EVE Frontier World API + Sui RPC/GraphQL + MVR (mystenlabs) + Slush wallet.
    "connect-src 'self' https://*.evefrontier.com https://*.mystenlabs.com https://*.sui.io wss://*.sui.io https://*.slush.app wss://*.slush.app",
    // Slush web wallet may open in a frame for connect/sign flows.
    "frame-src 'self' https://*.slush.app",
    // Only same-origin pages may frame us.
    "frame-ancestors 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')

  // Forward nonce to Server Components via request header.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set nonce-based CSP on the response. The static CSP in next.config.ts has
  // been removed so there is no header conflict.
  response.headers.set('Content-Security-Policy', csp)

  return response
}

/**
 * Run on all requests except Next.js internals, static assets, and images.
 * The `missing` conditions prevent the middleware from running on prefetch
 * requests that don't need nonce generation.
 */
export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
