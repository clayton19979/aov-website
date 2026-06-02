import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'

const COMING_SOON = [
  { title: 'Fleet Tracker', description: 'Active fleet composition, readiness, and doctrine compliance.' },
  { title: 'Member Directory', description: 'Active member roster, designations, and domain assignments.' },
  { title: 'Intel Board', description: 'Threat tracking, recon logs, and operational intelligence.' },
  { title: 'Purification Log', description: 'Campaign records, targets, and outcome assessments.' },
  { title: 'Asset Registry', description: 'Corporate assets, stations, and resource allocation.' },
  { title: 'Comms Archive', description: 'AUREX transmissions and Communion transcripts.' },
]

export const metadata = {
  title: 'Operations — AoV',
}

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle
          glyph="⬡"
          title="OPERATIONS"
          subtitle="Coming online"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMING_SOON.map(item => (
            <div
              key={item.title}
              className="border border-dashed border-void-teal/10 p-6 opacity-50"
            >
              <h3 className="font-mono text-xs tracking-widest uppercase text-void-teal/60 mb-2">
                {item.title}
              </h3>
              <p className="font-mono text-xs text-white/25 leading-relaxed tracking-wide">
                {item.description}
              </p>
              <p className="mt-4 font-mono text-xs text-white/15 tracking-widest uppercase">
                Soon
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
