import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const INTERNAL_PREFIXES = ['/hub', '/tools', '/doctrine', '/designations', '/operations']
const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'aov-dev-secret-change-in-production'
)

// EVE Vault login is temporarily disabled — every page is public for now.
// Flip this back to `true` to restore the wallet-gated experience (the
// landing/login redirects and the internal-prefix gate below resume).
const AUTH_ENABLED: boolean = false

function withSecurityHeaders(request: NextRequest, response?: NextResponse) {
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

  const securedResponse = response ?? NextResponse.next({
    request: { headers: requestHeaders },
  })

  securedResponse.headers.set('Content-Security-Policy', csp)

  return securedResponse
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static tool assets (public/ directory) without auth, while still
  // attaching the nonce-based Content-Security-Policy to those responses.
  if (pathname.startsWith('/tools/map/') || pathname.startsWith('/tools/baseops/')) {
    return withSecurityHeaders(request)
  }

  // Login disabled: let all routes through so every page is viewable.
  if (!AUTH_ENABLED) return withSecurityHeaders(request)

  // Redirect authenticated users away from the landing page and /login to avoid re-auth friction
  if (pathname === '/' || pathname === '/login') {
    const token = request.cookies.get('aov-session')?.value
    if (token) {
      try {
        await jwtVerify(token, AUTH_SECRET)
        const next = request.nextUrl.searchParams.get('next')
        const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/hub'
        return withSecurityHeaders(request, NextResponse.redirect(new URL(dest, request.url)))
      } catch {
        // Expired/invalid token — let them proceed to the login page
      }
    }
    return withSecurityHeaders(request)
  }

  const isInternal = INTERNAL_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (!isInternal) return withSecurityHeaders(request)

  const sessionToken = request.cookies.get('aov-session')?.value

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)

  if (!sessionToken) {
    return withSecurityHeaders(request, NextResponse.redirect(loginUrl))
  }

  try {
    await jwtVerify(sessionToken, AUTH_SECRET)
    return withSecurityHeaders(request)
  } catch {
    // Token invalid or expired
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('aov-session')
    return withSecurityHeaders(request, response)
  }
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
