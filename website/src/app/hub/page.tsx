import { TopBar } from '@/components/shared/TopBar'
import { HubGrid } from '@/components/hub/HubGrid'

export const metadata = {
  title: 'Command Hub — AoV',
}

export default function HubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-void-black">
      <TopBar />
      <HubGrid />
    </div>
  )
}
