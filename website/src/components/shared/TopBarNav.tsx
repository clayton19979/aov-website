'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '@/lib/nav'

export function TopBarNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden sm:flex items-center gap-6">
      {NAV_LINKS.map(link => {
        const active = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`font-mono text-xs tracking-widest uppercase transition-colors duration-200 ${
              active
                ? 'text-void-teal'
                : 'text-white/20 hover:text-void-teal/60'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
