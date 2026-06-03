import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { KillEntry } from '@/components/killboard/KillEntry'
import { kills, killStats } from '@/data/killboard'
import { getSession } from '@/lib/session'

export const metadata = {
  title: 'Kill Board — AoV',
}

export default async function KillBoardPage() {
  const session = await getSession()
  const stats = killStats(kills)

  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar characterName={session?.characterName} />
      <main className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>

        <SectionTitle
          glyph="⊗"
          title="KILL BOARD"
          subtitle="Confirmed engagements and purification records"
        />

        {/* Stats strip */}
        <div className="flex flex-wrap gap-8 mb-10 border border-void-teal/10 px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
              Total
            </span>
            <span className="font-mono text-2xl tracking-wide text-void-teal/70">
              {stats.total}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
              Confirmed
            </span>
            <span className="font-mono text-2xl tracking-wide text-void-teal/70">
              {stats.confirmed}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
              Destroyed (STC)
            </span>
            <span className="font-mono text-2xl tracking-wide text-void-teal/70">
              {(stats.totalValue / 1000).toFixed(1)}K
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs tracking-widest text-void-teal/30 uppercase">
              Top Pilot
            </span>
            <span className="font-mono text-sm tracking-wide text-white/40 mt-1">
              {stats.topPilot}
            </span>
          </div>
        </div>

        {/* Kill list */}
        <div>
          {kills.map(kill => (
            <KillEntry key={kill.id} kill={kill} />
          ))}
        </div>
      </main>
    </div>
  )
}
