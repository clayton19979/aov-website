import Link from 'next/link'
import { LogoutButton } from './LogoutButton'
import { TopBarNav } from './TopBarNav'
import { MobileNavStrip } from './MobileNavStrip'
import { ThemeSwitcher } from './ThemeSwitcher'

type Props = {
  characterName?: string
}

export function TopBar({ characterName }: Props) {
  const displayName = characterName ?? 'MEMBER'

  return (
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
          <ThemeSwitcher />
          <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-white/20 uppercase">
            <span>{displayName}</span>
            <span className="text-white/15">·</span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="status-online-dot inline-block h-1.5 w-1.5 rounded-full"
              />
              ONLINE
            </span>
          </span>
          <LogoutButton />
        </div>
      </div>
      <MobileNavStrip />
    </header>
  )
}
