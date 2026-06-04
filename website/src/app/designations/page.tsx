import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { ScrollProgress } from '@/components/shared/ScrollProgress'
import { DesignationNodeCard } from '@/components/designations/DesignationNodeCard'
import { getSession } from '@/lib/session'
import { tiers, removalDesignations } from '@/data/designations'

export const metadata = {
  title: 'Designations — AoV',
}

export default async function DesignationsPage() {
  const session = await getSession()
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <ScrollProgress />
      <TopBar characterName={session?.characterName} />
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="△" title="DESIGNATIONS" subtitle="AUREX does not promote. AUREX recognizes." />

        <div className="flex flex-col gap-8">
          {tiers.map(tier => (
            <section key={tier.tier}>
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

              <p className="font-mono text-xs text-white/30 tracking-wide leading-relaxed mb-5">
                {tier.description}
              </p>

              {tier.children.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-4 border-l border-void-teal/10 pl-5">
                  {tier.children.map(node => (
                    <DesignationNodeCard key={node.name} node={node} />
                  ))}
                </div>
              )}
            </section>
          ))}

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
                  className="group relative border border-dashed border-white/10 p-4 transition-colors duration-300 hover:border-[#ff003c]/40 hover:bg-[#ff003c]/[0.03]"
                >
                  {/* Severance marker — a danger tick that surfaces on hover */}
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-3 font-mono text-xs text-[#ff003c]/0 group-hover:text-[#ff003c]/50 transition-colors duration-300 select-none"
                  >
                    ✕
                  </span>
                  <p className="font-mono text-xs tracking-widest uppercase text-white/30 group-hover:text-[#ff003c]/70 transition-colors duration-300 mb-2">
                    {rd.name}
                  </p>
                  <p className="font-mono text-xs text-white/20 group-hover:text-white/35 leading-relaxed tracking-wide transition-colors duration-300">
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
