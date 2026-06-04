'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DISCORD_URL = 'https://discord.gg/uZtwGbngr7'

// HUD corner brackets — each is an L drawn from two borders, anchored at a
// corner. Idle: drifted inward + invisible. Hover: snap out to the corner and
// fade in, "locking on" like a targeting reticle. Anchored at the button's own
// edges so its overflow-hidden clip never crops them. Border longhands (not
// shorthands) keep framer-motion's style manager from warning on every render.
const W = '2px'
const C = 'var(--bg)'
const top = { borderTopWidth: W, borderTopStyle: 'solid', borderTopColor: C } as const
const bottom = { borderBottomWidth: W, borderBottomStyle: 'solid', borderBottomColor: C } as const
const left = { borderLeftWidth: W, borderLeftStyle: 'solid', borderLeftColor: C } as const
const right = { borderRightWidth: W, borderRightStyle: 'solid', borderRightColor: C } as const
const CORNERS = [
  { key: 'tl', pos: { top: 0, left: 0 }, borders: { ...top, ...left }, idle: { x: 5, y: 5 } },
  { key: 'tr', pos: { top: 0, right: 0 }, borders: { ...top, ...right }, idle: { x: -5, y: 5 } },
  { key: 'bl', pos: { bottom: 0, left: 0 }, borders: { ...bottom, ...left }, idle: { x: 5, y: -5 } },
  { key: 'br', pos: { bottom: 0, right: 0 }, borders: { ...bottom, ...right }, idle: { x: -5, y: -5 } },
] as const

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

      {/* Targeting reticle — HUD corner brackets snap to the corners and lock on hover */}
      {CORNERS.map(c => (
        <motion.span
          key={c.key}
          aria-hidden="true"
          className="absolute w-2.5 h-2.5 pointer-events-none z-10"
          style={{ ...c.pos, ...c.borders }}
          initial={false}
          animate={hovered ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: c.idle.x, y: c.idle.y }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}

      <span>Request Entry</span>
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">↗ Discord</span>
    </a>
  )
}
