import type { NextConfig } from "next";

/**
 * Static security headers applied to all routes.
 *
 * Content-Security-Policy is intentionally absent here — it is set
 * dynamically by src/proxy.ts, which injects a per-request nonce into
 * script-src so that `'unsafe-inline'` is no longer required for scripts.
 *
 * Strict-Transport-Security is set here (not in proxy) because it is
 * a static value that benefits from being cached at the edge/CDN level.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // SAMEORIGIN (not DENY) so the site can frame its own tool pages
  // (/tools/map, /tools/baseops) while still blocking external framers.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // clipboard-write=(self) explicitly delegates clipboard access to same-origin
  // contexts, covering the fuel-calculator tool iframe's Copy buttons.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), clipboard-write=(self)' },
  // Enforce HTTPS for 1 year, include subdomains. The site is deployed on
  // Vercel (always HTTPS) so this is safe to enable.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
