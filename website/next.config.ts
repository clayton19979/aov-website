import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // SAMEORIGIN (not DENY) so the site can frame its own tool pages
  // (/tools/map, /tools/baseops) while still blocking external framers.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Framer Motion and inline styles need unsafe-inline; tighten once nonce support is added
      "style-src 'self' 'unsafe-inline'",
      // Theme init script in layout.tsx requires unsafe-inline; migrate to nonce to remove this
      "script-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      // EVE Frontier World API (star map, overlays) + Sui RPC/GraphQL + MVR
      // (mystenlabs) + Slush wallet (BaseOps wallet connect). Update if endpoints change.
      "connect-src 'self' https://*.evefrontier.com https://*.mystenlabs.com https://*.sui.io wss://*.sui.io https://*.slush.app wss://*.slush.app",
      // Slush web wallet may open in a frame for connect/sign flows
      "frame-src 'self' https://*.slush.app",
      // Modern equivalent of X-Frame-Options: only same-origin pages may frame
      // us (lets the tool pages embed /tools/map + /tools/baseops, blocks others).
      "frame-ancestors 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
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
