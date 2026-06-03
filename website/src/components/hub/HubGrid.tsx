import { HubQuadrant } from './HubQuadrant'
import { tools } from '@/data/tools'

export function HubGrid() {
  const liveCount = tools.filter(t => t.status === 'live').length
  const totalCount = tools.length

  const sections = [
    {
      glyph: '⬡',
      title: 'TOOLS',
      description: 'Operational toolkit. Logistics, trade, intelligence, and command systems.',
      meta: `${liveCount} live · ${totalCount - liveCount} incoming`,
      href: '/tools',
    },
    {
      glyph: '◈',
      title: 'DOCTRINE',
      description: 'Core beliefs, sacred texts, and canonical phrases of the order.',
      meta: '4 sections',
      href: '/doctrine',
    },
    {
      glyph: '△',
      title: 'DESIGNATIONS',
      description: 'Tier hierarchy from Initiate to Archon. Full function map.',
      meta: '5 tiers · 10 designations',
      href: '/designations',
    },
    {
      glyph: '⊕',
      title: 'OPERATIONS',
      description: 'Fleet ops, member directory, and intel boards.',
      meta: 'Coming online',
      href: '/operations',
      comingSoon: true,
    },
  ]

  return (
    <div className="flex flex-col flex-1 items-center justify-center py-12">
      <div className="w-full max-w-3xl px-8">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-10">
          <span className="font-mono text-xs tracking-widest text-void-teal/20 uppercase">
            Command Hub
          </span>
          <div className="flex-1 h-px bg-void-teal/10" />
          <span className="font-mono text-xs text-void-teal/15 select-none">◈</span>
        </div>

        {/* Command strips */}
        <div className="border-t border-void-teal/10">
          {sections.map((s, i) => (
            <HubQuadrant key={s.href} {...s} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
