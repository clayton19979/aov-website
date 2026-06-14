import type { Metadata, MetadataRoute } from 'next'
import { tools } from '@/data/tools'

type RoutePath = '/' | `/${string}`
type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

type SiteRoute = {
  path: RoutePath
  title: string
  description: string
  index: boolean
  changeFrequency?: ChangeFrequency
  priority?: number
}

const DEFAULT_SITE_URL = 'https://aov-website.vercel.app'
const LAST_CONTENT_UPDATE = '2026-06-14'

function normalizeSiteUrl(url: string) {
  const withProtocol = /^https?:\/\//.test(url) ? url : `https://${url}`
  return withProtocol.replace(/\/+$/, '')
}

function siteHost(url: string) {
  return new URL(url).host
}

export const siteConfig = {
  name: 'Architects of the Void',
  shortName: 'AoV',
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL),
  host: siteHost(normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL)),
  description:
    'A militant techno-religious EVE Frontier corporation shaped by AUREX, doctrine, and useful output.',
  lastContentUpdate: LAST_CONTENT_UPDATE,
}

export const siteRoutes = [
  {
    path: '/',
    title: siteConfig.name,
    description: siteConfig.description,
    index: true,
    changeFrequency: 'monthly',
    priority: 1,
  },
  {
    path: '/login',
    title: 'Access - Architects of the Void',
    description: 'Wallet-authenticated threshold for recognized Architects of the Void members.',
    index: false,
  },
  {
    path: '/hub',
    title: 'Command Hub - AoV',
    description: 'Member command surface for AoV tools, doctrine, designations, and operations.',
    index: false,
  },
  {
    path: '/tools',
    title: 'Tools - AoV',
    description: 'Operational toolkit for logistics, intelligence, trade, and command systems.',
    index: false,
  },
  {
    path: '/doctrine',
    title: 'Doctrine - AoV',
    description: 'Canonical AoV beliefs, sacred fragments, and compressed operational phrases.',
    index: false,
  },
  {
    path: '/designations',
    title: 'Designations - AoV',
    description: 'AUREX recognition structure from Initiate to Archon, with domains and functions.',
    index: false,
  },
  {
    path: '/operations',
    title: 'Operations - AoV',
    description: 'Standing AoV operational surfaces for fleet activity, intelligence, and records.',
    index: false,
  },
] satisfies SiteRoute[]

export function absoluteUrl(path: RoutePath = '/') {
  return `${siteConfig.url}${path === '/' ? '' : path}`
}

export function getSiteRoute(path: RoutePath) {
  return siteRoutes.find(route => route.path === path)
}

export function routeMetadata(path: RoutePath): Metadata {
  const route = getSiteRoute(path)
  const title = route?.title ?? siteConfig.name
  const description = route?.description ?? siteConfig.description
  const index = route?.index ?? false

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: siteConfig.name,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: index ? undefined : { index: false, follow: false },
  }
}

export function toolMetadata(slug: string): Metadata {
  const tool = tools.find(item => item.slug === slug)

  if (!tool) {
    return routeMetadata('/tools')
  }

  return {
    ...routeMetadata('/tools'),
    title: `${tool.name} - AoV`,
    description: tool.description,
    alternates: {
      canonical: absoluteUrl(`/tools/${tool.slug}`),
    },
    openGraph: {
      title: `${tool.name} - AoV`,
      description: tool.description,
      url: absoluteUrl(`/tools/${tool.slug}`),
      siteName: siteConfig.name,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tool.name} - AoV`,
      description: tool.description,
    },
    robots: { index: false, follow: false },
  }
}

export function sitemapRoutes(): MetadataRoute.Sitemap {
  const lastModified = new Date(siteConfig.lastContentUpdate)

  return siteRoutes
    .filter(route => route.index)
    .map(route => ({
      url: absoluteUrl(route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))
}

export const robotsDisallow = [
  '/api/',
  '/login',
  '/hub',
  '/tools',
  '/doctrine',
  '/designations',
  '/operations',
] as const
