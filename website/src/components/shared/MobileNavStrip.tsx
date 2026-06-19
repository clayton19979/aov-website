'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '@/lib/nav'

export function MobileNavStrip() {
  const pathname = usePathname()

  return (
    <nav className="sm:hidden flex border-t border-void-teal/10">
      {NAV_LINKS.map(link => {
        const active = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            style={active ? {
              boxShadow: 'inset 0 2px 0 color-mix(in srgb, var(--accent) 65%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--accent) 7%, transparent)',
              color: 'var(--accent)',
            } : undefined}
            className={`flex-1 text-center py-2 font-mono text-xs tracking-widest uppercase transition-colors duration-200 ${
              active
                ? ''
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
