import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
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
      // EVE Frontier World API (star map, overlays) + Sui RPC endpoints — update if endpoints change
      "connect-src 'self' https://*.evefrontier.com https://*.mystenlabs.com https://*.sui.io wss://*.sui.io",
      "frame-src 'self'",
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
