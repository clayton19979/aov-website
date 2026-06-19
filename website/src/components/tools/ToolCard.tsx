'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Tool } from '@/data/tools'

type Props = {
  tool: Tool
}

export function ToolCard({ tool }: Props) {
  const isLive = tool.status === 'live'
  const [hovered, setHovered] = useState(false)

  const inner = (
    <div
      onMouseEnter={() => { if (isLive) setHovered(true) }}
      onMouseLeave={() => setHovered(false)}
      className={`
        group relative flex flex-col justify-between p-6 h-full min-h-[140px] overflow-hidden
        border transition-colors duration-200
        ${isLive
          ? 'border-void-teal/20 bg-void-teal/5 hover:bg-void-teal/10 hover:border-void-teal/40'
          : 'border-dashed border-void-teal/10 bg-transparent opacity-50 cursor-not-allowed'
        }
      `}
    >
      {/* Vertical scan line sweep on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="scan"
            className="absolute left-0 right-0 h-px bg-white/25 pointer-events-none z-10"
            initial={{ top: '-1px' }}
            animate={{ top: '100%' }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.45, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>

      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-void-teal opacity-0 group-hover:opacity-40 transition-opacity duration-300" />

      {/* HUD corner brackets — converge inward on hover (live cards only) */}
      {isLive && (
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          <span
            className={`absolute h-2.5 w-2.5 border-t border-l border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 top-2 left-2' : 'opacity-0 top-1 left-1'}`}
          />
          <span
            className={`absolute h-2.5 w-2.5 border-t border-r border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 top-2 right-2' : 'opacity-0 top-1 right-1'}`}
          />
          <span
            className={`absolute h-2.5 w-2.5 border-b border-l border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 bottom-2 left-2' : 'opacity-0 bottom-1 left-1'}`}
          />
          <span
            className={`absolute h-2.5 w-2.5 border-b border-r border-void-teal transition-all duration-300 ${hovered ? 'opacity-70 bottom-2 right-2' : 'opacity-0 bottom-1 right-1'}`}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-sm tracking-widest uppercase text-void-teal">
          {tool.name}
        </h3>
        <p className="font-mono text-xs tracking-wide text-white/30 leading-relaxed">
          {tool.description}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-void-teal/40 uppercase">
          {tool.category}
        </span>
        {isLive && (
          <span className="font-mono text-xs text-void-teal/40 group-hover:text-void-teal transition-colors">
            → OPEN
          </span>
        )}
        {!isLive && (
          <span className="font-mono text-xs text-white/15 uppercase tracking-widest">
            Soon
          </span>
        )}
      </div>
    </div>
  )

  if (!isLive) return inner

  return (
    <Link
      href={`/tools/${tool.slug}`}
      aria-label={tool.name}
      className="block focus:outline-none focus:ring-1 focus:ring-void-teal/40"
    >
      {inner}
    </Link>
  )
}
