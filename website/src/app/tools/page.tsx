import { TopBar } from '@/components/shared/TopBar'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { BackLink } from '@/components/shared/BackLink'
import { ToolGrid } from '@/components/tools/ToolGrid'
import { tools } from '@/data/tools'
import { getSession } from '@/lib/session'

export const metadata = {
  title: 'Tools — AoV',
}

export default async function ToolsPage() {
  const session = await getSession()
  return (
    <div className="min-h-screen bg-void-black flex flex-col">
      <TopBar characterName={session?.characterName} />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <BackLink href="/hub" label="Hub" />
        </div>
        <SectionTitle glyph="⬡" title="TOOLS — THE FORGE" subtitle={`${tools.length} systems`} />
        <ToolGrid tools={tools} />
      </main>
    </div>
  )
}
