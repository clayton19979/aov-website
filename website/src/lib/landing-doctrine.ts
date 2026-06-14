import type { Metadata } from 'next'
import { doctrine } from '@/data/doctrine'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aov.gg'

export const publicDoctrineAxioms = doctrine.coreBeliefs.axioms.slice(0, 3)

export const landingMetadata: Metadata = {
  title: 'Architects of the Void',
  description:
    'A militant techno-religious order operating at the edge of civilization. Public doctrine preview and entry point for Architects of the Void.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Architects of the Void',
    description:
      'A militant techno-religious order operating at the edge of civilization. We do not recruit. We recognize.',
    type: 'website',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Architects of the Void',
    description:
      'A militant techno-religious order operating at the edge of civilization. We do not recruit. We recognize.',
  },
}

export function getLandingDoctrineJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Architects of the Void',
    url: siteUrl,
    description:
      'A militant techno-religious order operating at the edge of civilization. Public doctrine preview only.',
    slogan: 'We were not chosen. We survived.',
    knowsAbout: publicDoctrineAxioms,
    hasPart: {
      '@type': 'CreativeWork',
      name: 'Public Doctrine Preview',
      abstract:
        'A lightweight public summary of the order doctrine intended for the landing route without exposing member-only material.',
      text: publicDoctrineAxioms.join(' '),
    },
  }
}
