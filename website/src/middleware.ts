import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const INTERNAL_PREFIXES = ['/hub', '/tools', '/doctrine', '/designations', '/operations']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isInternal = INTERNAL_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (isInternal) {
    // TODO: replace with wallet auth check
    // const token = request.cookies.get('aov-auth')
    // if (!token) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
