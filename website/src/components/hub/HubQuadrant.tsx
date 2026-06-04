'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'

const NUMERALS = ['I', 'II', 'III', 'IV']

type Props = {
  glyph: string
  title: string
  description: string
  meta?: string
  href: string
  index?: number
  comingSoon?: boolean
}

export function HubQuadrant({ glyph, title, description, meta, href, index = 0, comingSoon = false }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    >
      {comingSoon ? (
        <div
          className="relative flex items-center gap-8 py-8 border-b cursor-default select-none"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
        >
          <span
            className="relative hidden md:block font-mono text-6xl w-14 flex-shrink-0 text-right leading-none"
            style={{ color: 'var(--accent)', opacity: 0.02 }}
            aria-hidden="true"
          >
            {NUMERALS[index]}
          </span>
          <div className="relative flex-1 flex flex-col gap-2 min-w-0">
            <h2
              className="font-mono text-sm tracking-widest uppercase"
              style={{ color: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
            >
              {glyph} {title}
            </h2>
            <p className="font-mono text-xs tracking-wide text-white/10 leading-relaxed uppercase">
              {description}
            </p>
          </div>
          <div className="relative flex items-center gap-5 flex-shrink-0 pr-2">
            {meta && (
              <span className="hidden sm:block font-mono text-xs tracking-widest text-white/10 uppercase">
                {meta}
              </span>
            )}
            <span className="font-mono text-xs text-white/10">—</span>
          </div>
        </div>
      ) : (
        <Link
          href={href}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="group relative flex items-center gap-8 py-8 border-b focus:outline-none focus:ring-inset focus:ring-1"
          style={{
            borderBottomColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            // @ts-expect-error CSS custom property for ring color
            '--tw-ring-color': 'color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
        >
          {/* Left scan bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px opacity-0 group-hover:opacity-50 transition-opacity duration-300"
            style={{ backgroundColor: 'var(--accent)' }}
          />
          {/* Bottom sweep line */}
          <div
            className="absolute bottom-[-1px] left-0 h-px w-0 group-hover:w-full transition-[width] duration-500 ease-out"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}
          />
          {/* Background tint */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500 pointer-events-none"
            style={{ backgroundColor: 'var(--accent)' }}
          />

          <span
            className="relative hidden md:block font-mono text-6xl w-14 flex-shrink-0 select-none text-right leading-none transition-opacity duration-500"
            style={{ color: 'var(--accent)', opacity: hovered ? 0.10 : 0.04 }}
            aria-hidden="true"
          >
            {NUMERALS[index]}
          </span>

          <div className="relative flex-1 flex flex-col gap-2 min-w-0">
            <h2
              className="font-mono text-sm tracking-widest uppercase transition-colors duration-300"
              style={{ color: hovered ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 60%, transparent)' }}
            >
              {glyph} {title}
            </h2>
            <p className="font-mono text-xs tracking-wide text-white/20 leading-relaxed uppercase group-hover:text-white/35 transition-colors duration-300">
              {description}
            </p>
          </div>

          <div className="relative flex items-center gap-5 flex-shrink-0 pr-2">
            {meta && (
              <span className="hidden sm:block font-mono text-xs tracking-widest text-white/10 uppercase group-hover:text-white/25 transition-colors duration-300">
                {meta}
              </span>
            )}
            <span
              className="font-mono text-xs group-hover:translate-x-1 transition-all duration-300 inline-block"
              style={{ color: hovered ? 'color-mix(in srgb, var(--accent) 70%, transparent)' : 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
            >
              →
            </span>
          </div>
        </Link>
      )}
    </motion.div>
  )
}
