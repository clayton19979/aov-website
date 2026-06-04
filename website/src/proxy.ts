import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const INTERNAL_PREFIXES = ['/hub', '/tools', '/doctrine', '/designations', '/operations']
const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'aov-dev-secret-change-in-production'
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static tool assets (public/ directory) without auth
  if (pathname.startsWith('/tools/map/') || pathname.startsWith('/tools/baseops/')) return NextResponse.next()

  // Redirect authenticated users away from the landing page and /login to avoid re-auth friction
  if (pathname === '/' || pathname === '/login') {
    const token = request.cookies.get('aov-session')?.value
    if (token) {
      try {
        await jwtVerify(token, AUTH_SECRET)
        const next = request.nextUrl.searchParams.get('next')
        const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/hub'
        return NextResponse.redirect(new URL(dest, request.url))
      } catch {
        // Expired/invalid token — let them proceed to the login page
      }
    }
    return NextResponse.next()
  }

  const isInternal = INTERNAL_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (!isInternal) return NextResponse.next()

  const sessionToken = request.cookies.get('aov-session')?.value

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)

  if (!sessionToken) {
    return NextResponse.redirect(loginUrl)
  }

  try {
    await jwtVerify(sessionToken, AUTH_SECRET)
    return NextResponse.next()
  } catch {
    // Token invalid or expired
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('aov-session')
    return response
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
