import { describe, expect, it } from 'vitest'
import {
  absoluteUrl,
  robotsDisallow,
  routeMetadata,
  siteConfig,
  siteRoutes,
  sitemapRoutes,
  toolMetadata,
} from './site'

describe('site metadata', () => {
  it('keeps route paths unique', () => {
    const paths = siteRoutes.map(route => route.path)

    expect(new Set(paths).size).toBe(paths.length)
  })

  it('indexes only the public landing route in the sitemap', () => {
    expect(sitemapRoutes()).toEqual([
      {
        url: siteConfig.url,
        lastModified: new Date(siteConfig.lastContentUpdate),
        changeFrequency: 'monthly',
        priority: 1,
      },
    ])
  })

  it('marks protected routes as noindex', () => {
    expect(routeMetadata('/doctrine')).toMatchObject({
      robots: { index: false, follow: false },
      description: 'Canonical AoV beliefs, sacred fragments, and compressed operational phrases.',
    })
  })

  it('uses tool descriptions for protected tool detail metadata', () => {
    expect(toolMetadata('void-map')).toMatchObject({
      title: 'Void Map - AoV',
      description:
        'Live star chart with jump-route planning, smart gate network, and fuel optimization across EVE Frontier space.',
      alternates: {
        canonical: absoluteUrl('/tools/void-map'),
      },
      robots: { index: false, follow: false },
    })
  })

  it('disallows member and API surfaces in robots', () => {
    expect(siteConfig.host).toBe('aov-website.vercel.app')
    expect(robotsDisallow).toEqual(
      expect.arrayContaining(['/api/', '/hub', '/tools', '/doctrine', '/designations', '/operations'])
    )
  })
})
