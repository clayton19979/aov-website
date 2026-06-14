import type { MetadataRoute } from 'next'
import { sitemapRoutes } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes()
}
