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
            className={`relative pb-1 font-mono text-xs tracking-widest uppercase transition-colors duration-200 ${
              active
                ? 'text-void-teal'
                : 'text-white/20 hover:text-void-teal/60'
            }`}
          >
            {link.label}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 right-0 h-px origin-left transition-[transform,opacity] duration-300"
              style={{
                background: 'var(--accent)',
                opacity: active ? 0.65 : 0,
                transform: active ? 'scaleX(1)' : 'scaleX(0)',
              }}
            />
          </Link>
        )
      })}
    </nav>
  )
}
