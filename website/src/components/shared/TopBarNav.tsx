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
            aria-current={active ? 'page' : undefined}
            className={`group relative pb-1 font-mono text-xs tracking-widest uppercase transition-colors duration-200 ${
              active
                ? 'text-void-teal'
                : 'text-white/20 hover:text-void-teal/60'
            }`}
          >
            {link.label}
            <span
              aria-hidden="true"
              style={{ background: 'var(--accent)' }}
              className={`absolute bottom-0 left-0 right-0 h-px origin-left transition-[transform,opacity] duration-300 ${
                active
                  ? 'scale-x-100 opacity-[0.65]'
                  : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-[0.4]'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}
