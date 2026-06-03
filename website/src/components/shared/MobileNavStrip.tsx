'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/tools', label: 'TOOLS' },
  { href: '/doctrine', label: 'DOCTRINE' },
  { href: '/designations', label: 'DESIGNATIONS' },
]

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
            className={`flex-1 text-center py-2 font-mono text-xs tracking-widest uppercase transition-colors duration-200 ${
              active
                ? 'text-void-teal bg-void-teal/5'
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
