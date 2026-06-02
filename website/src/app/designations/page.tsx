'use client'

import { useState } from 'react'
import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { tiers, removalDesignations } from '@/data/designations'
import type { DesignationNode } from '@/data/designations'

function DesignationNodeCard({ node }: { node: DesignationNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left border border-void-teal/10 hover:border-void-teal/30 bg-void-teal/5 p-4 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-void-teal/30"
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-void-teal">
            {node.name}
          </p>
          <p className="font-mono text-xs text-white/30 tracking-wide mt-1 uppercase">
            {node.domain}
          </p>
        </div>
        <span className="font-mono text-xs text-void-teal/40 shrink-0 mt-0.5">
          {expanded ? '−' : '+'}
        </span>
      </div>
      {expanded && (
        <p className="mt-4 font-mono text-xs text-white/40 leading-relaxed tracking-wide border-t border-void-teal/10 pt-4">
          {node.detail}
        </p>
      )}
    </button>
  )
}

export default function DesignationsPage() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="⬡" title="DESIGNATIONS" subtitle="AUREX does not promote. AUREX recognizes." />

        <div className="flex flex-col gap-8">
          {tiers.map(tier => (
            <section key={tier.tier}>
              {/* Tier header */}
              <div className="flex items-baseline gap-6 mb-4 pb-3 border-b border-void-teal/10">
                <span className="font-mono text-xs text-void-teal/30 tracking-widest">
                  TIER {tier.tier}
                </span>
                <h2 className="font-mono text-sm tracking-widest uppercase text-void-teal">
                  {tier.label}
                </h2>
                <span className="font-mono text-xs text-white/20 tracking-wide uppercase">
                  {tier.role}
                </span>
                <span className="ml-auto font-mono text-xs text-white/15 tracking-widest">
                  {tier.count}
                </span>
              </div>

              {/* Tier description */}
              <p className="font-mono text-xs text-white/30 tracking-wide leading-relaxed mb-5">
                {tier.description}
              </p>

              {/* Children nodes */}
              {tier.children.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4 border-l border-void-teal/10 pl-5">
                  {tier.children.map(node => (
                    <DesignationNodeCard key={node.name} node={node} />
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Removal designations */}
          <section>
            <div className="flex items-baseline gap-6 mb-4 pb-3 border-b border-void-teal/10">
              <h2 className="font-mono text-sm tracking-widest uppercase text-white/30">
                Removal Designations
              </h2>
              <span className="font-mono text-xs text-white/15 tracking-wide">
                Archon authority only
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {removalDesignations.map(rd => (
                <div
                  key={rd.name}
                  className="border border-dashed border-white/10 p-4"
                >
                  <p className="font-mono text-xs tracking-widest uppercase text-white/30 mb-2">
                    {rd.name}
                  </p>
                  <p className="font-mono text-xs text-white/20 leading-relaxed tracking-wide">
                    {rd.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
