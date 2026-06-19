import { headers } from 'next/headers'
import { LandingPageClient } from '@/components/landing/LandingPageClient'
import { recognitionBrief } from '@/data/recognition'
import { getLandingDoctrineJsonLd, landingMetadata, publicDoctrineAxioms } from '@/lib/landing-doctrine'

export const metadata = landingMetadata

export default async function LandingPage() {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const jsonLd = getLandingDoctrineJsonLd()

  return (
    <>
      {/* JSON-LD structured data. The nonce is required because the CSP
          (set by proxy) uses a per-request nonce for script-src.
          type="application/ld+json" scripts are non-executable, but some
          browsers still enforce the nonce check on them. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <LandingPageClient publicAxioms={publicDoctrineAxioms} recognition={recognitionBrief} />
    </>
  )
}
