import Link from 'next/link'
import { LogoutButton } from './LogoutButton'
import { ThemeToggle } from './ThemeToggle'
import { TopBarNav } from './TopBarNav'
import { MobileNavStrip } from './MobileNavStrip'

type Props = {
  characterName?: string
}

export function TopBar({ characterName }: Props) {
  const displayName = characterName ?? 'MEMBER'

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-void-teal/10 bg-void-black/80 backdrop-blur-sm">
      <Link
        href="/hub"
        className="font-mono text-sm tracking-widest text-void-teal hover:text-void-teal/80 transition-colors"
      >
        ◈ AoV
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <span className="font-mono text-xs tracking-widest text-white/20 uppercase">
          {displayName} · ONLINE
        </span>
        <LogoutButton />
    <header className="border-b border-void-teal/10 bg-void-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <Link
          href="/hub"
          className="font-mono text-sm tracking-widest text-void-teal hover:text-void-teal/80 transition-colors"
        >
          ◈ AoV
        </Link>
        <TopBarNav />
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tracking-widest text-white/20 uppercase">
            {displayName} · ONLINE
          </span>
          <LogoutButton />
        </div>
      </div>
      <MobileNavStrip />
    </header>
  )
}
