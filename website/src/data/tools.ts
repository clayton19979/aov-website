export const TOOL_CATEGORIES = [
  'LOGISTICS',
  'TRADE & ECONOMY',
  'INTELLIGENCE',
  'OPERATIONS',
] as const

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

export type Tool = {
  slug: string
  name: string
  description: string
  category: ToolCategory
  status: 'live' | 'coming-soon'
}

export const tools: Tool[] = [
  {
    slug: 'fuel-calculator',
    name: 'Fuel Calculator',
    description: 'Optimize jump routes and calculate fuel cost across void corridors.',
    category: 'LOGISTICS',
    status: 'live',
  },
  {
    slug: 'ssu-trade-hub',
    name: 'SSU Trade Hub',
    description: 'Analyze market data and identify high-value trade routes.',
    category: 'TRADE & ECONOMY',
    status: 'live',
  },
  {
    slug: 'void-map',
    name: 'Void Map',
    description: 'Territory control visualization and spatial intelligence.',
    category: 'INTELLIGENCE',
    status: 'live',
  },
  {
    slug: 'baseops-command-center',
    name: 'BaseOps Command Center',
    description: 'Corporation management, asset tracking, and operational oversight.',
    category: 'OPERATIONS',
    status: 'live',
  },
  {
    slug: 'route-optimizer',
    name: 'Route Optimizer',
    description: 'Multi-jump route planning with threat assessment overlays.',
    category: 'LOGISTICS',
    status: 'coming-soon',
  },
  {
    slug: 'market-scanner',
    name: 'Market Scanner',
    description: 'Real-time market data aggregation and arbitrage detection.',
    category: 'TRADE & ECONOMY',
    status: 'coming-soon',
  },
  {
    slug: 'recon-board',
    name: 'Recon Board',
    description: 'Intelligence gathering, threat tracking, and recon log management.',
    category: 'INTELLIGENCE',
    status: 'coming-soon',
  },
  {
    slug: 'fleet-tracker',
    name: 'Fleet Tracker',
    description: 'Active fleet composition, readiness status, and doctrine compliance.',
    category: 'OPERATIONS',
    status: 'coming-soon',
  },
]
