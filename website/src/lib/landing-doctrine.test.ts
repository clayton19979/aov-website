import { describe, expect, it } from 'vitest'
import { absoluteUrl, siteConfig } from './site'
import {
  getLandingDoctrineJsonLd,
  landingMetadata,
  publicDoctrineAxioms,
} from './landing-doctrine'
import { doctrine } from '@/data/doctrine'

describe('landing doctrine', () => {
  it('previews only the first three axioms publicly', () => {
    expect(publicDoctrineAxioms).toEqual(doctrine.coreBeliefs.axioms.slice(0, 3))
  })

  it('anchors the landing OpenGraph URL to the canonical site host', () => {
    expect(landingMetadata.openGraph?.url).toBe(absoluteUrl('/'))
    expect(landingMetadata.alternates?.canonical).toBe('/')
  })

  it('anchors the JSON-LD organization URL to the canonical site host', () => {
    const jsonLd = getLandingDoctrineJsonLd()

    expect(jsonLd.url).toBe(absoluteUrl('/'))
    expect(jsonLd.url).toBe(siteConfig.url)
    expect(jsonLd.knowsAbout).toEqual(publicDoctrineAxioms)
  })
})
