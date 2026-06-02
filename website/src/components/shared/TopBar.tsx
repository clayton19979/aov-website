import Link from 'next/link'

type Props = {
  memberStatus?: string
}

export function TopBar({ memberStatus = 'MEMBER' }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-void-teal/10 bg-void-black/80 backdrop-blur-sm">
      <Link
        href="/hub"
        className="font-mono text-sm tracking-widest text-void-teal hover:text-void-teal/80 transition-colors"
      >
        ◈ AoV
      </Link>
      <span className="font-mono text-xs tracking-widest text-white/20 uppercase">
        {memberStatus} · ONLINE
      </span>
    </header>
  )
}
