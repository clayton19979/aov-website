'use client'

import Link from 'next/link'

type Props = {
  memberStatus?: string
}

export function TopBar({ memberStatus = 'MEMBER' }: Props) {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-void-teal/10 bg-void-black/80 backdrop-blur-sm">
      <Link
        href="/hub"
        className="font-mono text-sm tracking-widest text-void-teal hover:text-void-teal/80 transition-colors"
      >
        ◈ AoV
      </Link>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs tracking-widest text-white/20 uppercase">
          {memberStatus} · ONLINE
        </span>
        <button
          onClick={handleLogout}
          className="font-mono text-xs tracking-widest uppercase text-white/15 hover:text-white/40 transition-colors"
        >
          EXIT
        </button>
      </div>
    </header>
  )
}
