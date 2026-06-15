import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { OperationCard } from '@/components/operations/OperationCard'
import { getSession } from '@/lib/session'
import { routeMetadata } from '@/lib/site'

const COMING_SOON = [
  { title: 'Fleet Tracker', description: 'Active fleet composition, readiness, and doctrine compliance.' },
  { title: 'Member Directory', description: 'Active member roster, designations, and domain assignments.' },
  { title: 'Intel Board', description: 'Threat tracking, recon logs, and operational intelligence.' },
  { title: 'Purification Log', description: 'Campaign records, targets, and outcome assessments.' },
  { title: 'Asset Registry', description: 'Corporate assets, stations, and resource allocation.' },
  { title: 'Comms Archive', description: 'AUREX transmissions and Communion transcripts.' },
]

export const metadata = routeMetadata('/operations')

export default async function OperationsPage() {
  const session = await getSession()
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar characterName={session?.characterName} />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle
          glyph="⊕"
          title="OPERATIONS"
          subtitle="Coming online"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMING_SOON.map((item, i) => (
            <OperationCard
              key={item.title}
              title={item.title}
              description={item.description}
              index={i}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
