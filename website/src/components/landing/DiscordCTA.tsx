'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DISCORD_URL = 'https://discord.gg/uZtwGbngr7'

export function DiscordCTA() {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        boxShadow: hovered
          ? '0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent), 0 0 28px color-mix(in srgb, var(--accent) 22%, transparent), 0 0 60px color-mix(in srgb, var(--accent) 8%, transparent)'
          : '0 0 14px color-mix(in srgb, var(--accent) 10%, transparent)',
        transition: 'box-shadow 350ms ease',
      }}
      className="
        group relative inline-flex items-center gap-3 overflow-hidden
        border border-void-teal/50 hover:border-void-teal
        px-8 py-3
        font-mono text-xs tracking-widest uppercase
        text-void-teal hover:text-void-black
        bg-transparent hover:bg-void-teal
        transition-all duration-300
      "
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="scan"
            className="absolute left-0 right-0 h-px bg-white/40 pointer-events-none"
            initial={{ top: '-1px' }}
            animate={{ top: '100%' }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.35, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>
      <span>Request Entry</span>
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">↗ Discord</span>
    </a>
  )
}
