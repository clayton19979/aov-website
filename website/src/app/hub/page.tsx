import { TopBar } from '@/components/shared/TopBar'
import { HubGrid } from '@/components/hub/HubGrid'
import { getSession } from '@/lib/session'

export const metadata = {
  title: 'Command Hub — AoV',
}

export default async function HubPage() {
  const session = await getSession()
  return (
    <div className="flex flex-col min-h-screen bg-void-black">
      <TopBar characterName={session?.characterName} />
      <HubGrid />
    </div>
  )
}
