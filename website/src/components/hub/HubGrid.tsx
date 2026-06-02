import { HubQuadrant } from './HubQuadrant'
import { tools } from '@/data/tools'

export function HubGrid() {
  const liveCount = tools.filter(t => t.status === 'live').length
  const totalCount = tools.length

  return (
    <div
      className="grid grid-cols-2 grid-rows-2 flex-1"
      style={{ gap: '1px', background: 'rgba(0,180,216,0.08)' }}
    >
      <HubQuadrant
        glyph="⬡"
        title="TOOLS"
        description="Operational toolkit. Logistics, trade, intelligence, and command systems."
        meta={`${liveCount} live · ${totalCount - liveCount} incoming`}
        href="/tools"
      />
      <HubQuadrant
        glyph="⬡"
        title="DOCTRINE"
        description="Core beliefs, sacred texts, and canonical phrases of the order."
        meta="4 sections"
        href="/doctrine"
      />
      <HubQuadrant
        glyph="⬡"
        title="DESIGNATIONS"
        description="Tier hierarchy from Initiate to Archon. Full function map."
        meta="5 tiers · 10 designations"
        href="/designations"
      />
      <HubQuadrant
        glyph="⬡"
        title="OPERATIONS"
        description="Fleet ops, member directory, and intel boards."
        meta="Coming online"
        href="/operations"
      />
    </div>
  )
}
