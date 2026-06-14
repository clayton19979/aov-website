import type { MetadataRoute } from 'next'
import { absoluteUrl, robotsDisallow, siteConfig } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...robotsDisallow],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteConfig.host,
  }
}
