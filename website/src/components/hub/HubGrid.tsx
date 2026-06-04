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
    <div className="relative flex flex-col flex-1 items-center justify-center py-12">
      {/* Ambient accent glow — mirrors the landing page atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--accent) 3%, transparent) 0%, transparent 55%)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl px-8">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-10">
          <span
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            Command Hub
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
          />
          <span
            className="font-mono text-xs select-none"
            style={{ color: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
          >
            ◈
          </span>
        </div>

        {/* Command strips */}
        <div
          className="border-t"
          style={{ borderTopColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
        >
          {sections.map((s, i) => (
            <HubQuadrant key={s.href} {...s} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
