'use client'

import { motion } from 'framer-motion'

type Props = {
  glyph?: string
  title: string
  subtitle?: string
}

export function SectionTitle({ glyph = '⬡', title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <motion.h1
        className="font-mono text-sm tracking-widest uppercase text-void-teal"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {glyph} {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="mt-1 font-mono text-xs tracking-wider text-white/30 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          {subtitle}
        </motion.p>
      )}
      <div className="mt-3 relative h-px w-full overflow-hidden">
        {/* Gradient line draws in left→right on mount */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-void-teal/60 via-void-teal/20 to-transparent"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        />
        {/* Bright scan spot — one-shot sweep across the line */}
        <motion.div
          className="absolute top-0 bottom-0 w-14 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 90%, transparent) 50%, transparent)',
          }}
          initial={{ left: '-14%' }}
          animate={{ left: '110%' }}
          transition={{ duration: 0.65, delay: 0.2, ease: 'easeIn' }}
        />
      </div>
    </div>
  )
}
