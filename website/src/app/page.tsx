import { LandingPageClient } from '@/components/landing/LandingPageClient'
import { getLandingDoctrineJsonLd, landingMetadata, publicDoctrineAxioms } from '@/lib/landing-doctrine'

export const metadata = landingMetadata

export default function LandingPage() {
  const jsonLd = getLandingDoctrineJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <LandingPageClient publicAxioms={publicDoctrineAxioms} />
    </>
  )
}
